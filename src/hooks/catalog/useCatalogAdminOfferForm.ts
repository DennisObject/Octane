import { CatalogAdminLoadOfferComposer, CatalogAdminOfferDetailsEvent } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { CatalogType } from '../../api/catalog/CatalogType';
import { SendMessageComposer } from '../../api/octane/SendMessageComposer';
import { LocalizeText } from '../../api/utils/LocalizeText';
import { useCatalogAdmin } from '../../components/catalog/CatalogAdminContext';
import { useMessageEvent } from '../events/useMessageEvent';
import { useNotificationActions } from '../notification/useNotification';
import type { CatalogAdminOfferEditorTarget, CatalogAdminOfferForm } from './catalogAdmin.types';
import {
    createNewOfferForm,
    createOfferFormFromDetails,
    createOfferFormFromOffer,
    createOfferFormFromSnapshot,
    nextCatalogAdminOrder,
    validateOfferForm
} from './catalogAdminForms.helpers';
import { resolveCatalogAdminEditorStatus } from './catalogAdminStatus.helpers';
import { toStudioCatalogType } from './catalogAdminTree.helpers';
import { useCatalogAdminUiStore } from './catalogAdminUiStore';
import type { CatalogStudioOfferSnapshot, CatalogStudioSession } from './catalogStudio.types';
import { useCatalogAdminSmartSave } from './useCatalogAdminSmartSave';
import { useCatalogStudio } from './useCatalogStudio';

const findSnapshot = (session: CatalogStudioSession | null, offerId: number | null, catalogType: string) =>
    offerId === null ? null : (session?.offers.find((offer) => offer.offerId === offerId && offer.catalogType === catalogType) ?? null);

const createInitialForm = (target: CatalogAdminOfferEditorTarget, session: CatalogStudioSession | null): CatalogAdminOfferForm => {
    const studioType = toStudioCatalogType(target.catalogType);

    if (target.offerId === null) {
        const siblingOrders = (session?.offers ?? [])
            .filter((offer) => offer.catalogType === studioType && offer.pageId === target.pageId)
            .map((offer) => offer.orderNumber);

        return createNewOfferForm(target.pageId, nextCatalogAdminOrder(siblingOrders));
    }

    const snapshot = findSnapshot(session, target.offerId, studioType);
    if (snapshot) return createOfferFormFromSnapshot(snapshot);

    return target.offer ? createOfferFormFromOffer(target.offer, target.pageId) : { ...createNewOfferForm(target.pageId), offerId: target.offerId };
};

/**
 * State and actions of one offer editor window. The stored offer (with the limited sale
 * count) is requested once the studio session is open; only the answer for this offer id counts.
 */
export const useCatalogAdminOfferForm = (target: CatalogAdminOfferEditorTarget) => {
    const studio = useCatalogStudio();
    const admin = useCatalogAdmin();
    const { showConfirm } = useNotificationActions();
    const closeOfferEditor = useCatalogAdminUiStore((state) => state.closeOfferEditor);
    const studioType = toStudioCatalogType(target.catalogType);
    const { offerId } = target;
    const [initialForm] = useState(() => createInitialForm(target, studio.session));
    const [detailsReady, setDetailsReady] = useState(() => offerId === null || !!findSnapshot(studio.session, offerId, studioType));
    const [limitedSells, setLimitedSells] = useState(0);
    const [sessionSeen, setSessionSeen] = useState(!!studio.session);
    const detailsRequestedRef = useRef(false);
    const sessionReady = admin?.sessionReady ?? false;
    const builderCatalog = target.catalogType === CatalogType.BUILDER;

    const smartSave = useCatalogAdminSmartSave<CatalogAdminOfferForm>({
        initial: initialForm,
        acknowledgements: admin?.results ?? new Map(),
        submit: (draft) => admin?.saveOffer(draft, target.catalogType) ?? null,
        canSubmit: (draft) => sessionReady && !validateOfferForm(draft, builderCatalog, draft.offerId === null ? 0 : limitedSells),
        toCommitted: (ack) => (ack.entityType === 'OFFER' && ack.entity ? createOfferFormFromSnapshot(ack.entity as CatalogStudioOfferSnapshot) : null),
        onClose: closeOfferEditor,
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

        if (offerId === null || findSnapshot(studio.session, offerId, studioType)) {
            if (canReplaceDraft) smartSave.hydrate(createInitialForm(target, studio.session));
            setDetailsReady(true);
        }
    }

    useEffect(() => {
        if (offerId === null || !studio.session || detailsRequestedRef.current) return;
        detailsRequestedRef.current = true;

        SendMessageComposer(new CatalogAdminLoadOfferComposer(offerId, target.catalogType, studio.session.draftVersionId, studio.revision));
    }, [offerId, studio.revision, studio.session, target.catalogType]);

    useMessageEvent<CatalogAdminOfferDetailsEvent>(CatalogAdminOfferDetailsEvent, (event) => {
        const parser = event.getParser();
        if (!detailsRequestedRef.current || parser.offerId !== offerId) return;

        setLimitedSells(parser.limitedSells);
        if (canReplaceDraft) smartSave.hydrate(createOfferFormFromDetails(parser));
        setDetailsReady(true);
    });

    const { draft, baseline } = smartSave;
    const isNew = baseline.offerId === null;
    const soldCount = isNew ? 0 : limitedSells;
    const validationKey = detailsReady ? validateOfferForm(draft, builderCatalog, soldCount) : null;
    const displayName =
        draft.catalogName.trim() || target.offer?.localizationName || (isNew ? LocalizeText('catalog.admin.offer.new') : `#${baseline.offerId}`);
    const status = resolveCatalogAdminEditorStatus({
        sessionReady,
        detailsReady,
        loadingKey: 'catalog.admin.status.loading.offer',
        validationKey,
        isDirty: smartSave.isDirty,
        saveStatus: smartSave.status,
        saveMessage: smartSave.message,
        lastSavedAt: smartSave.lastSavedAt
    });

    const requestDelete = () => {
        const storedOfferId = baseline.offerId;
        if (storedOfferId === null || admin?.busy) return;

        const name = baseline.catalogName || `#${storedOfferId}`;

        showConfirm(
            LocalizeText('catalog.admin.delete.offer.confirm', ['name'], [name]),
            () => admin?.deleteOffer(storedOfferId, name, target.catalogType),
            null,
            LocalizeText('catalog.admin.delete'),
            null,
            LocalizeText('catalog.admin.delete.offer')
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
        limitedSells: soldCount,
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
