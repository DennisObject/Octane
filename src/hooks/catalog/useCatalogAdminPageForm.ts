import { CatalogAdminLoadPageComposer, CatalogAdminPageDetailsEvent } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api/octane/SendMessageComposer';
import { LocalizeText } from '../../api/utils/LocalizeText';
import { useCatalogAdmin } from '../../components/catalog/CatalogAdminContext';
import { isReadOnlyCatalogAdminLayout } from '../../components/catalog/views/page/layout/catalogLayoutRegistry';
import { useMessageEvent } from '../events/useMessageEvent';
import { useNotificationActions } from '../notification/useNotification';
import type { CatalogAdminPageEditorTarget, CatalogAdminPageForm } from './catalogAdmin.types';
import {
    createNewPageForm,
    createPageFormFromDetails,
    createPageFormFromNode,
    createPageFormFromSnapshot,
    nextCatalogAdminOrder,
    validatePageForm
} from './catalogAdminForms.helpers';
import { resolveCatalogAdminEditorStatus } from './catalogAdminStatus.helpers';
import { getCatalogAdminNodeName, toStudioCatalogType } from './catalogAdminTree.helpers';
import { useCatalogAdminUiStore } from './catalogAdminUiStore';
import type { CatalogStudioPageSnapshot, CatalogStudioSession } from './catalogStudio.types';
import { useCatalogAdminSmartSave } from './useCatalogAdminSmartSave';
import { useCatalogStudio } from './useCatalogStudio';

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
    const admin = useCatalogAdmin();
    const { showConfirm } = useNotificationActions();
    const closePageEditor = useCatalogAdminUiStore((state) => state.closePageEditor);
    const studioType = toStudioCatalogType(target.catalogType);
    const pageId = target.kind === 'edit' ? target.node.pageId : null;
    const [detailsReady, setDetailsReady] = useState(() => target.kind === 'create' || !!findSnapshot(studio.session, pageId, studioType));
    const [sessionSeen, setSessionSeen] = useState(!!studio.session);
    const detailsRequestedRef = useRef(false);
    const [initialForm] = useState(() => createInitialForm(target, studio.session));
    const sessionReady = admin?.sessionReady ?? false;

    const smartSave = useCatalogAdminSmartSave<CatalogAdminPageForm>({
        initial: initialForm,
        acknowledgements: admin?.results ?? new Map(),
        submit: (draft) => admin?.savePage(draft, target.catalogType) ?? null,
        canSubmit: (draft) => sessionReady && !validatePageForm(draft),
        toCommitted: (ack) => (ack.entityType === 'PAGE' && ack.entity ? createPageFormFromSnapshot(ack.entity as CatalogStudioPageSnapshot) : null),
        onClose: closePageEditor,
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

        SendMessageComposer(new CatalogAdminLoadPageComposer(pageId, target.catalogType, studio.session.draftVersionId, studio.revision));
    }, [pageId, studio.revision, studio.session, target.catalogType]);

    useMessageEvent<CatalogAdminPageDetailsEvent>(CatalogAdminPageDetailsEvent, (event) => {
        const parser = event.getParser();
        if (!detailsRequestedRef.current || parser.pageId !== pageId) return;

        if (canReplaceDraft) smartSave.hydrate(createPageFormFromDetails(parser));
        setDetailsReady(true);
    });

    const { draft, baseline } = smartSave;
    const isNew = baseline.pageId === null;
    const validationKey = detailsReady ? validatePageForm(draft) : null;
    const fallbackName = target.kind === 'edit' ? getCatalogAdminNodeName(target.node) : '';
    const displayName = draft.caption.trim() || baseline.caption.trim() || fallbackName || LocalizeText('catalog.admin.page.untitled');
    const status = resolveCatalogAdminEditorStatus({
        sessionReady,
        detailsReady,
        loadingKey: 'catalog.admin.status.loading.page',
        validationKey,
        isDirty: smartSave.isDirty,
        saveStatus: smartSave.status,
        saveMessage: smartSave.message,
        lastSavedAt: smartSave.lastSavedAt
    });

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
        canSave: sessionReady && detailsReady && !validationKey && smartSave.isDirty && !smartSave.inFlight,
        canDelete: !isNew && !admin?.busy,
        save: smartSave.save,
        reset: smartSave.reset,
        requestClose: smartSave.requestClose,
        requestDelete,
        onKeyDown: smartSave.onKeyDown
    };
};
