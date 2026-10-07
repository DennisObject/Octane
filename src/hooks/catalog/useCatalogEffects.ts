import {
    CatalogPublishedMessageEvent,
    FurnitureListAddOrUpdateEvent,
    FurnitureListComposer,
    FurnitureListEvent,
    FurnitureListInvalidateEvent,
    FurnitureListItemParser,
    FurniturePlaceComposer,
    FurniturePlacePaintComposer,
    GetConfiguration,
    GetRoomContentLoader,
    GetRoomEngine,
    GetSessionDataManager,
    LegacyDataType,
    LimitedEditionSoldOutEvent,
    MarketplaceMakeOfferResult,
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
import { claimPlacedOfferPurchase } from './useCatalogPlacedOffer';
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

        if (was) dropCatalogCache();
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

        const { activeNodes, pageId: activePageId } = useCatalogStore.getState();

        if (activePageId > -1 && (!activeNodes.length || activeNodes.at(-1).pageId !== activePageId || !isNodeInTree(activeNodes.at(-1) ?? null, data.rootNode))) {
            const restoredNodes = restoreCatalogActivePath(data.rootNode, activePageId);

            if (!restoredNodes.length)
            {
                useCatalogStore.setState({ activeNodes: [], pageId: -1, pageOverride: null, currentOffer: null, searchResult: null });
                useCatalogStore.getState().resolvePendingRequest();
            }
            else
            {
                useCatalogStore.setState({ activeNodes: restoredNodes });
            }
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

        DispatchUiEvent(new CatalogPurchasedEvent(purchase));

        if (activePageId > -1) invalidateCatalogPage(type, activePageId);

        const { placedObjectPurchaseData, placedObjectPurchaseSent } = useCatalogStore.getState();

        if (!placedObjectPurchaseSent || !placedObjectPurchaseData || purchase?.offerId !== placedObjectPurchaseData.offerId) return;

        getPlacedPurchaseState(placedObjectPurchaseData).bought = true;

        resolvePlacedPurchase();
    });

    useMessageEvent<PurchaseErrorMessageEvent>(PurchaseErrorMessageEvent, (event) => {
        DispatchUiEvent(new CatalogPurchaseFailureEvent(event.getParser().code));
    });

    useMessageEvent<PurchaseNotAllowedMessageEvent>(PurchaseNotAllowedMessageEvent, (event) => {
        DispatchUiEvent(new CatalogPurchaseNotAllowedEvent(event.getParser().code));
    });

    useMessageEvent<LimitedEditionSoldOutEvent>(LimitedEditionSoldOutEvent, () => {
        const { currentType: type, pageId: activePageId } = useCatalogStore.getState();

        DispatchUiEvent(new CatalogPurchaseSoldOutEvent());

        if (activePageId > -1) invalidateCatalogPage(type, activePageId);
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
    // must be one the server announced as new after Buy and whose inventory data shows this drop's
    // product; it is placed once, after this drop's own PurchaseOK.
    useMessageEvent<UnseenItemsEvent>(UnseenItemsEvent, (event) => {
        const purchaseState = getSentPurchaseState();

        if (!purchaseState) return;

        for (const itemId of event.getParser().getItemsByCategory(UnseenItemCategory.FURNI) ?? []) purchaseState.unseenIds.add(itemId);

        resolvePlacedPurchase();
    });

    useMessageEvent<FurnitureListAddOrUpdateEvent>(FurnitureListAddOrUpdateEvent, (event) => {
        const purchaseState = getSentPurchaseState();

        if (!purchaseState) return;

        recordInventoryItems(purchaseState, event.getParser().items);
        resolvePlacedPurchase();
    });

    useMessageEvent<FurnitureListEvent>(FurnitureListEvent, (event) => {
        const purchaseState = getSentPurchaseState();

        if (!purchaseState) return;

        const parser = event.getParser();

        recordInventoryItems(purchaseState, parser.fragment.values());

        if (purchaseState.listRequested && parser.fragmentNumber === parser.totalFragments - 1) purchaseState.listLoaded = true;

        resolvePlacedPurchase();
    });

    useMessageEvent<FurnitureListInvalidateEvent>(FurnitureListInvalidateEvent, () => {
        const purchaseState = getSentPurchaseState();

        if (!purchaseState) return;

        purchaseState.invalidated = true;

        resolvePlacedPurchase();
    });
};

interface PlacedPurchaseState {
    data: PlacedObjectPurchaseData;
    bought: boolean;
    unseenIds: Set<number>;
    spriteIds: Map<number, number>;
    listRequested: boolean;
    listLoaded: boolean;
    invalidated: boolean;
}

let placedPurchaseState: PlacedPurchaseState = null;

const getPlacedPurchaseState = (data: PlacedObjectPurchaseData): PlacedPurchaseState => {
    if (!placedPurchaseState || placedPurchaseState.data !== data)
        placedPurchaseState = { data, bought: false, unseenIds: new Set(), spriteIds: new Map(), listRequested: false, listLoaded: false, invalidated: false };

    return placedPurchaseState;
};

// Packets only count while this drop's purchase is in flight.
const getSentPurchaseState = (): PlacedPurchaseState => {
    const { placedObjectPurchaseData, placedObjectPurchaseSent } = useCatalogStore.getState();

    if (!placedObjectPurchaseSent || !placedObjectPurchaseData) return null;

    return getPlacedPurchaseState(placedObjectPurchaseData);
};

const recordInventoryItems = (purchaseState: PlacedPurchaseState, items: Iterable<FurnitureListItemParser>) => {
    // Owned items are recorded too; only ids announced as new are ever matched.
    for (const item of items) purchaseState.spriteIds.set(item.itemId, item.spriteId);
};

// The bought item is placed when exactly one announced item is this product. When the announced
// items are unknown the inventory list is asked for once; anything still unresolved, or two
// matching items, leaves the item in the inventory and retires the temporary object.
const resolvePlacedPurchase = () => {
    const purchaseState = getSentPurchaseState();

    if (!purchaseState || !purchaseState.bought) return;

    const placed = purchaseState.data;
    const announced = [...purchaseState.unseenIds];
    const matches = announced.filter((itemId) => purchaseState.spriteIds.get(itemId) === placed.productClassId);
    const unknown = announced.filter((itemId) => !purchaseState.spriteIds.has(itemId));

    if (matches.length > 1) {
        useCatalogStore.getState().resetPlacedOfferData();

        return;
    }

    // An announced item missing from the loaded inventory cannot be the product.
    if (matches.length === 1 && (!unknown.length || purchaseState.listLoaded)) {
        placeBoughtItem(placed, matches[0]);

        return;
    }

    if (unknown.length && !purchaseState.listRequested) {
        purchaseState.listRequested = true;

        SendMessageComposer(new FurnitureListComposer());

        return;
    }

    const exhausted = announced.length ? !unknown.length || purchaseState.listLoaded : purchaseState.invalidated;

    if (exhausted) useCatalogStore.getState().resetPlacedOfferData();
};

const placeBoughtItem = (placed: PlacedObjectPurchaseData, itemId: number) => {
    const state = useCatalogStore.getState();
    const roomEngine = GetRoomEngine();

    if (state.placedObjectPurchaseData !== placed) return;

    // The room was left; the item stays in the inventory.
    if (placed.roomId !== roomEngine.activeRoomId) {
        state.resetPlacedOfferData();

        return;
    }

    const roomId = roomEngine.activeRoomId;

    switch (placed.furniData?.className) {
        case 'floor':
            if (placed.extraParam !== roomEngine.getRoomInstanceVariable(roomId, RoomObjectVariable.ROOM_FLOOR_TYPE)) SendMessageComposer(new FurniturePlacePaintComposer(itemId));
            break;
        case 'wallpaper':
            if (placed.extraParam !== roomEngine.getRoomInstanceVariable(roomId, RoomObjectVariable.ROOM_WALL_TYPE)) SendMessageComposer(new FurniturePlacePaintComposer(itemId));
            break;
        case 'landscape':
            if (placed.extraParam !== roomEngine.getRoomInstanceVariable(roomId, RoomObjectVariable.ROOM_LANDSCAPE_TYPE)) SendMessageComposer(new FurniturePlacePaintComposer(itemId));
            break;
        default:
            SendMessageComposer(new FurniturePlaceComposer(itemId, placed.category, placed.wallLocation, placed.x, placed.y, placed.direction));
            break;
    }

    placedPurchaseState = null;

    if (state.catalogPlaceMultipleObjects) state.setPlacedObjectPurchaseSent(false);
    else state.resetPlacedOfferData();
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
