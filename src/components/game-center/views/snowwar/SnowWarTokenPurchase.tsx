import { LocalizeText } from '../../../../api';
import { SnowWarHookState } from '../../../../api/snowwar';

type ShowConfirm = (message: string, onConfirm: () => void, onCancel: () => void, confirmText?: string, cancelText?: string, title?: string) => void;

/**
 * HabboCatalog.buySnowWarTokensOffer: confirm and buy the GET_SNOWWAR_TOKENS(2|3) offer
 * from SnowWarGameTokens. Uses the shared confirm dialog instead of the catalog's purchase window.
 */
export const buySnowWarTokens = ({ tokenOffers, requestTokenOffers, purchaseTokenOffer }: SnowWarHookState, showConfirm: ShowConfirm, localizationId: string) =>
{
    const offer = tokenOffers.find(entry => entry.localizationId === localizationId);

    if(!offer)
    {
        requestTokenOffers();

        return;
    }

    const price = offer.pricePoints > 0 ? `${ offer.priceCredits } + ${ offer.pricePoints }` : String(offer.priceCredits);

    showConfirm(
        LocalizeText('catalog.purchase.confirmation.dialog.costs', [ 'offer_name', 'price' ], [ LocalizeText(offer.localizationId), price ]),
        () => purchaseTokenOffer(offer.offerId),
        null,
        LocalizeText('catalog.purchase_confirmation.buy'),
        LocalizeText('catalog.purchase_confirmation.cancel'),
        LocalizeText('catalog.purchase_confirmation.title')
    );
};
