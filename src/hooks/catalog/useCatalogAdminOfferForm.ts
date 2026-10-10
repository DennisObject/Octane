import { CatalogAdminLoadOfferComposer, CatalogAdminOfferDetailsEvent } from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api/volt/SendMessageComposer';
import { LocalizeText } from '../../api/utils/LocalizeText';
import { useCatalogAdmin } from '../../components/catalog/CatalogAdminContext';
import { useMessageEvent } from '../events/useMessageEvent';
import { useNotificationActions } from '../notification/useNotification';
import type { CatalogAdminOfferEditorTarget, CatalogAdminOfferForm, CatalogAdminStatus } from './catalogAdmin.types';
import {
    createNewOfferForm,
    createOfferFormFromDetails,
    createOfferFormFromOffer,
    createOfferFormFromSnapshot,
    nextCatalogAdminOrder,
    validateOfferForm
} from './catalogAdminForms.helpers';
import { localizeCatalogAdminPlainMessage } from './catalogAdminServerErrors.helpers';
import { resolveCatalogAdminEditorStatus } from './catalogAdminStatus.helpers';
import { toStudioCatalogType } from './catalogAdminTree.helpers';
import { useCatalogAdminUiStore } from './catalogAdminUiStore';
import type { CatalogStudioOfferSnapshot, CatalogStudioSession } from './catalogStudio.types';
import { useCatalogAdminSmartSave } from './useCatalogAdminSmartSave';
import { useCatalogStudio } from './useCatalogStudio';

