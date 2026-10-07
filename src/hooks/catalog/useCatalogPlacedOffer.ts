import { useShallow } from 'zustand/react/shallow';
import { useCatalogStore } from './catalogStore';

/** The catalog offer dropped in the room and waiting for its purchase confirmation. */
export const useCatalogPlacedOffer = () =>
    useCatalogStore(
        useShallow((state) => ({
            placedObjectPurchaseData: state.placedObjectPurchaseData,
            currentType: state.currentType,
            pageId: state.pageId
        }))
    );
