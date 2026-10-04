import { CatalogAdminLoadPageComposer, CatalogAdminPageDetailsEvent } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api/octane/SendMessageComposer';
import { LocalizeText } from '../../api/utils/LocalizeText';
import { useCatalogAdmin } from '../../components/catalog/CatalogAdminContext';
import { isReadOnlyCatalogAdminLayout } from '../../components/catalog/views/page/layout/catalogLayoutRegistry';
import { useMessageEvent } from '../events/useMessageEvent';
import { useNotificationActions } from '../notification/useNotification';
import type { CatalogAdminPageEditorTarget, CatalogAdminPageForm, CatalogAdminStatus } from './catalogAdmin.types';
import {
    createNewPageForm,
    createPageFormFromDetails,
    createPageFormFromNode,
    createPageFormFromSnapshot,
    nextCatalogAdminOrder,
    validatePageForm
} from './catalogAdminForms.helpers';
import { localizeCatalogAdminPlainMessage } from './catalogAdminServerErrors.helpers';
import { resolveCatalogAdminEditorStatus } from './catalogAdminStatus.helpers';
import { getCatalogAdminNodeName, toStudioCatalogType } from './catalogAdminTree.helpers';
import { useCatalogAdminUiStore } from './catalogAdminUiStore';
import type { CatalogStudioPageSnapshot, CatalogStudioSession } from './catalogStudio.types';
import { useCatalogAdminSmartSave } from './useCatalogAdminSmartSave';
import { useCatalogStudio } from './useCatalogStudio';

/** A details read without an answer after this long is reported, so the editor does not wait forever. */
const DETAILS_TIMEOUT_MS = 10_000;

const findSnapshot = (session: CatalogStudioSession | null, pageId: number | null, catalogType: string) =>
    pageId === null ? null : (session?.pages.find((page) => page.pageId === pageId && page.catalogType === catalogType) ?? null);

const createInitialForm = (target: CatalogAdminPageEditorTarget, session: CatalogStudioSession | null): CatalogAdminPageForm => {
    const catalogMode = toStudioCatalogType(target.catalogType);

    if (target.kind === 'create') {
        const parentId = target.parent.pageId > 0 ? target.parent.pageId : -1;
        const siblingOrders = (session?.pages ?? [])
            .filter((page) => page.catalogType === catalogMode && page.parentId === parentId)
            .map((page) => page.orderNum);

        return createNewPageForm(parentId, catalogMode, nextCatalogAdminOrder(siblingOrders));
    }

    const snapshot = findSnapshot(session, target.node.pageId, catalogMode);

    return snapshot ? createPageFormFromSnapshot(snapshot) : createPageFormFromNode(target.node, catalogMode);
};

/**
 * State and actions of one page editor window. The stored page is requested once the
 * studio session is open; only the answer for this page id is accepted.
 */
