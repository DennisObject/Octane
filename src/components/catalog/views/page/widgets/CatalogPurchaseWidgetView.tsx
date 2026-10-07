import { CreateLinkEvent, PurchaseFromCatalogComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CatalogPurchaseState,
    DispatchUiEvent,
    GetClubMemberLevel,
    GetConfigurationValue,
    LocalizeText,
    Offer,
    OpenUrl,
    ProductTypeEnum,
    SendMessageComposer
} from '../../../../../api';
import { getCatalogBundlePrice } from '../../../../../api/catalog/CatalogBundleDiscount';
import { useHabbiconCatalog } from '../../../../../api/habbicons';
import { localizeWithFallback } from '../../../../../api/utils/localizeWithFallback';
import { LayoutLoadingSpinnerView } from '../../../../../common';
import {
    CatalogEvent,
    CatalogInitGiftEvent,
    CatalogPurchasedEvent,
    CatalogPurchaseFailureEvent,
    CatalogPurchaseNotAllowedEvent,
    CatalogPurchaseSoldOutEvent
} from '../../../../../events';
import {
    useCatalogActions,
    useCatalogBundleDiscountRuleset,
    useCatalogData,
    useCatalogSkipPurchaseConfirmation,
    useCatalogUiState,
    useNotification,
    usePurse,
    useUiEvent
} from '../../../../../hooks';
import { CatalogPurchaseConfirmView } from '../../CatalogPurchaseConfirmView';
import { CatalogClubUpgradeButton } from './CatalogClubUpgradeButton';
import { canPurchaseCatalogOffer } from './catalogPurchase.helpers';

interface CatalogPurchaseWidgetViewProps {
    disabled?: boolean;
    noGiftOption?: boolean;
    purchaseCallback?: () => void;
}