/** A details read without an answer after this long is reported, so the editor does not wait forever. */
const DETAILS_TIMEOUT_MS = 10_000;

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
    const { getSession, requests } = studio;
    const admin = useCatalogAdmin();
    const { showConfirm } = useNotificationActions();
    const closeEditor = useCatalogAdminUiStore((state) => state.closeEditor);
    const bindCreated = useCatalogAdminUiStore((state) => state.bindCreated);
    const registerGuard = useCatalogAdminUiStore((state) => state.registerGuard);
    const unregisterGuard = useCatalogAdminUiStore((state) => state.unregisterGuard);
    const editorKey = target.key;
    const studioType = toStudioCatalogType(target.catalogType);
    const { offerId } = target;
    const [initialForm] = useState(() => createInitialForm(target, studio.session));
    // The server binds an offer to this connection when it is loaded (or created) and refuses a save
    // without that, so an existing offer is always loaded before saving is enabled.
    const [detailsReady, setDetailsReady] = useState(offerId === null);
    const [limitedSells, setLimitedSells] = useState(0);
    const [sessionSeen, setSessionSeen] = useState(!!studio.session);
    const detailsRequestKeyRef = useRef<string | null>(null);
    // Counts sessions after the first one: a reconnect gets a new session that has to load the offer again.
    const [sessionEpoch, setSessionEpoch] = useState(0);
    const [hadSession, setHadSession] = useState(!!studio.session);
    const detailsRequestIdRef = useRef<number | null>(null);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    // The details read waits in the request queue until it is its turn; until then the editor waits for the server.
    const [detailsSent, setDetailsSent] = useState(false);
    const sessionReady = admin?.sessionReady ?? false;

    const smartSave = useCatalogAdminSmartSave<CatalogAdminOfferForm>({
        initial: initialForm,
        acknowledgements: admin?.results ?? new Map(),
        submit: (draft) => admin?.saveOffer(draft, target.catalogType) ?? null,
        // Runs on save, after this render, so the stored item id below is set by then.
        canSubmit: (draft) => sessionReady && detailsReady && !validateOfferForm(draft, storedItemIds, draft.offerId === null ? 0 : limitedSells),
        toCommitted: (ack) => (ack.entityType === 'OFFER' && ack.entity ? createOfferFormFromSnapshot(ack.entity as CatalogStudioOfferSnapshot) : null),
        onClose: () => closeEditor('offer', editorKey),
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
    const storedOfferId = smartSave.baseline.offerId;

    // Opening another offer asks this editor first, so unsaved changes are never dropped silently.
    useEffect(() => {
        registerGuard('offer', editorKey, confirmLeave);
        return () => unregisterGuard('offer', editorKey);
    }, [confirmLeave, editorKey, registerGuard, unregisterGuard]);

    // After a create the editor edits the new row; the store has to know it to close it on delete.
    useEffect(() => {
        if (target.entityId === null && storedOfferId !== null) bindCreated('offer', editorKey, storedOfferId);
    }, [bindCreated, editorKey, storedOfferId, target.entityId]);

    if (!!studio.session !== hadSession) {
        setHadSession(!!studio.session);
        if (studio.session && sessionSeen) {
            setSessionEpoch((epoch) => epoch + 1);
            setDetailsSent(false);
            if (storedOfferId !== null) setDetailsReady(false);
        }
    }

    // The editor may open before the studio session: fill in the stored values once it arrives.
    if (studio.session && !sessionSeen) {
        setSessionSeen(true);

        if (offerId === null) setDetailsReady(true);
        if ((offerId === null || findSnapshot(studio.session, offerId, studioType)) && canReplaceDraft) {
            smartSave.hydrate(createInitialForm(target, studio.session));
        }
    }

    useEffect(() => {
        const requestKey = `${storedOfferId}:${sessionEpoch}`;
        if (storedOfferId === null || !studio.session || detailsRequestKeyRef.current === requestKey) return;
        detailsRequestKeyRef.current = requestKey;

        const requestedId = storedOfferId;
        const catalogType = target.catalogType;

        // Waits in the studio's request queue for its turn; a refusal comes back as a bare CatalogAdminResult.
        detailsRequestIdRef.current = requests.enqueue({
            kind: 'offerDetails',
            entityId: requestedId,
            timeoutMs: DETAILS_TIMEOUT_MS,
            send: () => {
                const current = getSession();
                if (!current) return false;

                SendMessageComposer(new CatalogAdminLoadOfferComposer(requestedId, catalogType, current.draftVersionId, current.revision));
                return true;
            },
            onSent: () => setDetailsSent(true),
            onBare: (_success, message) => setDetailsError(message ? localizeCatalogAdminPlainMessage(message) : LocalizeText('catalog.admin.error.failed')),
            onUnanswered: (reason) => {
                // A timeout leaves it to the request queue's resync (the editor says so); its late answer still loads it.
                if (reason === 'timeout') return;

                // Not sent, or dropped by a close or reconnect: ask again once a session is back.
                setDetailsSent(false);
                detailsRequestKeyRef.current = null;
            }
        });
    }, [sessionEpoch, storedOfferId, getSession, requests, studio.session, target.catalogType]);

    // A closed editor drops its queued read; one already on the wire stays but its answers go nowhere.
    useEffect(
        () => () => {
            if (detailsRequestIdRef.current !== null) requests.detach(detailsRequestIdRef.current);
        },
        [requests]
    );

    useMessageEvent<CatalogAdminOfferDetailsEvent>(CatalogAdminOfferDetailsEvent, (event) => {
        const parser = event.getParser();
        if (detailsRequestKeyRef.current === null || parser.offerId !== storedOfferId) return;

        setDetailsError(null);

        setLimitedSells(parser.limitedSells);
        if (canReplaceDraft) smartSave.hydrate(createOfferFormFromDetails(parser));
        setDetailsReady(true);
    });

    const { draft, baseline } = smartSave;
    const isNew = baseline.offerId === null;
    const soldCount = isNew ? 0 : limitedSells;
    const storedItemIds = isNew ? null : baseline.itemIds;
    const validationKey = detailsReady ? validateOfferForm(draft, storedItemIds, soldCount) : null;
    const displayName =
        draft.catalogName.trim() || target.offer?.localizationName || (isNew ? LocalizeText('catalog.admin.offer.new') : `#${baseline.offerId}`);
    const editorStatus = resolveCatalogAdminEditorStatus({
        sessionReady,
        detailsReady,
        loadingKey: detailsSent ? 'catalog.admin.status.loading.offer' : 'catalog.admin.status.working',
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
        canSave: sessionReady && detailsReady && !validationKey && smartSave.isDirty && !smartSave.inFlight && !admin?.busy,
        canDelete: !isNew && !admin?.busy,
        save: smartSave.save,
        reset: smartSave.reset,
        requestClose: smartSave.requestClose,
        requestDelete,
        onKeyDown: smartSave.onKeyDown
    };
};
