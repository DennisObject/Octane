import {
    CatalogAdminDeleteOfferComposer,
    CatalogAdminDeletePageComposer,
    CatalogAdminMovePageComposer,
    CatalogAdminReorderOffersComposer,
    CatalogAdminResultEvent,
    CatalogAdminResultMessageParser,
    CatalogAdminSetPageVisibleComposer,
    CatalogAdminSmartSaveResult
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useCatalogAdminUiStore } from './catalogAdminUiStore';
import { nextCatalogStudioOperationId } from './catalogStudio.helpers';
import { useCatalogStudio } from './useCatalogStudio';

/** A save or structural change with no answer after this long is reported as lost. */
const RESPONSE_TIMEOUT_MS = 20_000;
/** How many acknowledged saves are kept for the editors to pick theirs up. */
const MAX_KEPT_RESULTS = 16;

type StructuralAction = 'deletePage' | 'movePage' | 'setPageVisible' | 'deleteOffer' | 'reorderOffers';

const PAGE_INDEX_ACTIONS = new Set<StructuralAction>(['deletePage', 'movePage', 'setPageVisible']);
const PAGE_CONTENT_ACTIONS = new Set<StructuralAction>(['deleteOffer', 'reorderOffers']);

interface PendingStructuralAction {
    action: StructuralAction;
    entityType: 'PAGE' | 'OFFER';
    entityId: number;
    timer: ReturnType<typeof setTimeout>;
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
    message: parser.message || result.code,
    entityType: result.entityType,
    catalogType: result.catalogType,
    entityId: result.entityId,
    entity: result.entity,
    historyGroup: result.historyGroup,
    fieldErrors: { ...result.fieldErrors },
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
    const closePageEditor = useCatalogAdminUiStore((state) => state.closePageEditor);
    const closeOfferEditor = useCatalogAdminUiStore((state) => state.closeOfferEditor);
    const [busy, setBusy] = useState(false);
    const [pendingSaveCount, setPendingSaveCount] = useState(0);
    const [lastError, setLastError] = useState<string | null>(null);
    const [dismissedStudioError, setDismissedStudioError] = useState<string | null>(null);
    const [results, setResults] = useState<ReadonlyMap<string, CatalogAdminMutationResult>>(new Map());
    const pendingActionRef = useRef<PendingStructuralAction | null>(null);
    const pendingSavesRef = useRef(new Map<string, PendingSave>());

    const session = studio.session;
    const revision = studio.revision;

    useEffect(
        () => () => {
            if (pendingActionRef.current) clearTimeout(pendingActionRef.current.timer);
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
        if (pending) clearTimeout(pending.timer);
        pendingActionRef.current = null;
        setBusy(false);
        return pending;
    }, []);

    /** Claims the single structural slot; returns the operation id or null when refused. */
    const beginAction = useCallback(
        (action: StructuralAction, entityType: 'PAGE' | 'OFFER', entityId: number) => {
            if (!session) {
                setLastError(LocalizeText('catalog.admin.status.connecting'));
                studio.refresh();
                return null;
            }

            if (pendingActionRef.current) {
                setLastError(LocalizeText('catalog.admin.error.busy'));
                return null;
            }

            const timer = setTimeout(() => {
                if (!finishAction()) return;
                setLastError(LocalizeText('catalog.admin.error.timeout'));
                if (PAGE_CONTENT_ACTIONS.has(action)) refreshCurrentPage();
            }, RESPONSE_TIMEOUT_MS);

            pendingActionRef.current = { action, entityType, entityId, timer };
            setBusy(true);
            setLastError(null);
            return nextCatalogStudioOperationId(action);
        },
        [finishAction, refreshCurrentPage, session, studio]
    );

    const handleSmartSave = (parser: CatalogAdminResultMessageParser, smartSave: CatalogAdminSmartSaveResult) => {
        const pending = pendingSavesRef.current.get(smartSave.operationId);
        if (!pending || pending.action !== smartSave.action) return;

        settleSave(smartSave.operationId);
        publishResult(toMutationResult(parser, smartSave));

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
            const message = parser.message || LocalizeText('catalog.admin.error.failed');
            setLastError(message);
            simpleAlert(message, NotificationAlertType.ALERT, null, null, LocalizeText('catalog.admin.error.title'));
            // An optimistic offer reorder has to be undone by reloading the page.
            if (pending?.action === 'reorderOffers') refreshCurrentPage();
            return;
        }

        setLastError(null);
        if (pending?.action === 'deletePage' || pending?.action === 'deleteOffer') closeDeleted(pending.entityType, pending.entityId);