export const CatalogPurchaseWidgetView: FC<CatalogPurchaseWidgetViewProps> = (props) => {
    const { disabled = false, noGiftOption = false, purchaseCallback = null } = props;
    const habbicons = useHabbiconCatalog();
    const [purchaseWillBeGift, setPurchaseWillBeGift] = useState(false);
    const [purchaseState, setPurchaseState] = useState(CatalogPurchaseState.NONE);
    const purchasePendingRef = useRef(false);
    const ownsPurchaseOutcomeRef = useRef(false);
    const confirmationOpenRef = useRef(false);
    const purchaseGuardTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { data: bundleDiscountRuleset = null } = useCatalogBundleDiscountRuleset();
    const { currentOffer = null, currentPage = null } = useCatalogData();
    const {
        giftReceiver = null,
        purchaseOptions = null,
        setPurchaseOptions = null
    } = useCatalogUiState();
    const { getNodesByOfferId = null, resetPlacedOfferData = null } = useCatalogActions();
    const { getCurrencyAmount = null } = usePurse();
    const { showConfirm = null, simpleAlert = null } = useNotification();

    const resetPurchaseGuard = useCallback(() => {
        purchasePendingRef.current = false;
        ownsPurchaseOutcomeRef.current = false;
        confirmationOpenRef.current = false;

        if (purchaseGuardTimeoutRef.current) clearTimeout(purchaseGuardTimeoutRef.current);

        purchaseGuardTimeoutRef.current = null;
    }, []);

    const showInsufficientBalanceAlert = useCallback(() => {
        if (!currentOffer || !purchaseOptions || !getCurrencyAmount) return false;

        const quantity = purchaseOptions.quantity;
        const creditPrice = getCatalogBundlePrice(currentOffer.priceInCredits, quantity, currentOffer.bundlePurchaseAllowed, bundleDiscountRuleset).price;
        const activityPointPrice = getCatalogBundlePrice(
            currentOffer.priceInActivityPoints,
            quantity,
            currentOffer.bundlePurchaseAllowed,
            bundleDiscountRuleset
        ).price;

        if (creditPrice > getCurrencyAmount(-1)) {
            const description = LocalizeText('catalog.alert.notenough.credits.description');
            const title = LocalizeText('catalog.alert.notenough.title');

            if (showConfirm) {
                const settle = () => resetPlacedOfferData?.();

                showConfirm(
                    description,
                    () => {
                        settle();

                        const shopUrl = GetConfigurationValue<string>('web.shop.relativeUrl', '');

                        if (shopUrl) OpenUrl(shopUrl);
                    },
                    settle,
                    null,
                    null,
                    title
                );
            } else {
                simpleAlert?.(description, null, null, null, title);
            }

            return true;
        }

        if (activityPointPrice > getCurrencyAmount(currentOffer.activityPointType)) {
            const currencyLocalization = GetConfigurationValue<string>(
                `activitypoint.name.${currentOffer.activityPointType}`,
                currentOffer.activityPointType === 0 ? 'tooltip.duckets' : ''
            );

            if (currencyLocalization) {
                const currencyName = LocalizeText(currencyLocalization);
                const description = LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]);
                const title = LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName]);

                if (currentOffer.activityPointType === 0 && showConfirm) {
                    const settle = () => resetPlacedOfferData?.();

                    showConfirm(
                        description,
                        () => {
                            settle();

                            const ducketsUrl = GetConfigurationValue<string>('link.format.duckets', '');

                            if (ducketsUrl) OpenUrl(ducketsUrl);
                        },
                        settle,
                        null,
                        null,
                        title
                    );
                } else {
                    simpleAlert?.(description, null, null, null, title);
                }
            } else {
                simpleAlert?.(
                    LocalizeText('catalog.alert.notenough.activitypoints.description'),
                    null,
                    null,
                    null,
                    LocalizeText(`catalog.alert.notenough.activitypoints.title.${currentOffer.activityPointType}`)
                );
            }

            return true;
        }

        return false;
    }, [bundleDiscountRuleset, currentOffer, getCurrencyAmount, purchaseOptions, resetPlacedOfferData, showConfirm, simpleAlert]);

    const onCatalogEvent = useCallback(
        (event: CatalogEvent) => {
            if (!ownsPurchaseOutcomeRef.current) return;

            ownsPurchaseOutcomeRef.current = false;

            switch (event.type) {
                case CatalogPurchasedEvent.PURCHASE_SUCCESS:
                    resetPurchaseGuard();
                    setPurchaseWillBeGift(false);
                    setPurchaseState(CatalogPurchaseState.NONE);
                    return;
                case CatalogPurchaseFailureEvent.PURCHASE_FAILED:
                    resetPurchaseGuard();
                    setPurchaseWillBeGift(false);
                    setPurchaseState(CatalogPurchaseState.FAILED);
                    return;
                case CatalogPurchaseNotAllowedEvent.NOT_ALLOWED:
                    resetPurchaseGuard();
                    setPurchaseWillBeGift(false);
                    setPurchaseState(CatalogPurchaseState.FAILED);
                    return;
                case CatalogPurchaseSoldOutEvent.SOLD_OUT:
                    resetPurchaseGuard();
                    setPurchaseWillBeGift(false);
                    setPurchaseState(CatalogPurchaseState.SOLD_OUT);
                    return;
            }
        },
        [resetPurchaseGuard]
    );

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, onCatalogEvent);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, onCatalogEvent);
    useUiEvent(CatalogPurchaseNotAllowedEvent.NOT_ALLOWED, onCatalogEvent);
    useUiEvent(CatalogPurchaseSoldOutEvent.SOLD_OUT, onCatalogEvent);

    const isLimitedSoldOut = useMemo(() => {
        if (!currentOffer) return false;

        if (purchaseOptions.extraParamRequired && (!purchaseOptions.extraData || !purchaseOptions.extraData.length)) return false;

        if (currentOffer.pricingModel === Offer.PRICING_MODEL_SINGLE) {
            const product = currentOffer.product;

            if (product && product.isUniqueLimitedItem) return !product.uniqueLimitedItemsLeft;
        }

        return false;
    }, [currentOffer, purchaseOptions]);

    const habbiconOwned =
        currentOffer?.product?.productType === ProductTypeEnum.HABBICON &&
        habbicons.entries.some((entry) => entry.id === currentOffer.product.productClassId && (entry.owned || entry.claimable));

    const purchase = (isGift: boolean = false) => {
        if (habbiconOwned || !canPurchaseCatalogOffer(currentOffer) || purchasePendingRef.current) return;

        if (GetClubMemberLevel() < currentOffer.clubLevel) {
            CreateLinkEvent('habboUI/open/hccenter');

            return;
        }

        let pageId = currentOffer.page.pageId;

        if (pageId === -1 && getNodesByOfferId) {
            const nodes = getNodesByOfferId(currentOffer.offerId);
            if (nodes && nodes.length) pageId = nodes[0].pageId;
        }

        if (isGift) {
            confirmationOpenRef.current = false;
            setPurchaseWillBeGift(false);
            setPurchaseState(CatalogPurchaseState.NONE);
            DispatchUiEvent(new CatalogInitGiftEvent(pageId, currentOffer.offerId, purchaseOptions.extraData, giftReceiver ?? ''));

            return;
        }

        if (showInsufficientBalanceAlert()) {
            confirmationOpenRef.current = false;
            setPurchaseState(CatalogPurchaseState.NONE);

            return;
        }

        purchasePendingRef.current = true;
        ownsPurchaseOutcomeRef.current = true;
        setPurchaseState(CatalogPurchaseState.PURCHASE);

        purchaseGuardTimeoutRef.current = setTimeout(() => {
            resetPurchaseGuard();
            setPurchaseWillBeGift(false);
            setPurchaseState(CatalogPurchaseState.NONE);
        }, 10000);

        if (purchaseCallback) {
            purchaseCallback();

            return;
        }

        SendMessageComposer(new PurchaseFromCatalogComposer(pageId, currentOffer.offerId, purchaseOptions.extraData, purchaseOptions.quantity));
    };

    useEffect(() => {
        if (!currentOffer) return;

        resetPurchaseGuard();
        ownsPurchaseOutcomeRef.current = false;
        setPurchaseWillBeGift(false);
        setPurchaseState(CatalogPurchaseState.NONE);
    }, [currentOffer, resetPurchaseGuard, setPurchaseOptions]);

    useEffect(() => resetPurchaseGuard, [resetPurchaseGuard]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> = null;

        if (purchaseState === CatalogPurchaseState.FAILED) {
            timeout = setTimeout(() => setPurchaseState(CatalogPurchaseState.NONE), 3000);
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [purchaseState]);

    if (!currentOffer) return null;

    const isLimitedEditionOffer = !!(currentOffer.product && currentOffer.product.isUniqueLimitedItem);
    const isOfferUnavailable = !canPurchaseCatalogOffer(currentOffer);
    // A club-locked offer replaces the purchase buttons with the club invitation; either
    // button would only open the club centre for a player below the offer's club level.
    const isClubLocked = !isOfferUnavailable && !habbiconOwned && GetClubMemberLevel() < currentOffer.clubLevel;

    const PurchaseButton = () => {
        const standardButtonClassNames = ['octane-catalog-standard-button'];
        const purchaseButtonClassNames = [...standardButtonClassNames, 'octane-catalog-standard-buy-button'];

        if (habbiconOwned)
            return (
                <button type="button" className={purchaseButtonClassNames.join(' ')} disabled>
                    {localizeWithFallback('generic.owned', 'Owned')}
                </button>
            );

        if (isOfferUnavailable)
            return (
                <button type="button" className={purchaseButtonClassNames.join(' ')} disabled>
                    {currentOffer.isLazy ? LocalizeText('generic.loading') : LocalizeText('catalog.purchase_confirmation.' + (currentOffer.isRentOffer ? 'rent' : 'buy'))}
                </button>
            );

        if (isLimitedSoldOut)
            return (
                <button type="button" className={purchaseButtonClassNames.join(' ')} disabled>
                    {LocalizeText('catalog.alert.limited_edition_sold_out.title')}
                </button>
            );

        switch (purchaseState) {
            case CatalogPurchaseState.CONFIRM:
                return (
                    <button type="button" className={`${purchaseButtonClassNames.join(' ')} pointer-events-none`}>
                        {LocalizeText('catalog.purchase_confirmation.' + (currentOffer.isRentOffer ? 'rent' : 'buy'))}
                    </button>
                );
            case CatalogPurchaseState.PURCHASE:
                return (
                    <button type="button" className={purchaseButtonClassNames.join(' ')} disabled>
                        <LayoutLoadingSpinnerView />
                    </button>
                );
            case CatalogPurchaseState.FAILED:
                return (
                    <button type="button" className={purchaseButtonClassNames.join(' ')}>
                        {LocalizeText('generic.failed')}
                    </button>
                );
            case CatalogPurchaseState.SOLD_OUT:
                return (
                    <button type="button" className={purchaseButtonClassNames.join(' ')}>
                        {LocalizeText('generic.failed') + ' - ' + LocalizeText('catalog.alert.limited_edition_sold_out.title')}
                    </button>
                );
            case CatalogPurchaseState.NONE:
            default:
                return (
                    <button
                        type="button"
                        className={purchaseButtonClassNames.join(' ')}
                        disabled={disabled || (purchaseOptions.extraParamRequired && (!purchaseOptions.extraData || !purchaseOptions.extraData.length))}
                        onClick={() => {
                            if (catalogSkipPurchaseConfirmation && !isLimitedEditionOffer) {
                                confirmationOpenRef.current = false;
                                setPurchaseWillBeGift(false);
                                purchase();

                                return;
                            }

                            if (!showInsufficientBalanceAlert()) {
                                confirmationOpenRef.current = true;
                                setPurchaseWillBeGift(false);
                                setPurchaseState(CatalogPurchaseState.CONFIRM);
                            }
                        }}
                    >
                        {LocalizeText('catalog.purchase_confirmation.' + (currentOffer.isRentOffer ? 'rent' : 'buy'))}
                    </button>
                );
        }
    };

    return (
        <>
            {isClubLocked && <CatalogClubUpgradeButton />}
            {!isClubLocked && !noGiftOption && !currentOffer.isRentOffer && (
                <button
                    type="button"
                    className="octane-catalog-standard-button octane-catalog-standard-gift-button"
                    disabled={
                        disabled ||
                        purchaseOptions.quantity > 1 ||
                        isOfferUnavailable ||
                        !currentOffer.giftable ||
                        currentOffer.product?.productType === ProductTypeEnum.HABBICON ||
                        isLimitedSoldOut ||
                        (purchaseOptions.extraParamRequired && (!purchaseOptions.extraData || !purchaseOptions.extraData.length))
                    }
                    onClick={() => {
                        if (showInsufficientBalanceAlert()) return;

                        confirmationOpenRef.current = true;
                        setPurchaseWillBeGift(true);
                        setPurchaseState(CatalogPurchaseState.CONFIRM);
                    }}
                >
                    {LocalizeText('catalog.purchase_confirmation.gift')}
                </button>
            )}
            {!isClubLocked && <PurchaseButton />}
            {confirmationOpenRef.current && (purchaseState === CatalogPurchaseState.CONFIRM || purchaseState === CatalogPurchaseState.PURCHASE) && (
                <CatalogPurchaseConfirmView
                    isGift={purchaseWillBeGift}
                    isSubmitting={purchaseState === CatalogPurchaseState.PURCHASE}
                    bundleDiscountRuleset={bundleDiscountRuleset}
                    offer={currentOffer}
                    quantity={purchaseOptions.quantity}
                    onCancel={() => {
                        confirmationOpenRef.current = false;
                        resetPlacedOfferData?.();
                        setPurchaseWillBeGift(false);
                        setPurchaseState(CatalogPurchaseState.NONE);
                    }}
                    onConfirm={() => purchase(purchaseWillBeGift)}
                />
            )}
        </>
    );
};
