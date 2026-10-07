import { FurnitureListComposer, FurnitureListItemParser, FurniturePlaceComposer, FurniturePlacePaintComposer, GetRoomEngine, RoomObjectVariable } from '@octane/renderer';
import { useShallow } from 'zustand/react/shallow';
import { GetRoomSession, PlacedObjectPurchaseData, SendMessageComposer } from '../../api';
import { useCatalogStore } from './catalogStore';

// How long a purchase may stay unanswered, and a bought item unidentified, before the temporary
// object is retired. A bought item stays in the inventory either way.
const PURCHASE_ANSWER_WAIT_MS = 30000;
const BOUGHT_ITEM_WAIT_MS = 10000;

/** One Buy of a dropped offer, from the purchase request to the placement of the bought item. */
interface PlacedPurchaseAttempt {
    data: PlacedObjectPurchaseData;
    answered: boolean;
    bought: boolean;
    placed: boolean;
    // Started after an attempt was dropped unanswered; its answers cannot be told apart.
    ambiguous: boolean;
    unseenIds: Set<number>;
    spriteIds: Map<number, number>;
    listRequested: boolean;
    listFragments: Set<number>;
    listTotal: number;
    invalidated: boolean;
    timer: ReturnType<typeof setTimeout>;
}

let attempt: PlacedPurchaseAttempt = null;
// Set once an attempt is dropped before its answer came, or bought but never placed while no new
// item was announced for it. Purchase answers and item notices carry no request id, so its answer
// or item may still arrive; for the rest of the session no bought item is placed automatically.
let placementTainted = false;

/** The catalog offer dropped in the room and waiting for its purchase confirmation. */
export const useCatalogPlacedOffer = () =>
    useCatalogStore(
        useShallow((state) => ({
            placedObjectPurchaseData: state.placedObjectPurchaseData,
            placedObjectPurchaseSent: state.placedObjectPurchaseSent,
            placedObjectPurchaseBought: state.placedObjectPurchaseBought,
            currentType: state.currentType
        }))
    );

// Drops the attempt once its drop is gone or its purchase is no longer out.
const syncAttempt = () => {
    if (!attempt) return;

    const { placedObjectPurchaseData, placedObjectPurchaseSent } = useCatalogStore.getState();

    if (placedObjectPurchaseData === attempt.data && placedObjectPurchaseSent) return;

    if (!attempt.answered || (attempt.bought && !attempt.placed && !attempt.unseenIds.size)) placementTainted = true;

    clearTimeout(attempt.timer);
    attempt = null;
};

const getSentAttempt = () => {
    syncAttempt();

    return attempt;
};

/** Starts a new purchase attempt for this drop; false when it is no longer the drop or a purchase is out. */
export const claimPlacedOfferPurchase = (placedObjectPurchaseData: PlacedObjectPurchaseData) => {
    const state = useCatalogStore.getState();

    if (!placedObjectPurchaseData || state.placedObjectPurchaseData !== placedObjectPurchaseData || state.placedObjectPurchaseSent) return false;

    syncAttempt();
    state.setPlacedObjectPurchaseSent(true);

    attempt = {
        data: placedObjectPurchaseData,
        answered: false,
        bought: false,
        placed: false,
        ambiguous: placementTainted,
        unseenIds: new Set(),
        spriteIds: new Map(),
        listRequested: false,
        listFragments: new Set(),
        listTotal: 0,
        invalidated: false,
        timer: null
    };

    const current = attempt;

    current.timer = setTimeout(() => {
        if (getSentAttempt() === current && !current.answered) retirePlacedOffer();
    }, PURCHASE_ANSWER_WAIT_MS);

    return true;
};

/** A new connection starts a new session: nothing is owed and placement is trusted again. */
export const resetPlacedPurchaseSession = () => {
    if (attempt) clearTimeout(attempt.timer);

    attempt = null;
    placementTainted = false;

    if (useCatalogStore.getState().placedObjectPurchaseData) useCatalogStore.getState().resetPlacedOfferData(true);
};

/**
 * Takes one purchase answer (ok, error, not allowed, sold out or not enough balance); true when
 * it is taken as the current drop's answer. Only a PurchaseOK names its offer; one for another
 * offer is not this drop's answer.
 */