        studio.refresh();
        studio.loadHistory();
        if (pending && PAGE_INDEX_ACTIONS.has(pending.action)) refreshIndex();
        if (pending && PAGE_CONTENT_ACTIONS.has(pending.action)) refreshCurrentPage();
    };

    /** A server without the Smart Save payload answers a save with the bare success flag. */
    const handleLegacySaveResult = (parser: CatalogAdminResultMessageParser, operationId: string) => {
        const pending = settleSave(operationId);
        if (!pending) return;

        if (!parser.success) {
            publishResult(failedResult(operationId, pending.action, 'FAILED', parser.message || LocalizeText('catalog.admin.error.failed')));
            return;
        }

        if (pending.action === 'createPage' || pending.action === 'savePage') {
            closePageEditor();
            refreshIndex();
        } else {
            closeOfferEditor();
            refreshCurrentPage();
        }
        studio.refresh();
        studio.loadHistory();
    };

    useMessageEvent<CatalogAdminResultEvent>(CatalogAdminResultEvent, (event) => {
        const parser = event.getParser();

        if (parser.smartSaveResult) {
            handleSmartSave(parser, parser.smartSaveResult);
            return;
        }

        if (pendingActionRef.current) {
            handleStructuralResult(parser);
            return;
        }

        const oldestSave = pendingSavesRef.current.keys().next();
        if (!oldestSave.done) {
            handleLegacySaveResult(parser, oldestSave.value);
            return;
        }

        // A late answer to a request that already timed out.
        if (!parser.success) setLastError(parser.message || LocalizeText('catalog.admin.error.failed'));
        else studio.refresh();
    });

    const savePage = useCallback(
        (form: CatalogAdminPageForm, catalogType: string) => {
            if (!session) return null;

            const isNew = form.pageId === null;
            const name = form.caption || (isNew ? LocalizeText('catalog.admin.create.page') : `#${form.pageId}`);
            const summary = LocalizeText(isNew ? 'catalog.admin.history.page.created' : 'catalog.admin.history.page.updated', ['name'], [name]);
            const operationId = beginSave(isNew ? 'createPage' : 'savePage');

            SendMessageComposer(createPageWriteComposer(form, { catalogType, draftVersionId: session.draftVersionId, revision, summary, operationId }));
            return operationId;
        },
        [beginSave, revision, session]
    );

    const saveOffer = useCallback(
        (form: CatalogAdminOfferForm, catalogType: string) => {
            if (!session) return null;

            const isNew = form.offerId === null;
            const name = form.catalogName || (isNew ? LocalizeText('catalog.admin.offer.new') : `#${form.offerId}`);
            const summary = LocalizeText(isNew ? 'catalog.admin.history.offer.created' : 'catalog.admin.history.offer.updated', ['name'], [name]);
            const operationId = beginSave(isNew ? 'createOffer' : 'saveOffer');

            SendMessageComposer(createOfferWriteComposer(form, { catalogType, draftVersionId: session.draftVersionId, revision, summary, operationId }));
            return operationId;
        },
        [beginSave, revision, session]
    );

    const deletePage = useCallback(
        (pageId: number, name: string, catalogType = currentType) => {
            const operationId = beginAction('deletePage', 'PAGE', pageId);
            if (!operationId) return false;

            const summary = LocalizeText('catalog.admin.history.page.deleted', ['name'], [name]);
            SendMessageComposer(new CatalogAdminDeletePageComposer(pageId, catalogType, session.draftVersionId, revision, '', summary, operationId));
            return true;
        },
        [beginAction, currentType, revision, session]
    );

    const movePage = useCallback(
        (pageId: number, parentId: number, index: number, name: string) => {
            const operationId = beginAction('movePage', 'PAGE', pageId);
            if (!operationId) return false;

            const summary = LocalizeText('catalog.admin.history.page.moved', ['name'], [name]);
            SendMessageComposer(
                new CatalogAdminMovePageComposer(pageId, parentId, index, currentType, session.draftVersionId, revision, '', summary, operationId)
            );
            return true;
        },
        [beginAction, currentType, revision, session]
    );

    const setPageVisible = useCallback(
        (pageId: number, visible: boolean, name: string) => {
            const operationId = beginAction('setPageVisible', 'PAGE', pageId);
            if (!operationId) return false;

            const summary = LocalizeText(visible ? 'catalog.admin.history.page.shown' : 'catalog.admin.history.page.hidden', ['name'], [name]);
            SendMessageComposer(
                new CatalogAdminSetPageVisibleComposer(pageId, visible, currentType, session.draftVersionId, revision, '', summary, operationId)
            );
            return true;
        },
        [beginAction, currentType, revision, session]
    );

    const deleteOffer = useCallback(
        (offerId: number, name: string, catalogType = currentType) => {
            const operationId = beginAction('deleteOffer', 'OFFER', offerId);
            if (!operationId) return false;

            const summary = LocalizeText('catalog.admin.history.offer.deleted', ['name'], [name]);
            SendMessageComposer(new CatalogAdminDeleteOfferComposer(offerId, catalogType, session.draftVersionId, revision, '', summary, operationId));
            return true;
        },
        [beginAction, currentType, revision, session]
    );

    const reorderOffers = useCallback(
        (orders: CatalogAdminOfferOrder[], pageName: string) => {
            if (!orders.length) return false;

            const operationId = beginAction('reorderOffers', 'OFFER', 0);
            if (!operationId) return false;

            const summary = LocalizeText('catalog.admin.history.offers.reordered', ['name'], [pageName]);
            SendMessageComposer(new CatalogAdminReorderOffersComposer(orders, currentType, session.draftVersionId, revision, '', summary, operationId));
            return true;
        },
        [beginAction, currentType, revision, session]
    );

    const clearError = useCallback(() => {
        setLastError(null);
        setDismissedStudioError(studio.lastError);
    }, [studio.lastError]);

    return {
        sessionReady: !!session,
        loading: busy || pendingSaveCount > 0,
        busy,
        lastError: lastError || (studio.lastError !== dismissedStudioError ? studio.lastError : null),
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
