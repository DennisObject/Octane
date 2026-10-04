import {
    IMessageComposer,
    CatalogAdminDeleteOfferComposer,
    CatalogAdminDeletePageComposer,
    CatalogAdminOfferDetailsEvent,
    CatalogAdminPageDetailsEvent,
    CatalogAdminMovePageComposer,
    CatalogAdminReorderOffersComposer,
    CatalogAdminResultEvent,
    CatalogAdminResultMessageParser,
    CatalogAdminSetPageVisibleComposer,
    CatalogAdminSmartSaveResult
} from '@octane/renderer';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NotificationAlertType } from '../../api/notification/NotificationAlertType';
import { SendMessageComposer } from '../../api/octane/SendMessageComposer';
import { LocalizeText } from '../../api/utils/LocalizeText';
import { useMessageEvent } from '../events/useMessageEvent';
import { useNotificationActions } from '../notification/useNotification';
import { useCatalogActions, useCatalogUiState } from './useCatalog';
import type {
    CatalogAdminMutationResult,
    CatalogAdminOfferForm,
    CatalogAdminOfferOrder,
    CatalogAdminPageForm,
    CatalogAdminSmartSaveAction
} from './catalogAdmin.types';
import { createOfferWriteComposer, createPageWriteComposer } from './catalogAdminComposers.helpers';
import {
    localizeCatalogAdminCode,
    localizeCatalogAdminFieldErrors,
    localizeCatalogAdminMessage,
    localizeCatalogAdminPlainMessage
} from './catalogAdminServerErrors.helpers';
import { toStudioCatalogType } from './catalogAdminTree.helpers';
import { useCatalogAdminUiStore } from './catalogAdminUiStore';
import type { CatalogStudioSession } from './catalogStudio.types';
import { nextCatalogStudioOperationId } from './catalogStudio.helpers';
import { useCatalogStudio } from './useCatalogStudio';

/** A save or structural change with no answer after this long is reported as lost. */
const RESPONSE_TIMEOUT_MS = 20_000;
/** How many acknowledged saves are kept for the editors to pick theirs up. */
const MAX_KEPT_RESULTS = 16;

type StructuralAction = 'deletePage' | 'movePage' | 'setPageVisible' | 'deleteOffer' | 'reorderOffers';

const PAGE_INDEX_ACTIONS = new Set<StructuralAction>(['deletePage', 'movePage', 'setPageVisible']);
/** Code of a save refused because another edit moved the catalog revision on. */
const STALE_REVISION = 'STALE_REVISION';

const PAGE_CONTENT_ACTIONS = new Set<StructuralAction>(['deleteOffer', 'reorderOffers']);

interface StructuralRequest {
    action: StructuralAction;
    entityType: 'PAGE' | 'OFFER';
    entityId: number;
    /** Built when the request is sent, from the session and revision current at that moment. */
    build: (draftVersionId: number, revision: number, operationId: string) => IMessageComposer<unknown[]>;
}

interface PendingStructuralAction extends StructuralRequest {
    /** Its entry in the studio's request queue. */
    requestId: number;
}

interface PendingSave {
    action: CatalogAdminSmartSaveAction;
    timer: ReturnType<typeof setTimeout>;
}

export interface CatalogAdminMutations {
    sessionReady: boolean;
    /** Any admin request is waiting for the server. */
    loading: boolean;
    /** A structural change (delete, move, show/hide, reorder) is waiting; further ones are refused until it answers. */
    busy: boolean;
    lastError: string | null;
    /** Acknowledged saves by operation id, so every open editor finds its own answer. */
    results: ReadonlyMap<string, CatalogAdminMutationResult>;
    clearError: () => void;
    /** Saves and creates are answered only through the Smart Save acknowledgement with their operation id. */
    savePage: (form: CatalogAdminPageForm, catalogType: string) => string | null;
    saveOffer: (form: CatalogAdminOfferForm, catalogType: string) => string | null;
    /** Structural changes target the open catalog unless an editor passes the catalog it was opened for. */
    deletePage: (pageId: number, name: string, catalogType?: string) => boolean;
    movePage: (pageId: number, parentId: number, index: number, name: string) => boolean;
    setPageVisible: (pageId: number, visible: boolean, name: string) => boolean;
    deleteOffer: (offerId: number, name: string, catalogType?: string) => boolean;
    reorderOffers: (orders: CatalogAdminOfferOrder[], pageName: string) => boolean;
}