export const useCatalogAdminPageForm = (target: CatalogAdminPageEditorTarget) => {
    const studio = useCatalogStudio();
    const { getSession, requests } = studio;
    const admin = useCatalogAdmin();
    const { showConfirm } = useNotificationActions();
    const closeEditor = useCatalogAdminUiStore((state) => state.closeEditor);
    const bindCreated = useCatalogAdminUiStore((state) => state.bindCreated);
    const registerGuard = useCatalogAdminUiStore((state) => state.registerGuard);
    const unregisterGuard = useCatalogAdminUiStore((state) => state.unregisterGuard);
    const editorKey = target.key;
    const studioType = toStudioCatalogType(target.catalogType);
    const pageId = target.kind === 'edit' ? target.node.pageId : null;
    const [detailsReady, setDetailsReady] = useState(() => target.kind === 'create' || !!findSnapshot(studio.session, pageId, studioType));
    const [sessionSeen, setSessionSeen] = useState(!!studio.session);
    const detailsRequestedRef = useRef(false);
    const detailsRequestIdRef = useRef<number | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    // The details read waits in the request queue until it is its turn; until then the editor waits for the server.
    const [detailsSent, setDetailsSent] = useState(false);
    const [initialForm] = useState(() => createInitialForm(target, studio.session));
    const sessionReady = admin?.sessionReady ?? false;

    const smartSave = useCatalogAdminSmartSave<CatalogAdminPageForm>({
        initial: initialForm,
        acknowledgements: admin?.results ?? new Map(),
        submit: (draft) => admin?.savePage(draft, target.catalogType) ?? null,
        canSubmit: (draft) => sessionReady && detailsReady && !validatePageForm(draft),
        toCommitted: (ack) => (ack.entityType === 'PAGE' && ack.entity ? createPageFormFromSnapshot(ack.entity as CatalogStudioPageSnapshot) : null),
        onClose: () => closeEditor('page', editorKey),
        confirmDiscard: (discard) =>
            showConfirm(
                LocalizeText('catalog.admin.discard.confirm'),
                discard,
                null,
                LocalizeText('catalog.admin.discard'),
                null,
                LocalizeText('catalog.admin.discard.title')
            ),
        incompleteMessage: LocalizeText('catalog.admin.error.incomplete')
    });

    const canReplaceDraft = !smartSave.isDirty && !smartSave.inFlight;
    const { confirmLeave } = smartSave;
    const createdId = smartSave.baseline.pageId;

    // Opening another page asks this editor first, so unsaved changes are never dropped silently.
    useEffect(() => {
        registerGuard('page', editorKey, confirmLeave);
        return () => unregisterGuard('page', editorKey);
    }, [confirmLeave, editorKey, registerGuard, unregisterGuard]);

    // After a create the editor edits the new row; the store has to know it to close it on delete.
    useEffect(() => {
        if (target.entityId === null && createdId !== null) bindCreated('page', editorKey, createdId);
    }, [bindCreated, createdId, editorKey, target.entityId]);

    // The editor may open before the studio session: fill in the stored values once it arrives.
    if (studio.session && !sessionSeen) {
        setSessionSeen(true);

        if (target.kind === 'create' || findSnapshot(studio.session, pageId, studioType)) {
            if (canReplaceDraft) smartSave.hydrate(createInitialForm(target, studio.session));
            setDetailsReady(true);
        }
    }

    useEffect(() => {
        if (pageId === null || !studio.session || detailsRequestedRef.current) return;
        detailsRequestedRef.current = true;

        const requestedId = pageId;
        const catalogType = target.catalogType;

        // Waits in the studio's request queue for its turn; a refusal comes back as a bare CatalogAdminResult.
        detailsRequestIdRef.current = requests.enqueue({
            kind: 'pageDetails',
            entityId: requestedId,
            timeoutMs: DETAILS_TIMEOUT_MS,
            send: () => {
                const current = getSession();
                if (!current) return false;

                SendMessageComposer(new CatalogAdminLoadPageComposer(requestedId, catalogType, current.draftVersionId, current.revision));
                return true;
            },
            onSent: () => setDetailsSent(true),
            onBare: (_success, message) => setDetailsError(message ? localizeCatalogAdminPlainMessage(message) : LocalizeText('catalog.admin.error.failed')),
            onUnanswered: (reason) => {
                // A timeout leaves it to the request queue's resync (the editor says so); its late answer still loads it.
                if (reason === 'timeout') return;

                // Not sent, or dropped by a close or reconnect: ask again once a session is back.
                setDetailsSent(false);
                detailsRequestedRef.current = false;
            }
        });
    }, [pageId, getSession, requests, studio.session, target.catalogType]);

    // A closed editor drops its queued read; one already on the wire stays but its answers go nowhere.
    useEffect(
        () => () => {
            if (detailsRequestIdRef.current !== null) requests.detach(detailsRequestIdRef.current);
        },
        [requests]
    );

    useMessageEvent<CatalogAdminPageDetailsEvent>(CatalogAdminPageDetailsEvent, (event) => {
        const parser = event.getParser();
        if (!detailsRequestedRef.current || parser.pageId !== pageId) return;

        setDetailsError(null);

        if (canReplaceDraft) smartSave.hydrate(createPageFormFromDetails(parser));
        setDetailsReady(true);
    });

    const { draft, baseline } = smartSave;
    const isNew = baseline.pageId === null;
    const validationKey = detailsReady ? validatePageForm(draft) : null;
    const fallbackName = target.kind === 'edit' ? getCatalogAdminNodeName(target.node) : '';
    const displayName = draft.caption.trim() || baseline.caption.trim() || fallbackName || LocalizeText('catalog.admin.page.untitled');
    const editorStatus = resolveCatalogAdminEditorStatus({
        sessionReady,
        detailsReady,
        loadingKey: detailsSent ? 'catalog.admin.status.loading.page' : 'catalog.admin.status.working',
        validationKey,
        isDirty: smartSave.isDirty,
        saveStatus: smartSave.status,
        saveMessage: smartSave.message,
        lastSavedAt: smartSave.lastSavedAt
    });
    const resyncStatus: CatalogAdminStatus | null =
        studio.requestState === 'resync' ? { tone: 'error', message: LocalizeText('catalog.admin.studio.resync') } : null;
    const status: CatalogAdminStatus | null = detailsError ? { tone: 'error', message: detailsError } : (resyncStatus ?? editorStatus);

    const requestDelete = () => {
        const storedPageId = baseline.pageId;
        if (storedPageId === null || admin?.busy) return;

        const name = baseline.caption || fallbackName || `#${storedPageId}`;

        showConfirm(
            LocalizeText('catalog.admin.delete.page.confirm', ['name'], [name]),
            () => admin?.deletePage(storedPageId, name, target.catalogType),
            null,
            LocalizeText('catalog.admin.delete'),
            null,
            LocalizeText('catalog.admin.delete.page')
        );
    };

    return {
        draft,
        patch: smartSave.patch,
        fieldErrors: smartSave.fieldErrors,
        isNew,
        isDirty: smartSave.isDirty,
        isSaving: !!smartSave.inFlight,
        detailsReady,
        displayName,
        readOnlyLayout: isReadOnlyCatalogAdminLayout(baseline.pageLayout),
        status,
        canSave: sessionReady && detailsReady && !validationKey && smartSave.isDirty && !smartSave.inFlight && !admin?.busy,
        canDelete: !isNew && !admin?.busy,
        save: smartSave.save,
        reset: smartSave.reset,
        requestClose: smartSave.requestClose,
        requestDelete,
        onKeyDown: smartSave.onKeyDown
    };
};
