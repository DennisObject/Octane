import {
    GetMarketplaceItemStatsComposer,
    MakeOfferMessageComposer,
    MarketplaceItemStatsEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FurnitureItem, LocalizeText, ProductTypeEnum, SendMessageComposer } from '../../../../../../api';
import { LayoutFurniImageView, OctaneCardHeaderView, OctaneCardView } from '../../../../../../common';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { CatalogPostMarketplaceOfferEvent } from '../../../../../../events';
import { useMarketplaceConfiguration, useMessageEvent, useNotification, useUiEvent } from '../../../../../../hooks';
import { OctaneButton } from '../../../../../../layout';

const DEFAULT_BULK_OFFER_LIMIT = 500;

interface MarketplaceItemStats {
    averagePrice: number;
    historyLength: number;
    lowestCurrentPrice: number;
    suggestedPrice: number;
}

export const MarketplacePostOfferView: FC<{}> = () => {
    const [item, setItem] = useState<FurnitureItem>(null);
    const [itemIds, setItemIds] = useState<number[]>([]);
    const [priceText, setPriceText] = useState('');
    const [amountText, setAmountText] = useState('1');
    const [itemStats, setItemStats] = useState<MarketplaceItemStats>(null);
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
        const parser = event.getParser();

        if (!item || parser.furniTypeId !== item.type || parser.furniCategoryId !== (item.isWallItem ? 2 : 1)) return;

        setItemStats({
            averagePrice: parser.averagePrice,
            historyLength: parser.historyLength,
            lowestCurrentPrice: parser.lowestCurrentPrice,
            suggestedPrice: parser.suggestedPrice
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
    // MarketplaceView.calculateFinalPrice: the parser only accepts a configuration whose halfTaxLimit is positive.
    const finalPrice = (price: number) =>
        price - Math.ceil(Math.round(1000 * price * (marketplaceConfiguration.sellingFeePercentage / 100 + (0.5 * price) / marketplaceConfiguration.halfTaxLimit)) / 1000);
    const revenue = finalPrice(askingPrice);
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
                SendMessageComposer(new MakeOfferMessageComposer(askingPrice, item.isWallItem ? 2 : 1, ...ids));
            },
            null,
            null,
            null,
            LocalizeText('inventory.marketplace.confirm_offer.title')
        );

        close();
    };

    const infoText = !isPriceValid
        ? LocalizeText('shop.marketplace.invalid.price', ['minPrice', 'maxPrice'], [minimumPrice.toString(), maximumPrice.toString()])
        : `${LocalizeText('sell.in.marketplace.revenue.label')}: ${revenue}`;

    return (
        <OctaneCardView className="octane-market-offer" frameStyle={3} isResizable={false} initialPosition={{ x: Math.round((window.innerWidth - 300) / 2), y: Math.round((window.innerHeight - 429) / 2) }} uniqueKey="marketplace-offer">
            <OctaneCardHeaderView headerText={LocalizeText('inventory.marketplace.make_offer.title')} onCloseClick={close} />
            <div className="octane-market-offer-body">
                <div className="octane-market-offer-image">
                    <LayoutFurniImageView
                        direction={90}
                        style={{ backgroundColor: '#eeeeee' }}
                        extraData={item.extra.toString()}
                        productClassId={item.type}
                        productType={item.isWallItem ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                    />
                </div>
                <div className="octane-market-offer-name"><NativeText text={furniTitle} textStyle="u_headline_medium" background={0xe9e9e1} maxWidth={190} /></div>
                <div className="octane-market-offer-expiration">
                    <NativeText text={LocalizeText('inventory.marketplace.make_offer.expiration_info_days', ['days'], [String(marketplaceConfiguration.offerTime / 24)])} textStyle="u_regular" background={0xe9e9e1} maxWidth={268} />
                </div>
                <div className="octane-market-offer-label is-price"><NativeText text={LocalizeText('inventory.marketplace.make_offer.price_request')} textStyle="u_headline_small" background={0xe9e9e1} /></div>
                <div className="octane-market-offer-field is-price">
                    <input inputMode="numeric" value={priceText} onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, '');
                        setPriceText(parseInt(value, 10) > maximumPrice ? String(maximumPrice) : value);
                    }} />
                </div>
                <div className="octane-market-offer-label is-amount"><NativeText text={LocalizeText('sellinmarketplace.amount', ['max_amount'], [maxAmount.toString()])} textStyle="u_headline_small" background={0xe9e9e1} /></div>
                <div className="octane-market-offer-field is-amount">
                    <input
                        inputMode="numeric"
                        value={amountText}
                        onChange={(event) => setAmountText(String(Math.max(1, Math.min(parseInt(event.target.value.replace(/\D/g, ''), 10) || 1, maxAmount))))}
                    />
                </div>
                <div className="octane-market-offer-list">
                    {itemStats?.averagePrice > 0 && (
                        <div className="octane-market-offer-stat"><NativeText text={LocalizeText('inventory.marketplace.make_offer.average_price', ['days', 'price', 'price_no_commission'], [marketplaceConfiguration.displayTime.toString(), itemStats.averagePrice.toString(), finalPrice(itemStats.averagePrice).toString()])} textStyle="u_regular" background={0xe9e9e1} /></div>
                    )}
                    {itemStats?.lowestCurrentPrice > 0 && (
                        <div className="octane-market-offer-stat"><NativeText text={LocalizeText('inventory.marketplace.make_offer.lowest_price', ['price'], [itemStats.lowestCurrentPrice.toString()])} textStyle="u_regular" background={0xe9e9e1} /></div>
                    )}
                    {suggestedPrice > 0 && (
                        <>
                            <div className="octane-market-offer-stat"><NativeText text={LocalizeText('inventory.marketplace.make_offer.suggested_price', ['price'], [suggestedPrice.toString()])} textStyle="u_regular" background={0xe9e9e1} /></div>
                            <OctaneButton
                                className="octane-market-offer-copy"
                                onClick={() => {
                                    setPriceText(String(Math.min(suggestedPrice, maximumPrice)));
                                    navigator.clipboard?.writeText(suggestedPrice.toString()).catch(() => undefined);
                                }}
                            >
                                <NativeText text={LocalizeText('inventory.marketplace.make_offer.copy_suggested_price')} textStyle="button_shiny_regular" background={0xffffff} />
                            </OctaneButton>
                        </>
                    )}
                    <div className="octane-market-offer-final"><div className="octane-market-offer-final-text"><NativeText text={infoText} textStyle="u_regular" background={0xffffff} maxWidth={257} align="center" /></div></div>
                    <div className="octane-market-offer-buttons">
                        <OctaneButton className="octane-market-offer-post" disabled={!isPriceValid || !isAmountValid} onClick={postItem}>
                            <NativeText text={LocalizeText('inventory.marketplace.make_offer.post')} textStyle="button_shiny_regular" background={isPriceValid && isAmountValid ? 0xffffff : 0xc3c3c1} />
                        </OctaneButton>
                        <OctaneButton className="octane-market-offer-cancel" onClick={close}>
                            <NativeText text={LocalizeText('inventory.marketplace.make_offer.cancel')} textStyle="button_shiny_regular" background={0xffffff} />
                        </OctaneButton>
                    </div>
                </div>
            </div>
        </OctaneCardView>
    );
};