const toMutationResult = (parser: CatalogAdminResultMessageParser, result: CatalogAdminSmartSaveResult): CatalogAdminMutationResult => ({
    operationId: result.operationId,
    action: result.action,
    success: parser.success,
    code: result.code,
    message: parser.success ? localizeCatalogAdminMessage(parser.message) : localizeCatalogAdminCode(result.code, parser.message, result.fieldErrors),
    entityType: result.entityType,
    catalogType: result.catalogType,
    entityId: result.entityId,
    entity: result.entity,
    historyGroup: result.historyGroup,
    fieldErrors: localizeCatalogAdminFieldErrors(result.fieldErrors),
    acknowledgedAt: Date.now()
});

const failedResult = (operationId: string, action: CatalogAdminSmartSaveAction, code: string, message: string): CatalogAdminMutationResult => ({
    operationId,
    action,
    success: false,
    code,
    message,
    entityType: action === 'createPage' || action === 'savePage' ? 'PAGE' : 'OFFER',
    catalogType: 'NORMAL',
    entityId: 0,
    entity: null,
    historyGroup: null,
    fieldErrors: {},
    acknowledgedAt: Date.now()
});

/** The page and every page below it in the session's tree, all in one catalog. */
const collectPageSubtree = (session: CatalogStudioSession | null, pageId: number, catalogType: string): number[] => {
    const ids = [pageId];
    const pages = (session?.pages ?? []).filter((page) => page.catalogType === catalogType);

    for (let index = 0; index < ids.length; index++) {
        for (const page of pages) if (page.parentId === ids[index] && !ids.includes(page.pageId)) ids.push(page.pageId);
    }

    return ids;
};

/**
 * Sends catalog admin changes and routes the CatalogAdminResult answers back to them.
 * Saves are correlated by operation id; structural changes carry no id on the wire, so only
 * one runs at a time and a second request is refused instead of racing the first.
 */
