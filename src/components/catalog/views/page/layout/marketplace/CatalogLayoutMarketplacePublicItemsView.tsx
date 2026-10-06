import {
    BuyMarketplaceOfferMessageComposer,
    GetMarketplaceOffersMessageComposer,
    HabboBroadcastMessageEvent,
    MarketPlaceOffersEvent,
    MarketplaceBuyOfferResultEvent,
    PurchaseOKMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useMemo, useRef, useState } from 'react';
import {
    IMarketplaceSearchOptions,
    LocalizeText,
    MarketplaceOfferData,
    MarketplaceSearchType,
    NotificationAlertType,
    SendMessageComposer
} from '../../../../../../api';
import { Button, Column, Text } from '../../../../../../common';
import { useMessageEvent, useNotification, usePurse } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutMarketplaceItemView, PUBLIC_OFFER } from './CatalogLayoutMarketplaceItemView';
import { SearchFormView } from './CatalogLayoutMarketplaceSearchFormView';

// Current emulator refusals are alerts rather than MarketplaceBuyOfferResult.
const MARKETPLACE_REFUSALS = new Set([
    'To prevent average boosting you cannot purchase your own marketplace offers.',
    'Oops, you do not have enough credits for this.',
    'Oops, this offer is no longer available.',
    'Oops, this offer has expired..',
    "Item isn't in the hotel anymore."
]);

const SORT_TYPES_VALUE = [1, 2];
const SORT_TYPES_ACTIVITY = [3, 4, 5, 6];
const SORT_TYPES_ADVANCED = [1, 2, 3, 4, 5, 6];
export interface CatalogLayoutMarketplacePublicItemsViewProps extends CatalogLayoutProps {}

