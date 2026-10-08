import { CatalogPageMessageOfferData } from '@octane/renderer';
import { FC, useCallback } from 'react';
import { LocalizeText, ProductImageUtility } from '../../../../../../api';
import { LayoutImage } from '../../../../../../common';

export interface VipGiftItemViewProps {
    offer: CatalogPageMessageOfferData;
    isAvailable: boolean;
    isVip?: boolean;
    requirementText?: string;
    onSelect(localizationId: string): void;
}

export const VipGiftItem: FC<VipGiftItemViewProps> = (props) => {
    const { offer = null, isAvailable = false, isVip = false, requirementText = '', onSelect = null } = props;

    const getImageUrlForOffer = useCallback(() => {
        if (!offer || !offer.products.length) return '';

        const productData = offer.products[0];

        return ProductImageUtility.getProductImageUrl(productData.productType, productData.furniClassId, productData.extraParam);
    }, [offer]);

    const getItemTitle = useCallback(() => {
        if (!offer || !offer.products.length) return '';

        const productData = offer.products[0];

        const localizationKey =
            ProductImageUtility.getProductCategory(productData.productType, productData.furniClassId) === 2
                ? 'wallItem.name.' + productData.furniClassId
                : 'roomItem.name.' + productData.furniClassId;

        return LocalizeText(localizationKey);
    }, [offer]);

    const getItemDesc = useCallback(() => {
        if (!offer || !offer.products.length) return '';

        const productData = offer.products[0];

        const localizationKey =
            ProductImageUtility.getProductCategory(productData.productType, productData.furniClassId) === 2
                ? 'wallItem.desc.' + productData.furniClassId
                : 'roomItem.desc.' + productData.furniClassId;

        return LocalizeText(localizationKey);
    }, [offer]);

    const description = getItemDesc();

    // Official club_gift_list_item: image box left, name / description / requirement stacked beside it,
    // Select bottom right (enabled only while this gift can be chosen), VIP mark in the corner.
    return (
        <div className="octane-catalog-club-gift">
            <div className="octane-catalog-club-gift-image">
                <LayoutImage imageUrl={getImageUrlForOffer()} />
            </div>
            {isVip && <span aria-hidden="true" className="octane-club-compact-mark is-vip octane-catalog-club-gift-vip" />}
            <div className="octane-catalog-club-gift-name">{getItemTitle()}</div>
            {!!description && <div className="octane-catalog-club-gift-desc">{description}</div>}
            {!!requirementText && <div className="octane-catalog-club-gift-requirement">{requirementText}</div>}
            <button
                aria-disabled={!isAvailable}
                className="octane-catalog-standard-button octane-catalog-club-gift-select"
                disabled={!isAvailable}
                type="button"
                onClick={() => {
                    if (!isAvailable) return;

                    onSelect(offer.localizationId);
                }}
            >
                {LocalizeText('catalog.club_gift.select')}
            </button>
        </div>
    );
};
