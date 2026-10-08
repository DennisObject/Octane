import {
    CatalogPublishedMessageEvent,
    FurnitureListAddOrUpdateEvent,
    FurnitureListEvent,
    FurnitureListInvalidateEvent,
    GetConfiguration,
    GetRoomContentLoader,
    GetRoomEngine,
    GetSessionDataManager,
    LegacyDataType,
    LimitedEditionSoldOutEvent,
    MarketplaceMakeOfferResult,
    NotEnoughBalanceMessageEvent,
    ProductOfferEvent,
    PurchaseErrorMessageEvent,
    PurchaseFromCatalogComposer,
    PurchaseNotAllowedMessageEvent,
    PurchaseOKMessageEvent,
    RoomEngineObjectPlacedEvent,
    RoomObjectVariable,
    RoomPreviewer,
    UnseenItemsEvent,
    UserPermissionsEvent,
    Vector3d
} from '@octane/renderer';
import { useQueryClient } from '@tanstack/react-query';
import { FC, useEffect, useRef } from 'react';
import {
    CatalogPage,
    CatalogType,
    DispatchUiEvent,
    ICatalogNode,
    LocalizeText,
    NotificationAlertType,
    PageLocalization,
    PlacedObjectPurchaseData,
    PlaySound,
    SendMessageComposer,
    SoundNames,
    UnseenItemCategory
} from '../../api';
import {
    CatalogPurchasedEvent,
    CatalogPurchaseFailureEvent,
    CatalogPurchaseNotAllowedEvent,
    CatalogPurchaseSoldOutEvent
} from '../../events';
import { useConnectionState, useMessageEvent, useOctaneEvent, useUiEvent } from '../events';
import { useNotification } from '../notification';
import { useCatalogStore } from './catalogStore';
import { getNodesByOfferIdFromMap, restoreCatalogActivePath, RoomObjectCategory } from './useCatalog.helpers';
import {
    claimPlacedOfferPurchase,
    markPlacedPurchaseBought,
    recordPlacedPurchaseInvalidated,
    recordPlacedPurchaseItems,
    recordPlacedPurchaseListFragment,
    recordPlacedPurchaseUnseen,
    releasePlacedOfferPurchase,
    resetPlacedPurchaseSession,
    takePlacedPurchaseAnswer
} from './useCatalogPlacedOffer';
import { useCatalogPlaceMultipleItems } from './useCatalogPlaceMultipleItems';
import {
    bindCatalogQueryClient,
    buildPurchasableOffer,
    cloneCachedCatalogPages,
    dropCatalogCache,
    invalidateCatalogIndex,
    invalidateCatalogPage,
    invalidateCatalogPages,
    prefetchCatalogIndex,
    readCatalogIndex,
    useCatalogIndexQuery,
    useCatalogPageQuery
} from './useCatalogQueries';
import { useCatalogSkipPurchaseConfirmation } from './useCatalogSkipPurchaseConfirmation';

