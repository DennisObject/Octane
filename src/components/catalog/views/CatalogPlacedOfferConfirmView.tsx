import { NotEnoughBalanceMessageEvent, PurchaseFromCatalogComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeText, PlacedObjectPurchaseData, SendMessageComposer } from '../../../api';
import { CatalogEvent, CatalogPurchasedEvent, CatalogPurchaseFailureEvent, CatalogPurchaseNotAllowedEvent, CatalogPurchaseSoldOutEvent } from '../../../events';
import { claimPlacedOfferPurchase, releasePlacedOfferPurchase, useCatalogActions, useCatalogPlacedOffer, useCatalogSkipPurchaseConfirmation, useMessageEvent, useNotification, usePurse, useUiEvent } from '../../../hooks';
import { CatalogPurchaseConfirmView } from './CatalogPurchaseConfirmView';

/**
 * HabboCatalog.onObjectPlacedInRoom -> showPurchaseConfirmation: an offer dropped in the room
 * asks for confirmation in its own window while the catalog stays hidden. Cancel or close
 * removes the temporary object and brings the catalog back; a bought item is placed by the
 * inventory handler in useCatalogEffects.
 */
export const CatalogPlacedOfferConfirmView: FC = () => {
    const { placedObjectPurchaseData = null, placedObjectPurchaseSent = false, currentType = CatalogType.NORMAL } = useCatalogPlacedOffer();
    const { resetPlacedOfferData = null } = useCatalogActions();
    const [catalogSkipPurchaseConfirmation] = useCatalogSkipPurchaseConfirmation();
    const { simpleAlert = null } = useNotification();
    const { getCurrencyAmount = null } = usePurse();
    const [closedFor, setClosedFor] = useState<PlacedObjectPurchaseData>(null);

    const offer = placedObjectPurchaseData?.offer ?? null;
    const confirmationRequired =
        !!offer && currentType === CatalogType.NORMAL && !(catalogSkipPurchaseConfirmation && !offer.product?.isUniqueLimitedItem);
    const isOpen = confirmationRequired && placedObjectPurchaseData !== closedFor;
    const isSubmitting = isOpen && placedObjectPurchaseSent;

    const rollBack = useCallback(() => {
        setClosedFor(placedObjectPurchaseData);
        resetPlacedOfferData?.();
    }, [placedObjectPurchaseData, resetPlacedOfferData]);

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

    const onCatalogEvent = useCallback(
        (event: CatalogEvent) => {
            if (!isSubmitting) return;

            switch (event.type) {
                case CatalogPurchasedEvent.PURCHASE_SUCCESS:
                    if ((event as CatalogPurchasedEvent).purchase?.offerId !== offer.offerId) return;

                    // The temporary object stays until useCatalogEffects places the bought item.
                    setClosedFor(placedObjectPurchaseData);
                    return;
                case CatalogPurchaseFailureEvent.PURCHASE_FAILED: {
                    const code = (event as CatalogPurchaseFailureEvent).code;

                    simpleAlert?.(
                        LocalizeText(code > 0 ? `catalog.alert.purchaseerror.description.${code}` : 'catalog.alert.purchaseerror.description'),
                        null,
                        null,
                        null,
                        LocalizeText('catalog.alert.purchaseerror.title')
                    );
                    rollBack();
                    return;
                }
                case CatalogPurchaseNotAllowedEvent.NOT_ALLOWED:
                    simpleAlert?.(
                        LocalizeText(
                            (event as CatalogPurchaseNotAllowedEvent).code === 1
                                ? 'catalog.alert.purchasenotallowed.hc.description'
                                : 'catalog.alert.purchasenotallowed.unknown.description'
                        ),
                        null,
                        null,
                        null,
                        LocalizeText('catalog.alert.purchasenotallowed.title')
                    );
                    rollBack();
                    return;
                case CatalogPurchaseSoldOutEvent.SOLD_OUT:
                    simpleAlert?.(
                        LocalizeText('catalog.alert.limited_edition_sold_out.message'),
                        null,
                        null,
                        null,
                        LocalizeText('catalog.alert.limited_edition_sold_out.title')
                    );
                    rollBack();
                    return;
            }
        },
        [isSubmitting, offer, placedObjectPurchaseData, simpleAlert, rollBack]
    );

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, onCatalogEvent);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, onCatalogEvent);
    useUiEvent(CatalogPurchaseNotAllowedEvent.NOT_ALLOWED, onCatalogEvent);
    useUiEvent(CatalogPurchaseSoldOutEvent.SOLD_OUT, onCatalogEvent);

    // The dialog stays open with its buttons back, as PurchaseConfirmationDialog.notEnoughCredits does.
    useMessageEvent<NotEnoughBalanceMessageEvent>(NotEnoughBalanceMessageEvent, (event) => {
        if (!isSubmitting) return;

        const parser = event.getParser();

        releasePlacedOfferPurchase();
        simpleAlert?.(
            LocalizeText(parser.notEnoughCredits ? 'catalog.alert.notenough.credits.description' : 'catalog.alert.notenough.activitypoints.description'),
            null,
            null,
            null,
            LocalizeText(parser.notEnoughCredits ? 'catalog.alert.notenough.title' : 'catalog.alert.notenough.activitypoints.title')
        );
    });

    if (!isOpen) return null;

    return <CatalogPurchaseConfirmView isSubmitting={isSubmitting} offer={offer} quantity={1} onCancel={rollBack} onConfirm={confirm} />;
};
