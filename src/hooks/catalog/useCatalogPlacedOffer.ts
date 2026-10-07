import { useShallow } from 'zustand/react/shallow';
import { PlacedObjectPurchaseData } from '../../api';
import { useCatalogStore } from './catalogStore';

/** The catalog offer dropped in the room and waiting for its purchase confirmation. */
export const useCatalogPlacedOffer = () =>
    useCatalogStore(
        useShallow((state) => ({
            placedObjectPurchaseData: state.placedObjectPurchaseData,
            placedObjectPurchaseSent: state.placedObjectPurchaseSent,
            currentType: state.currentType
        }))
    );

/** Marks the purchase of this drop as sent; false when it is no longer the drop or was already sent. */
export const claimPlacedOfferPurchase = (placedObjectPurchaseData: PlacedObjectPurchaseData) => {
    const state = useCatalogStore.getState();

    if (!placedObjectPurchaseData || state.placedObjectPurchaseData !== placedObjectPurchaseData || state.placedObjectPurchaseSent) return false;

    state.setPlacedObjectPurchaseSent(true);

    return true;
};

/** The purchase came back unpaid; the dialog may send it again. */
export const releasePlacedOfferPurchase = () => useCatalogStore.getState().setPlacedObjectPurchaseSent(false);