const scheduleWhenIdle = (run: () => void): void => {
    const idle = (globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback;

    if (typeof idle === 'function') idle(run, { timeout: 5000 });
    else setTimeout(run, 1000);
};

const refreshImportedFurnidata = (mergedRef: { current: boolean }, force: boolean = false) => {
    if (!force && mergedRef.current) return;

    try {
        const base = GetConfiguration().getValue<string>('furnidata.url');

        if (!base || !base.length) return;

        const importedUrl = base.replace(/\/+$/, '') + '/custom/imported.jsonc';

        GetSessionDataManager()
            .mergeFurnitureDataFromUrl(importedUrl)
            .then((added) => {
                mergedRef.current = true;

                if (added && added.length) GetRoomContentLoader().processFurnitureData(added);
            })
            .catch(() => {});
    } catch {}
};

export const useCatalogEffects = (): void => {
    const queryClient = useQueryClient();
    const connectionState = useConnectionState();
    const { simpleAlert = null } = useNotification();
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const [catalogPlaceMultipleObjects, setCatalogPlaceMultipleObjectsPreference] = useCatalogPlaceMultipleItems();
    const importedFurnidataMerged = useRef(false);
    const wasAuthenticated = useRef(connectionState.authenticated);

    const isVisible = useCatalogStore((state) => state.isVisible);
    const currentType = useCatalogStore((state) => state.currentType);
    const pageId = useCatalogStore((state) => state.pageId);
    const pendingRequest = useCatalogStore((state) => state.pendingRequest);
    const pendingOfferId = useCatalogStore((state) => state.pendingOfferId);

    const indexQuery = useCatalogIndexQuery(currentType, isVisible);
    const pageQuery = useCatalogPageQuery(currentType, pageId, isVisible);

    // Bound in the render phase, not only in the effect below: store actions
    // invoked by child effects that commit in the same pass (e.g. a sibling
    // effect calling activateNode) must find the client before this hook's
    // own effect has had a chance to run. Idempotent - just replaces the
    // module-level reference, safe to call every render.
    bindCatalogQueryClient(queryClient);

    useEffect(() => {
        bindCatalogQueryClient(queryClient);

        return () => bindCatalogQueryClient(null);
    }, [queryClient]);

    useEffect(() => {
        useCatalogStore.getState().setRoomPreviewer(new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER));

        return () => {
            const previewer = useCatalogStore.getState().roomPreviewer;

            previewer?.dispose();
            useCatalogStore.getState().setRoomPreviewer(null);
        };
    }, []);

    useEffect(() => {
        useCatalogStore.getState().setCatalogPlaceMultipleObjects(catalogPlaceMultipleObjects);
    }, [catalogPlaceMultipleObjects]);

    useEffect(
        () =>
            useCatalogStore.subscribe((state, previous) => {
                if (state.catalogPlaceMultipleObjects !== previous.catalogPlaceMultipleObjects) setCatalogPlaceMultipleObjectsPreference(state.catalogPlaceMultipleObjects);
            }),
        [setCatalogPlaceMultipleObjectsPreference]
    );

    // Index prefetch on login, and cache drop on logout.
    //
    // Deviation from the brief: this is a transition, not a level check. The
    // brief's version calls dropCatalogCache() whenever authenticated is
    // false, including on first mount - which would wipe a cache seeded
    // before mount (as this file's own tests do) and any login prefetch
    // whenever the host mounts after authentication already happened.
    // Tracking the previous value lets drop fire only on true -> false, and
    // the idle prefetch fire whenever authenticated is true, mount included.
    useEffect(() => {
        const was = wasAuthenticated.current;

        wasAuthenticated.current = connectionState.authenticated;

        if (connectionState.authenticated) {
            scheduleWhenIdle(() => prefetchCatalogIndex(useCatalogStore.getState().currentType));

            return;
        }

        if (!was) return;

        dropCatalogCache();
        resetPlacedPurchaseSession();
    }, [connectionState.authenticated]);

    // Opening the catalog: imported furnidata.
    useEffect(() => {
        if (!isVisible) return;

        refreshImportedFurnidata(importedFurnidataMerged);
    }, [isVisible, currentType]);

    // Pending deep link and default first page, once the index is in cache.
    useEffect(() => {
        if (!indexQuery.data) return;

        useCatalogStore.getState().resolvePendingRequest();
    }, [indexQuery.data, isVisible, pendingRequest]);

    // Pending request stored while the index was missing: the query above is
    // enabled only while visible, and the store sets isVisible when it stores
    // the request, so the fetch starts on its own.

    // Page data arrival: front page items and the deep-linked offer.
    useEffect(() => {
        const data = pageQuery.data;

        if (!data || pageQuery.isPlaceholderData) return;

        if (data.frontPageItems.length) useCatalogStore.getState().setFrontPageItems(data.frontPageItems);

        useCatalogStore.getState().consumePendingOffer(data.page);
    }, [pageQuery.data, pageQuery.isPlaceholderData, pendingOfferId]);

    // Index refetched (publish, admin): keep the active path on the new tree.
    useEffect(() => {
        const data = indexQuery.data;

        if (!data) return;

        const { activeNodes, currentTab, pageId: activePageId } = useCatalogStore.getState();

        if (currentTab ? isNodeInTree(activeNodes.at(-1) ?? currentTab, data.rootNode) : activePageId <= -1) return;

        const restoredNodes = restoreCatalogActivePath(data.rootNode, activePageId);

        if (!restoredNodes.length)
        {
            useCatalogStore.setState({ currentTab: null, activeNodes: [], openNodes: [], pageId: -1, pageOverride: null, currentOffer: null, searchResult: null });
            useCatalogStore.getState().resolvePendingRequest();
        }
        else
        {
            const target = restoredNodes.at(-1);

            useCatalogStore.setState({
                currentTab: restoredNodes[0],
                activeNodes: restoredNodes,
                openNodes: [...restoredNodes.slice(1, -1), ...(target.isBranch && restoredNodes.length > 1 ? [target] : [])]
            });
        }
    }, [indexQuery.data]);

    useEffect(() => {
        const refresh = () => {
            useCatalogStore.getState().bumpLocalizationVersion();
            cloneCachedCatalogPages();
        };

        window.addEventListener('octane-localization-updated', refresh);

        return () => window.removeEventListener('octane-localization-updated', refresh);
    }, []);

    useMessageEvent<PurchaseOKMessageEvent>(PurchaseOKMessageEvent, (event) => {
        const { currentType: type, pageId: activePageId } = useCatalogStore.getState();

        const purchase = event.getParser().offer;
        const offerId = purchase?.offerId ?? 0;
        // A PurchaseOK without an offer answers a sold-out limited edition: nothing was bought.
        const soldOut = offerId <= 0;
        const forPlacedOffer = takePlacedPurchaseAnswer(soldOut ? null : offerId);

        DispatchUiEvent(new CatalogPurchasedEvent(purchase));

        if (activePageId > -1) invalidateCatalogPage(type, activePageId);

        if (!forPlacedOffer) return;

        if (soldOut) useCatalogStore.getState().resetPlacedOfferData();
        else markPlacedPurchaseBought();
    });

    // A dropped offer's purchase failed: PurchaseConfirmationDialog closes and the temporary object goes.
    const rollBackPlacedOffer = (message: string, title: string) => {
        simpleAlert?.(message, null, null, null, title);
        useCatalogStore.getState().resetPlacedOfferData();
    };

    useMessageEvent<PurchaseErrorMessageEvent>(PurchaseErrorMessageEvent, (event) => {
        const code = event.getParser().code;
        const forPlacedOffer = takePlacedPurchaseAnswer();

        DispatchUiEvent(new CatalogPurchaseFailureEvent(code));

        if (forPlacedOffer)
            rollBackPlacedOffer(
                LocalizeText(code > 0 ? `catalog.alert.purchaseerror.description.${code}` : 'catalog.alert.purchaseerror.description'),
                LocalizeText('catalog.alert.purchaseerror.title')
            );
    });

    useMessageEvent<PurchaseNotAllowedMessageEvent>(PurchaseNotAllowedMessageEvent, (event) => {
        const code = event.getParser().code;
        const forPlacedOffer = takePlacedPurchaseAnswer();

        DispatchUiEvent(new CatalogPurchaseNotAllowedEvent(code));

        if (forPlacedOffer)
            rollBackPlacedOffer(
                LocalizeText(code === 1 ? 'catalog.alert.purchasenotallowed.hc.description' : 'catalog.alert.purchasenotallowed.unknown.description'),
                LocalizeText('catalog.alert.purchasenotallowed.title')
            );
    });

    useMessageEvent<LimitedEditionSoldOutEvent>(LimitedEditionSoldOutEvent, () => {
        const { currentType: type, pageId: activePageId } = useCatalogStore.getState();
        const forPlacedOffer = takePlacedPurchaseAnswer();

        DispatchUiEvent(new CatalogPurchaseSoldOutEvent());

        if (activePageId > -1) invalidateCatalogPage(type, activePageId);

        if (forPlacedOffer) rollBackPlacedOffer(LocalizeText('catalog.alert.limited_edition_sold_out.message'), LocalizeText('catalog.alert.limited_edition_sold_out.title'));
    });

    // PurchaseConfirmationDialog.notEnoughCredits: the dialog stays and Buy works again.
    useMessageEvent<NotEnoughBalanceMessageEvent>(NotEnoughBalanceMessageEvent, (event) => {
        if (!takePlacedPurchaseAnswer()) return;

        const parser = event.getParser();

        releasePlacedOfferPurchase();
        simpleAlert?.(
            LocalizeText(parser.notEnoughCredits ? 'catalog.alert.notenough.credits.description' : 'catalog.alert.notenough.activitypoints.description'),
            null,
            null,
            null,
            LocalizeText(parser.notEnoughCredits ? 'catalog.alert.notenough.title' : 'catalog.alert.notenough.activitypoints.title')
        );
    });

    useMessageEvent<ProductOfferEvent>(ProductOfferEvent, (event) => {
        const offerData = event.getParser().offer;

        if (!offerData || !offerData.products.length) return;

        const offer = buildPurchasableOffer(offerData);

        if (!offer) return;

        const state = useCatalogStore.getState();
        const index = readCatalogIndex(state.currentType);
        const matchingNodes = getNodesByOfferIdFromMap(offer.offerId, index?.offersToNodes, true) || getNodesByOfferIdFromMap(offer.offerId, index?.offersToNodes);
        const referencePage = state.pageOverride ?? pageQuery.data?.page ?? null;

        if (matchingNodes?.length) {
            offer.page = new CatalogPage(
                matchingNodes[0].pageId,
                referencePage?.layoutCode || 'default_3x3',
                referencePage?.localization || new PageLocalization([], []),
                [],
                referencePage?.acceptSeasonCurrencyAsCredits || false,
                referencePage?.mode ?? CatalogPage.MODE_NORMAL
            );
        } else {
            offer.page = referencePage;
        }

        state.selectCatalogOffer(offer);
    });

    useMessageEvent<MarketplaceMakeOfferResult>(MarketplaceMakeOfferResult, (event) => {
        const parser = event.getParser();

        if (!parser || !simpleAlert) return;

        const title = LocalizeText(parser.result === 1 ? 'inventory.marketplace.result.title.success' : 'inventory.marketplace.result.title.failure');

        simpleAlert(LocalizeText(`inventory.marketplace.result.${parser.result}`), NotificationAlertType.DEFAULT, null, null, title);
    });

    useMessageEvent<CatalogPublishedMessageEvent>(CatalogPublishedMessageEvent, () => {
        importedFurnidataMerged.current = false;

        if (!connectionState.authenticated) return;

        invalidateCatalogIndex(useCatalogStore.getState().currentType);
        invalidateCatalogPages();
    });

    useMessageEvent<UserPermissionsEvent>(UserPermissionsEvent, () =>
    {
        invalidateCatalogIndex(CatalogType.NORMAL);
        invalidateCatalogPages();
    });

    useUiEvent<CatalogPurchasedEvent>(CatalogPurchasedEvent.PURCHASE_SUCCESS, () => PlaySound(SoundNames.CREDITS));

    useOctaneEvent<RoomEngineObjectPlacedEvent>(RoomEngineObjectPlacedEvent.PLACED, (event) => {
        const state = useCatalogStore.getState();

        if (!state.objectMoverRequested || event.type !== RoomEngineObjectPlacedEvent.PLACED) return;

        // The catalog mover runs as -offerId; anything else was not placed from the catalog.
        if (state.purchasableOffer && event.objectId !== -state.purchasableOffer.offerId) return;

        state.resetPlacedOfferData(true);

        const purchasableOffer = state.purchasableOffer;

        if (!purchasableOffer) {
            state.resetObjectMover();

            return;
        }

        const product = purchasableOffer.product;
        let placed = false;

        if (event.category === RoomObjectCategory.WALL) {
            switch (product.furnitureData.className) {
                case 'floor':
                case 'wallpaper':
                case 'landscape':
                    placed = event.placedOnFloor || event.placedOnWall;
                    break;
                default:
                    placed = event.placedInRoom;
                    break;
            }
        } else {
            placed = event.placedInRoom;
        }

        if (!placed) {
            state.resetObjectMover();

            return;
        }

        state.setPlacedObjectPurchaseData(
            new PlacedObjectPurchaseData(event.roomId, event.objectId, event.category, event.wallLocation, event.x, event.y, event.direction, purchasableOffer, state.pageId)
        );

        switch (state.currentType) {
            case CatalogType.NORMAL: {
                switch (event.category) {
                    case RoomObjectCategory.FLOOR:
                        GetRoomEngine().addFurnitureFloor(
                            event.roomId,
                            event.objectId,
                            product.productClassId,
                            new Vector3d(event.x, event.y, event.z),
                            new Vector3d(event.direction),
                            0,
                            new LegacyDataType()
                        );
                        break;
                    case RoomObjectCategory.WALL: {
                        switch (product.furnitureData.className) {
                            case 'floor':
                            case 'wallpaper':
                            case 'landscape':
                                state.resetRoomPaint(product.furnitureData.className, product.extraParam);
                                break;
                            default:
                                GetRoomEngine().addFurnitureWall(
                                    event.roomId,
                                    event.objectId,
                                    product.productClassId,
                                    new Vector3d(event.x, event.y, event.z),
                                    new Vector3d(event.direction * 45),
                                    0,
                                    event.instanceData,
                                    0
                                );
                                break;
                        }
                    }
                }

                const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

                if (roomObject) roomObject.model.setValue(RoomObjectVariable.FURNITURE_ALPHA_MULTIPLIER, 0.5);

                if (catalogSkipPurchaseConfirmation && !(product && product.isUniqueLimitedItem)) {
                    const placed = useCatalogStore.getState().placedObjectPurchaseData;

                    if (claimPlacedOfferPurchase(placed)) SendMessageComposer(new PurchaseFromCatalogComposer(placed.pageId, purchasableOffer.offerId, product.extraParam, 1));
                }

                if (state.catalogPlaceMultipleObjects) state.requestOfferToMover(purchasableOffer);
                break;
            }
        }
    });

    // HabboCatalog.itemAddedToInventory places the bought item on the dropped spot. Here the item
    // must be one the server announced as new during this attempt and whose inventory data shows
    // the drop's product; see useCatalogPlacedOffer.
    useMessageEvent<UnseenItemsEvent>(UnseenItemsEvent, (event) => recordPlacedPurchaseUnseen(event.getParser().getItemsByCategory(UnseenItemCategory.FURNI)));

    useMessageEvent<FurnitureListAddOrUpdateEvent>(FurnitureListAddOrUpdateEvent, (event) => recordPlacedPurchaseItems(event.getParser().items));

    useMessageEvent<FurnitureListEvent>(FurnitureListEvent, (event) => {
        const parser = event.getParser();

        recordPlacedPurchaseListFragment(parser.totalFragments, parser.fragmentNumber, parser.fragment.values());
    });

    useMessageEvent<FurnitureListInvalidateEvent>(FurnitureListInvalidateEvent, () => recordPlacedPurchaseInvalidated());
};

const isNodeInTree = (node: ICatalogNode | null, root: ICatalogNode): boolean => {
    let current: ICatalogNode | null = node;

    while (current) {
        if (current === root) return true;

        current = current.parent;
    }

    return false;
};

export const CatalogEffectsHost: FC = () => {
    useCatalogEffects();

    return null;
};