export const CatalogLayoutMarketplacePublicItemsView: FC<CatalogLayoutMarketplacePublicItemsViewProps> = (props) => {
    const [searchType, setSearchType] = useState(MarketplaceSearchType.BY_ACTIVITY);
    const [totalItemsFound, setTotalItemsFound] = useState(0);
    const [offers, setOffers] = useState(new Map<number, MarketplaceOfferData>());
    const [lastSearch, setLastSearch] = useState<IMarketplaceSearchOptions>({ minPrice: -1, maxPrice: -1, query: '', type: 3 });
    const { getCurrencyAmount = null } = usePurse();
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const isBuyingRef = useRef<boolean>(false);
    const purchaseAcknowledgedRef = useRef(false);

    const requestOffers = useCallback((options: IMarketplaceSearchOptions) => {
        setLastSearch(options);
        SendMessageComposer(new GetMarketplaceOffersMessageComposer(options.minPrice, options.maxPrice, options.query, options.type));
    }, []);

    const getSortTypes = useMemo(() => {
        switch (searchType) {
            case MarketplaceSearchType.BY_ACTIVITY:
                return SORT_TYPES_ACTIVITY;
            case MarketplaceSearchType.BY_VALUE:
                return SORT_TYPES_VALUE;
            case MarketplaceSearchType.ADVANCED:
                return SORT_TYPES_ADVANCED;
        }
        return [];
    }, [searchType]);

    const purchaseItem = useCallback(
        (offerData: MarketplaceOfferData) => {
            if (offerData.price > getCurrencyAmount(-1)) {
                simpleAlert(
                    LocalizeText('catalog.alert.notenough.credits.description'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.alert.notenough.title')
                );
                return;
            }

            const offerId = offerData.offerId;

            showConfirm(
                LocalizeText('catalog.marketplace.confirm_header'),
                () => {
                    if (isBuyingRef.current) return;

                    isBuyingRef.current = true;
                    purchaseAcknowledgedRef.current = false;
                    SendMessageComposer(new BuyMarketplaceOfferMessageComposer(offerId));
                },
                null,
                null,
                null,
                LocalizeText('catalog.marketplace.confirm_title')
            );
        },
        [getCurrencyAmount, simpleAlert, showConfirm]
    );

    useMessageEvent<MarketPlaceOffersEvent>(MarketPlaceOffersEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const latestOffers = new Map<number, MarketplaceOfferData>();
        parser.offers.forEach((entry) => {
            const offerEntry = new MarketplaceOfferData(
                entry.offerId,
                entry.furniId,
                entry.furniType,
                entry.extraData,
                entry.stuffData,
                entry.price,
                entry.status,
                entry.averagePrice,
                entry.offerCount
            );
            offerEntry.timeLeftMinutes = entry.timeLeftMinutes;
            latestOffers.set(entry.offerId, offerEntry);
        });

        // The emulator acknowledges marketplace delivery with an empty PurchaseOK
        // offer, then refreshes the list. A search refresh alone is not completion.
        if (purchaseAcknowledgedRef.current) {
            isBuyingRef.current = false;
            purchaseAcknowledgedRef.current = false;
        }
        setTotalItemsFound(parser.totalItemsFound);
        setOffers(latestOffers);
    });

    useMessageEvent<PurchaseOKMessageEvent>(PurchaseOKMessageEvent, (event) => {
        const offer = event.getParser()?.offer;
        if (isBuyingRef.current && offer?.offerId === 0 && offer.localizationId === '') purchaseAcknowledgedRef.current = true;
    });

    useMessageEvent<HabboBroadcastMessageEvent>(HabboBroadcastMessageEvent, (event) => {
        if (!isBuyingRef.current || !MARKETPLACE_REFUSALS.has(event.getParser()?.message)) return;
        isBuyingRef.current = false;
        purchaseAcknowledgedRef.current = false;
    });

    useMessageEvent<MarketplaceBuyOfferResultEvent>(MarketplaceBuyOfferResultEvent, (event) => {
        const parser = event.getParser();

        isBuyingRef.current = false;
        purchaseAcknowledgedRef.current = false;

        if (!parser) return;

        switch (parser.result) {
            case 1:
                requestOffers(lastSearch);
                break;
            case 2:
                setOffers((prev) => {
                    const newVal = new Map(prev);
                    newVal.delete(parser.requestedOfferId);
                    return newVal;
                });
                simpleAlert(
                    LocalizeText('catalog.marketplace.not_available_header'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.marketplace.not_available_title')
                );
                break;
            case 3:
                // our shit was updated
                // todo: some dialogue modal
                setOffers((prev) => {
                    const newVal = new Map(prev);

                    const item = newVal.get(parser.requestedOfferId);
                    if (item) {
                        // Delete the OLD key first, then set under the (possibly
                        // unchanged) new id. The old code did set()-then-delete(),
                        // so when the server returned the same id for the re-priced
                        // offer the set was immediately undone and the offer vanished.
                        newVal.delete(parser.requestedOfferId);

                        item.offerId = parser.offerId;
                        item.price = parser.newPrice;
                        item.offerCount--;
                        newVal.set(item.offerId, item);
                    }

                    return newVal;
                });

                showConfirm(
                    LocalizeText('catalog.marketplace.confirm_higher_header') +
                        '\n' +
                        LocalizeText('catalog.marketplace.confirm_price', ['price'], [parser.newPrice.toString()]),
                    () => {
                        SendMessageComposer(new BuyMarketplaceOfferMessageComposer(parser.offerId));
                    },
                    null,
                    null,
                    null,
                    LocalizeText('catalog.marketplace.confirm_higher_title')
                );
                break;
            case 4:
                simpleAlert(
                    LocalizeText('catalog.alert.notenough.credits.description'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.alert.notenough.title')
                );
                break;
        }
    });

    return (
        <>
            <div className="relative inline-flex align-middle">
                <Button active={searchType === MarketplaceSearchType.BY_ACTIVITY} onClick={() => setSearchType(MarketplaceSearchType.BY_ACTIVITY)}>
                    {LocalizeText('catalog.marketplace.search_by_activity')}
                </Button>
                <Button active={searchType === MarketplaceSearchType.BY_VALUE} onClick={() => setSearchType(MarketplaceSearchType.BY_VALUE)}>
                    {LocalizeText('catalog.marketplace.search_by_value')}
                </Button>
                <Button active={searchType === MarketplaceSearchType.ADVANCED} onClick={() => setSearchType(MarketplaceSearchType.ADVANCED)}>
                    {LocalizeText('catalog.marketplace.search_advanced')}
                </Button>
            </div>
            <SearchFormView searchType={searchType} sortTypes={getSortTypes} onSearch={requestOffers} />
            <Column gap={1} overflow="hidden">
                <Text shrink truncate fontWeight="bold">
                    {LocalizeText('catalog.marketplace.items_found', ['count'], [offers.size.toString()])}
                </Text>
                <Column className="octane-catalog-layout-marketplace-grid" overflow="auto">
                    {Array.from(offers.values()).map((entry, index) => (
                        <CatalogLayoutMarketplaceItemView key={index} offerData={entry} type={PUBLIC_OFFER} onClick={purchaseItem} />
                    ))}
                </Column>
            </Column>
        </>
    );
};
