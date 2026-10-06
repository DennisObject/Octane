import {
    GetMarketplaceItemStatsComposer,
    MakeMultipleOffersMessageComposer,
    MarketplaceItemStatsEvent,
    MarketplaceItemStatsParser
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FurnitureItem, LocalizeText, ProductTypeEnum, SendMessageComposer } from '../../../../../../api';
import { LayoutFurniImageView, OctaneCardHeaderView, OctaneCardView } from '../../../../../../common';
import { CatalogPostMarketplaceOfferEvent } from '../../../../../../events';
import { useMarketplaceConfiguration, useMessageEvent, useNotification, useUiEvent } from '../../../../../../hooks';
import { OctaneButton } from '../../../../../../layout';

const DEFAULT_BULK_OFFER_LIMIT = 500;

interface V75MarketplaceItemStats {
    averagePrice: number;
    historyLength: number;
    lowestPrice: number;
    suggestedPrice: number;
}

interface V75MarketplaceCommission {
    commissionPercentage: number;
    commissionDivisor: number;
}

export const MarketplacePostOfferView: FC<{}> = () => {
    const [item, setItem] = useState<FurnitureItem>(null);
    const [itemIds, setItemIds] = useState<number[]>([]);
    const [priceText, setPriceText] = useState('');
    const [amountText, setAmountText] = useState('1');
    const [itemStats, setItemStats] = useState<V75MarketplaceItemStats>(null);
    const { data: marketplaceConfiguration = null } = useMarketplaceConfiguration({ enabled: !!item });
    const { showConfirm = null } = useNotification();

    useUiEvent<CatalogPostMarketplaceOfferEvent>(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE, (event) => {
        setItem(event.item);
        setItemIds(event.itemIds);
        setPriceText('');
        setAmountText('1');
        setItemStats(null);
    });

    useMessageEvent<MarketplaceItemStatsEvent>(MarketplaceItemStatsEvent, (event) => {
        const parser = event.getParser() as MarketplaceItemStatsParser & Partial<Pick<V75MarketplaceItemStats, 'lowestPrice' | 'suggestedPrice'>>;

        if (!item || parser.furniTypeId !== item.type || parser.furniCategoryId !== (item.isWallItem ? 2 : 1)) return;

        setItemStats({
            averagePrice: parser.averagePrice,
            historyLength: parser.historyLength,
            lowestPrice: parser.lowestPrice ?? 0,
            suggestedPrice: parser.suggestedPrice ?? 0
        });
    });

    useEffect(() => {
        if (!item) return;

        SendMessageComposer(new GetMarketplaceItemStatsComposer(item.isWallItem ? 2 : 1, item.type));

        return () => {
            setPriceText('');
            setAmountText('1');
            setItemStats(null);
        };
    }, [item]);

    if (!item || !marketplaceConfiguration) return null;

    const minimumPrice = marketplaceConfiguration.minimumPrice;
    const maximumPrice = marketplaceConfiguration.maximumPrice;
    const maxAmount = Math.max(1, Math.min(itemIds.length, DEFAULT_BULK_OFFER_LIMIT));

    const askingPrice = parseInt(priceText);
    const amount = parseInt(amountText);
    const isPriceValid = !isNaN(askingPrice) && askingPrice >= minimumPrice && askingPrice <= maximumPrice;
    const isAmountValid = !isNaN(amount) && amount >= 1 && amount <= maxAmount;

    const furniTitle = LocalizeText(item.isWallItem ? 'wallItem.name.' + item.type : 'roomItem.name.' + item.type);
    const v75Configuration = marketplaceConfiguration as typeof marketplaceConfiguration & Partial<V75MarketplaceCommission>;
    const commissionPercentage = v75Configuration.commissionPercentage ?? marketplaceConfiguration.commission;
    const commissionDivisor = v75Configuration.commissionDivisor ?? 0;
    const commissionRate = commissionPercentage / 100 + (commissionDivisor > 0 ? (0.5 * askingPrice) / commissionDivisor : 0);
    const commission = Math.ceil(Math.round(1000 * askingPrice * commissionRate) / 1000);
    const revenue = askingPrice - commission;
    const suggestedPrice = itemStats?.suggestedPrice ?? 0;

    const close = () => setItem(null);

    const postItem = () => {
        if (!isPriceValid || !isAmountValid) return;

        const ids = itemIds.slice(0, amount);

        let submitted = false;

        showConfirm(
            amount > 1
                ? LocalizeText(
                      'inventory.marketplace.confirm_offer.info.multiple',
                      ['amount', 'furniname', 'price', 'total'],
                      [amount.toString(), furniTitle, askingPrice.toString(), (revenue * amount).toString()]
                  )
                : LocalizeText('inventory.marketplace.confirm_offer.info', ['furniname', 'price'], [furniTitle, revenue.toString()]),
            () => {
                if (submitted) return;

                submitted = true;
                SendMessageComposer(new MakeMultipleOffersMessageComposer(askingPrice, item.isWallItem ? 2 : 1, ids));
            },
            null,
            null,
            null,
            LocalizeText('inventory.marketplace.confirm_offer.title')
        );

        close();
    };

    const infoText = isNaN(askingPrice)
        ? LocalizeText('shop.marketplace.invalid.price', ['minPrice', 'maxPrice'], [minimumPrice.toString(), maximumPrice.toString()])
        : `${LocalizeText('sell.in.marketplace.revenue.label')}: ${revenue}`;

    return (
        <OctaneCardView className="octane-market-offer" frameStyle={3} isResizable={false} offsetTop={-36} uniqueKey="marketplace-offer">
            <OctaneCardHeaderView headerText={LocalizeText('inventory.marketplace.make_offer.title')} onCloseClick={close} />
            <div className="octane-market-offer-body">
                <div className="octane-market-offer-image">
                    <LayoutFurniImageView
                        extraData={item.extra.toString()}
                        productClassId={item.type}
                        productType={item.isWallItem ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                    />
                </div>
                <div className="octane-market-offer-name">{furniTitle}</div>
                <div className="octane-market-offer-expiration">
                    {LocalizeText('inventory.marketplace.make_offer.expiration_info_days', ['days'], [String(Math.round((marketplaceConfiguration?.offerTime ?? 48) / 24))])}
                </div>
                <div className="octane-market-offer-label is-price">{LocalizeText('inventory.marketplace.make_offer.price_request')}</div>
                <div className="octane-market-offer-field is-price">
                    <input inputMode="numeric" value={priceText} onChange={(event) => setPriceText(event.target.value.replace(/\D/g, '').slice(0, 8))} />
                </div>
                <div className="octane-market-offer-label is-amount">{LocalizeText('sellinmarketplace.amount', ['max_amount'], [maxAmount.toString()])}</div>
                <div className="octane-market-offer-field is-amount">
                    <input
                        inputMode="numeric"
                        value={amountText}
                        onChange={(event) => setAmountText(event.target.value.replace(/\D/g, ''))}
                        onBlur={() => setAmountText(String(isNaN(amount) ? 1 : Math.max(1, Math.min(amount, maxAmount))))}
                    />
                </div>
                <div className="octane-market-offer-list">
                    {!!itemStats?.averagePrice && itemStats.historyLength > 0 && (
                        <div>{LocalizeText('inventory.marketplace.make_offer.average_price', ['days', 'price'], [itemStats.historyLength.toString(), itemStats.averagePrice.toString()])}</div>
                    )}
                    {!!itemStats?.lowestPrice && (
                        <div>{LocalizeText('inventory.marketplace.make_offer.lowest_price', ['price'], [itemStats.lowestPrice.toString()])}</div>
                    )}
                    {!!suggestedPrice && (
                        <>
                            <div>{LocalizeText('inventory.marketplace.make_offer.suggested_price', ['price'], [suggestedPrice.toString()])}</div>
                            <OctaneButton
                                className="octane-market-offer-copy"
                                onClick={() => {
                                    setPriceText(suggestedPrice.toString());
                                    navigator.clipboard?.writeText(suggestedPrice.toString()).catch(() => undefined);
                                }}
                            >
                                {LocalizeText('inventory.marketplace.make_offer.copy_suggested_price')}
                            </OctaneButton>
                        </>
                    )}
                    <div className="octane-market-offer-final">{infoText}</div>
                    <div className="octane-market-offer-buttons">
                        <OctaneButton className="octane-market-offer-post" disabled={!isPriceValid || !isAmountValid} onClick={postItem}>
                            {LocalizeText('inventory.marketplace.make_offer.post')}
                        </OctaneButton>
                        <OctaneButton className="octane-market-offer-cancel" onClick={close}>
                            {LocalizeText('inventory.marketplace.make_offer.cancel')}
                        </OctaneButton>
                    </div>
                </div>
            </div>
        </OctaneCardView>
    );
};