export const takePlacedPurchaseAnswer = (offerId: number = null) => {
    const current = getSentAttempt();

    if (!current || current.answered) return false;

    if (offerId !== null && offerId !== current.data.offerId) return false;

    current.answered = true;
    clearTimeout(current.timer);

    return true;
};

/** The purchase came back unpaid; the dialog may send it again as a new attempt. */
export const releasePlacedOfferPurchase = () => {
    useCatalogStore.getState().setPlacedObjectPurchaseSent(false);
    syncAttempt();
};

/** The current drop's purchase went through; the bought item is placed once it is known. */
export const markPlacedPurchaseBought = () => {
    const current = getSentAttempt();

    if (!current) return;

    useCatalogStore.getState().setPlacedObjectPurchaseBought(true);

    if (current.ambiguous) {
        retirePlacedOffer();

        return;
    }

    current.bought = true;
    current.timer = setTimeout(() => {
        if (getSentAttempt() === current) retirePlacedOffer();
    }, BOUGHT_ITEM_WAIT_MS);

    resolvePlacedPurchase();
};

export const recordPlacedPurchaseUnseen = (itemIds: number[]) => {
    const current = getSentAttempt();

    if (!current || !itemIds) return;

    for (const itemId of itemIds) current.unseenIds.add(itemId);

    resolvePlacedPurchase();
};

export const recordPlacedPurchaseItems = (items: Iterable<FurnitureListItemParser>) => {
    const current = getSentAttempt();

    if (!current) return;

    // Owned items are recorded too; only ids announced as new are ever matched.
    for (const item of items) current.spriteIds.set(item.itemId, item.spriteId);

    resolvePlacedPurchase();
};

export const recordPlacedPurchaseListFragment = (totalFragments: number, fragmentNumber: number, items: Iterable<FurnitureListItemParser>) => {
    const current = getSentAttempt();

    if (!current) return;

    if (current.listRequested) {
        current.listTotal = totalFragments;
        current.listFragments.add(fragmentNumber);
    }

    recordPlacedPurchaseItems(items);
};

export const recordPlacedPurchaseInvalidated = () => {
    const current = getSentAttempt();

    if (!current) return;

    current.invalidated = true;

    resolvePlacedPurchase();
};

// The item stays in the inventory; only the temporary object goes.
const retirePlacedOffer = () => {
    useCatalogStore.getState().resetPlacedOfferData();
    syncAttempt();
};

// The bought item is placed when exactly one announced item is this product. When the announced
// items are unknown the inventory list is asked for once; anything still unresolved, or two
// matching items, leaves the item in the inventory and retires the temporary object.
const resolvePlacedPurchase = () => {
    const current = getSentAttempt();

    if (!current || !current.bought) return;

    const placed = current.data;
    const announced = [...current.unseenIds];
    const matches = announced.filter((itemId) => current.spriteIds.get(itemId) === placed.productClassId);
    const unknown = announced.filter((itemId) => !current.spriteIds.has(itemId));
    const listLoaded = current.listRequested && current.listTotal > 0 && current.listFragments.size >= current.listTotal;

    if (matches.length > 1) {
        retirePlacedOffer();

        return;
    }

    // An announced item missing from the complete inventory list cannot be the product.
    if (matches.length === 1 && (!unknown.length || listLoaded)) {
        placeBoughtItem(current, matches[0]);

        return;
    }

    if (unknown.length && !current.listRequested) {
        current.listRequested = true;

        SendMessageComposer(new FurnitureListComposer());

        return;
    }

    const exhausted = announced.length ? !unknown.length || listLoaded : current.invalidated;

    if (exhausted) retirePlacedOffer();
};

const placeBoughtItem = (current: PlacedPurchaseAttempt, itemId: number) => {
    const state = useCatalogStore.getState();
    const roomEngine = GetRoomEngine();
    const placed = current.data;

    // The room was left; the item stays in the inventory. The engine keeps its last room id on
    // the hotel view, so the room session decides.
    if (placed.roomId !== roomEngine.activeRoomId || GetRoomSession()?.roomId !== placed.roomId) {
        retirePlacedOffer();

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

    current.placed = true;

    if (state.catalogPlaceMultipleObjects) state.setPlacedObjectPurchaseSent(false);
    else state.resetPlacedOfferData();

    syncAttempt();
};
