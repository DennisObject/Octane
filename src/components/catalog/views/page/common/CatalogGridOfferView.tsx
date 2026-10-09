import { FC } from 'react';
import { IPurchasableOffer } from '../../../../../api';
import { LayoutGridItemProps } from '../../../../../common';
import { useCatalogActions } from '../../../../../hooks';
import { CatalogOfferTileView } from './CatalogOfferTileView';

interface CatalogGridOfferViewProps extends LayoutGridItemProps {
    offer: IPurchasableOffer;
    selectOffer: (offer: IPurchasableOffer) => void;
    tintColor?: string;
    showTechnicalDetails?: boolean;
    showPrices?: boolean;
}

export const CatalogGridOfferView: FC<CatalogGridOfferViewProps> = (props) => {
    const { requestOfferToMover = null } = useCatalogActions();

    return (
        <CatalogOfferTileView {...props} requestOfferToMover={requestOfferToMover} />
    );
};
