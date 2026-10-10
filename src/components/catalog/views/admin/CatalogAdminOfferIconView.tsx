import { FC } from 'react';
import { IPurchasableOffer } from '../../../../api';

interface CatalogAdminOfferIconViewProps {
    offer: IPurchasableOffer;
    url: string | null;
}

/** Furni icon of an offer; falls back to the product's own icon and hides itself when both fail. */
export const CatalogAdminOfferIconView: FC<CatalogAdminOfferIconViewProps> = ({ offer, url }) => {
    if (!url) return null;

    return (
        <img
            alt=""
            className="volt-catalog-admin-offer-icon"
            draggable={false}
            src={url}
            onError={(event) => {
                const fallback = typeof offer.product?.getIconUrl === 'function' ? offer.product.getIconUrl(offer) : null;

                if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
                else event.currentTarget.style.visibility = 'hidden';
            }}
        />
    );
};
