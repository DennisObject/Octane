import { PurchaseFromCatalogComposer } from '@volt/renderer';
import { FC, useCallback, useEffect } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../../api';
import { claimPlacedOfferPurchase, useCatalogActions, useCatalogPlacedOffer, useCatalogSkipPurchaseConfirmation, useNotification, usePurse } from '../../../hooks';
import { CatalogPurchaseConfirmView } from './CatalogPurchaseConfirmView';

/**
 * HabboCatalog.onObjectPlacedInRoom -> showPurchaseConfirmation: an offer dropped in the room
 * asks for confirmation in its own window while the catalog stays hidden. Cancel or close
 * removes the temporary object and brings the catalog back. useCatalogEffects owns the purchase
 * answers: it closes the dialog once bought, rolls back on failure and places the bought item.
 */
export const CatalogPlacedOfferConfirmView: FC = () => {
    const {
        placedObjectPurchaseData = null,
        placedObjectPurchaseSent = false,
        placedObjectPurchaseBought = false,
        currentType = CatalogType.NORMAL
    } = useCatalogPlacedOffer();
    const { resetPlacedOfferData = null } = useCatalogActions();
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { simpleAlert = null } = useNotification();
    const { getCurrencyAmount = null } = usePurse();

    const offer = placedObjectPurchaseData?.offer ?? null;
    const confirmationRequired =
        !!offer && currentType === CatalogType.NORMAL && !(catalogSkipPurchaseConfirmation && !offer.product?.isUniqueLimitedItem);
    // The temporary object stays after the purchase until the bought item is placed.
    const isOpen = confirmationRequired && !placedObjectPurchaseBought;
    const isSubmitting = isOpen && placedObjectPurchaseSent;

    // Rolling back clears the dropped offer, which closes the dialog.
    const rollBack = useCallback(() => resetPlacedOfferData?.(), [resetPlacedOfferData]);

    // showPurchaseConfirmation checks the purse before it builds the dialog.
    useEffect(() => {
        if (!isOpen || !offer || !getCurrencyAmount) return;

        if (offer.priceInCredits > getCurrencyAmount(-1)) {
            simpleAlert?.(LocalizeText('catalog.alert.notenough.credits.description'), null, null, null, LocalizeText('catalog.alert.notenough.title'));
            rollBack();

            return;
        }

        if (offer.priceInActivityPoints > getCurrencyAmount(offer.activityPointType)) {
            const currencyLocalization = GetConfigurationValue<string>(
                `activitypoint.name.${offer.activityPointType}`,
                offer.activityPointType === 0 ? 'tooltip.duckets' : ''
            );
            const currencyName = currencyLocalization ? LocalizeText(currencyLocalization) : '';

            simpleAlert?.(
                LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]),
                null,
                null,
                null,
                LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName])
            );
            rollBack();
        }
    }, [isOpen, offer, getCurrencyAmount, simpleAlert, rollBack]);

    // The store flag is read and set synchronously, so a second click before the re-render
    // cannot send the purchase again.
    const confirm = () => {
        if (!isOpen || !claimPlacedOfferPurchase(placedObjectPurchaseData)) return;

        SendMessageComposer(new PurchaseFromCatalogComposer(placedObjectPurchaseData.pageId, offer.offerId, offer.product.extraParam, 1));
    };

    if (!isOpen) return null;

    return <CatalogPurchaseConfirmView isSubmitting={isSubmitting} offer={offer} quantity={1} onCancel={rollBack} onConfirm={confirm} />;
};