export const useCatalogAdminMutations = (): CatalogAdminMutations => {
    const { currentType } = useCatalogUiState();
    const { refreshIndex, refreshCurrentPage } = useCatalogActions();
    const { simpleAlert } = useNotificationActions();
    const studio = useCatalogStudio();
    const closeDeleted = useCatalogAdminUiStore((state) => state.closeDeleted);
    const [busy, setBusy] = useState(false);
    const [pendingSaveCount, setPendingSaveCount] = useState(0);
    const [lastError, setLastError] = useState<string | null>(null);
    const [dismissedStudioErrorId, setDismissedStudioErrorId] = useState(0);
    const [results, setResults] = useState<ReadonlyMap<string, CatalogAdminMutationResult>>(new Map());
    const pendingActionRef = useRef<PendingStructuralAction | null>(null);
    const queuedActionRef = useRef<{ request: StructuralRequest; timer: ReturnType<typeof setTimeout> } | null>(null);
    const pendingSavesRef = useRef(new Map<string, PendingSave>());
    // The session a structural change was made against; until a newer one arrives its revision is stale.
    const [staleSession, setStaleSession] = useState<CatalogStudioSession | null>(null);
    const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { session, revision, requests } = studio;
    const awaitingRevision = staleSession !== null && session === staleSession;
    // Requests read the session at the moment they are sent: a confirmation dialog may stay open across other saves.
    const liveRef = useRef({ session, revision, awaitingRevision, currentType });

    useLayoutEffect(() => {
        liveRef.current = { session, revision, awaitingRevision, currentType };
    });

    useEffect(
        () => () => {
            if (queuedActionRef.current) clearTimeout(queuedActionRef.current.timer);
            if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
            pendingSavesRef.current.forEach((pending) => clearTimeout(pending.timer));
        },
        []
    );

    const publishResult = useCallback((result: CatalogAdminMutationResult) => {
        setResults((current) => {
            const next = new Map(current);
            next.set(result.operationId, result);
            for (const operationId of next.keys()) {
                if (next.size <= MAX_KEPT_RESULTS) break;
                next.delete(operationId);
            }
            return next;
        });
    }, []);

    const settleSave = useCallback((operationId: string) => {
        const pending = pendingSavesRef.current.get(operationId);
        if (!pending) return null;

        clearTimeout(pending.timer);
        pendingSavesRef.current.delete(operationId);
        setPendingSaveCount(pendingSavesRef.current.size);
        return pending;
    }, []);

    const beginSave = useCallback(
        (action: CatalogAdminSmartSaveAction) => {
            const operationId = nextCatalogStudioOperationId(action);
            const timer = setTimeout(() => {
                if (!settleSave(operationId)) return;
                publishResult(failedResult(operationId, action, 'TIMEOUT', LocalizeText('catalog.admin.error.timeout')));
            }, RESPONSE_TIMEOUT_MS);

            pendingSavesRef.current.set(operationId, { action, timer });
            setPendingSaveCount(pendingSavesRef.current.size);
            return operationId;
        },
        [publishResult, settleSave]
    );

    const finishAction = useCallback(() => {
        const pending = pendingActionRef.current;
        pendingActionRef.current = null;
        setBusy(!!queuedActionRef.current);
        return pending;
    }, []);

    /** Reloads everything a structural change may have touched, when its answer cannot be trusted or never came. */
    const resync = useCallback(() => {
        studio.refresh();
        studio.loadHistory();
        refreshIndex();
        refreshCurrentPage();
    }, [refreshCurrentPage, refreshIndex, studio]);

    /** Sends a structural change now; the session must be open and no other change outstanding. */
    const sendAction = useCallback(
        (request: StructuralRequest, liveSession: CatalogStudioSession, liveRevision: number) => {
            const operationId = nextCatalogStudioOperationId(request.action);
            // Without an answer the change is released after the timeout: its queue entry stays, so its
            // late answer is still absorbed by it instead of being credited to a newer request.
            const requestId = requests.begin('structural', {
                timeoutMs: RESPONSE_TIMEOUT_MS,
                onUnanswered: (reason) => {
                    if (pendingActionRef.current?.requestId !== requestId) return;

                    finishAction();
                    if (reason === 'timeout') setLastError(LocalizeText('catalog.admin.error.timeout'));
                    if (reason !== 'reset') resync();
                }
            });

            pendingActionRef.current = { ...request, requestId };
            setBusy(true);
            setLastError(null);
            SendMessageComposer(request.build(liveSession.draftVersionId, liveRevision, operationId));
        },
        [finishAction, requests, resync]
    );

    /**
     * Runs one structural change. While the studio session is still opening a single change waits
     * for it (the old editor did the same); anything beyond that is refused rather than raced.
     */
    const runAction = useCallback(
        (request: StructuralRequest) => {
            const live = liveRef.current;

            if (pendingActionRef.current || queuedActionRef.current || live.awaitingRevision) {
                setLastError(LocalizeText('catalog.admin.error.busy'));
                return false;
            }

            if (!live.session) {
                const timer = setTimeout(() => {
                    if (!queuedActionRef.current) return;
                    queuedActionRef.current = null;
                    setBusy(!!pendingActionRef.current);
                    setLastError(LocalizeText('catalog.admin.error.timeout'));
                }, RESPONSE_TIMEOUT_MS);

                queuedActionRef.current = { request, timer };
                setBusy(true);
                setLastError(null);
                studio.refresh();
                return true;
            }

            sendAction(request, live.session, live.revision);
            return true;
        },
        [sendAction, studio]
    );

    // Sends the change that waited for the session as soon as one is open.
    useEffect(() => {
        const queued = queuedActionRef.current;
        if (!queued || !session || awaitingRevision || pendingActionRef.current) return;

        clearTimeout(queued.timer);
        queuedActionRef.current = null;
        sendAction(queued.request, session, revision);
    }, [awaitingRevision, revision, sendAction, session]);

    const handleSmartSave = (parser: CatalogAdminResultMessageParser, smartSave: CatalogAdminSmartSaveResult) => {
        const pending = pendingSavesRef.current.get(smartSave.operationId);
        if (!pending || pending.action !== smartSave.action) return;

        settleSave(smartSave.operationId);
        publishResult(toMutationResult(parser, smartSave));

        // The revision moved on: fetch it, so the editor's next save is checked against the current one.
        if (smartSave.code === STALE_REVISION) studio.refresh();
        if (!parser.success || !smartSave.entity || !smartSave.historyGroup) return;

        studio.applyMutation({
            operationId: smartSave.operationId,
            action: smartSave.action,
            revision: smartSave.revision,
            entityType: smartSave.entityType,
            catalogType: smartSave.catalogType,
            entity: smartSave.entity,
            historyGroup: smartSave.historyGroup
        });

        if (smartSave.entityType === 'OFFER') refreshCurrentPage();
    };

    const handleStructuralResult = (parser: CatalogAdminResultMessageParser) => {
        const pending = finishAction();

        if (!parser.success) {
            const message = parser.message ? localizeCatalogAdminPlainMessage(parser.message) : LocalizeText('catalog.admin.error.failed');
            setLastError(message);
            // A refusal can come from a stale revision; reload it so a retry is checked against the current one.
            studio.refresh();
            simpleAlert(message, NotificationAlertType.ALERT, null, null, LocalizeText('catalog.admin.error.title'));
            // An optimistic offer reorder has to be undone by reloading the page.
            if (pending?.action === 'reorderOffers') refreshCurrentPage();
            return;
        }

        setLastError(null);
        if (pending?.action === 'deletePage') {
            // The editors of the page, its sub-pages and their offers all point at rows that are gone.
            closeDeleted(collectPageSubtree(session, pending.entityId, toStudioCatalogType(currentType)), []);
        }
        if (pending?.action === 'deleteOffer') closeDeleted([], [pending.entityId]);

        // Live edits move the revision on; the next change waits for the refreshed session (or gives up after a while).
        setStaleSession(session);
        if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
        staleTimerRef.current = setTimeout(() => setStaleSession(null), RESPONSE_TIMEOUT_MS);
        studio.refresh();
        studio.loadHistory();
        if (pending && PAGE_INDEX_ACTIONS.has(pending.action)) refreshIndex();
        if (pending && PAGE_CONTENT_ACTIONS.has(pending.action)) refreshCurrentPage();
    };

    useMessageEvent<CatalogAdminResultEvent>(CatalogAdminResultEvent, (event) => {
        const parser = event.getParser();

        if (parser.smartSaveResult) {
            handleSmartSave(parser, parser.smartSaveResult);
            return;
        }

        // A bare answer belongs to the head of the request queue, if its kind accepts it (see the tracker).
        const answer = requests.takeBare(parser.success);

        if (!answer) {
            // Credited to nothing: show the current catalog instead of guessing what it reported.
            studio.refresh();
            return;
        }

        // The late answer of a request that already timed out: it was released, so only resync.
        if (answer.expired) {
            if (answer.kind === 'structural') resync();
            else studio.refresh();
            return;
        }

        // Only one structural change is outstanding at a time, so the head is the pending one.
        if (answer.kind === 'structural') handleStructuralResult(parser);
        else answer.onBare?.(parser.success, parser.message);
    });

    // A details answer settles its own entry (matched by id), even when its editor has closed meanwhile.
    useMessageEvent<CatalogAdminPageDetailsEvent>(CatalogAdminPageDetailsEvent, (event) => requests.takeReply('pageDetails', event.getParser().pageId));
    useMessageEvent<CatalogAdminOfferDetailsEvent>(CatalogAdminOfferDetailsEvent, (event) => requests.takeReply('offerDetails', event.getParser().offerId));

    const savePage = useCallback(
        (form: CatalogAdminPageForm, catalogType: string) => {
            const live = liveRef.current;
            if (!live.session) return null;

            const isNew = form.pageId === null;
            const name = form.caption || (isNew ? LocalizeText('catalog.admin.create.page') : `#${form.pageId}`);
            const summary = LocalizeText(isNew ? 'catalog.admin.history.page.created' : 'catalog.admin.history.page.updated', ['name'], [name]);
            const operationId = beginSave(isNew ? 'createPage' : 'savePage');

            SendMessageComposer(
                createPageWriteComposer(form, { catalogType, draftVersionId: live.session.draftVersionId, revision: live.revision, summary, operationId })
            );
            return operationId;
        },
        [beginSave]
    );

    const saveOffer = useCallback(
        (form: CatalogAdminOfferForm, catalogType: string) => {
            const live = liveRef.current;
            if (!live.session) return null;

            const isNew = form.offerId === null;
            const name = form.catalogName || (isNew ? LocalizeText('catalog.admin.offer.new') : `#${form.offerId}`);
            const summary = LocalizeText(isNew ? 'catalog.admin.history.offer.created' : 'catalog.admin.history.offer.updated', ['name'], [name]);
            const operationId = beginSave(isNew ? 'createOffer' : 'saveOffer');

            SendMessageComposer(
                createOfferWriteComposer(form, { catalogType, draftVersionId: live.session.draftVersionId, revision: live.revision, summary, operationId })
            );
            return operationId;
        },
        [beginSave]
    );

    const deletePage = useCallback(
        (pageId: number, name: string, catalogType?: string) => {
            const type = catalogType ?? liveRef.current.currentType;
            const summary = LocalizeText('catalog.admin.history.page.deleted', ['name'], [name]);

            return runAction({
                action: 'deletePage',
                entityType: 'PAGE',
                entityId: pageId,
                build: (draftVersionId, expectedRevision, operationId) =>
                    new CatalogAdminDeletePageComposer(pageId, type, draftVersionId, expectedRevision, '', summary, operationId)
            });
        },
        [runAction]
    );

    const movePage = useCallback(
        (pageId: number, parentId: number, index: number, name: string) => {
            const type = liveRef.current.currentType;
            const summary = LocalizeText('catalog.admin.history.page.moved', ['name'], [name]);

            return runAction({
                action: 'movePage',
                entityType: 'PAGE',
                entityId: pageId,
                build: (draftVersionId, expectedRevision, operationId) =>
                    new CatalogAdminMovePageComposer(pageId, parentId, index, type, draftVersionId, expectedRevision, '', summary, operationId)
            });
        },
        [runAction]
    );

    const setPageVisible = useCallback(
        (pageId: number, visible: boolean, name: string) => {
            const type = liveRef.current.currentType;
            const summary = LocalizeText(visible ? 'catalog.admin.history.page.shown' : 'catalog.admin.history.page.hidden', ['name'], [name]);

            return runAction({
                action: 'setPageVisible',
                entityType: 'PAGE',
                entityId: pageId,
                build: (draftVersionId, expectedRevision, operationId) =>
                    new CatalogAdminSetPageVisibleComposer(pageId, visible, type, draftVersionId, expectedRevision, '', summary, operationId)
            });
        },
        [runAction]
    );

    const deleteOffer = useCallback(
        (offerId: number, name: string, catalogType?: string) => {
            const type = catalogType ?? liveRef.current.currentType;
            const summary = LocalizeText('catalog.admin.history.offer.deleted', ['name'], [name]);

            return runAction({
                action: 'deleteOffer',
                entityType: 'OFFER',
                entityId: offerId,
                build: (draftVersionId, expectedRevision, operationId) =>
                    new CatalogAdminDeleteOfferComposer(offerId, type, draftVersionId, expectedRevision, '', summary, operationId)
            });
        },
        [runAction]
    );

    const reorderOffers = useCallback(
        (orders: CatalogAdminOfferOrder[], pageName: string) => {
            if (!orders.length) return false;

            const type = liveRef.current.currentType;
            const summary = LocalizeText('catalog.admin.history.offers.reordered', ['name'], [pageName]);

            return runAction({
                action: 'reorderOffers',
                entityType: 'OFFER',
                entityId: 0,
                build: (draftVersionId, expectedRevision, operationId) =>
                    new CatalogAdminReorderOffersComposer(orders, type, draftVersionId, expectedRevision, '', summary, operationId)
            });
        },
        [runAction]
    );

    const clearError = useCallback(() => {
        setLastError(null);
        setDismissedStudioErrorId(studio.lastErrorId);
    }, [studio.lastErrorId]);

    return {
        sessionReady: !!session,
        loading: busy || awaitingRevision || pendingSaveCount > 0,
        busy: busy || awaitingRevision,
        lastError: lastError || (studio.lastErrorId !== dismissedStudioErrorId ? studio.lastError : null),
        results,
        clearError,
        savePage,
        saveOffer,
        deletePage,
        movePage,
        setPageVisible,
        deleteOffer,
        reorderOffers
    };
};
