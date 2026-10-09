import { FC, useMemo, useState } from 'react';
import { ICatalogPage, IPurchasableOffer } from '../../../../../api';
import { useCatalogActions, useCatalogData } from '../../../../../hooks';
import { getCatalogColourFamily, groupCatalogColourOffers } from '../common/catalogColourGrouping.helpers';
import { CatalogColourGridWidgetView } from '../widgets/CatalogColourGridWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { CatalogLayoutDefaultView } from './CatalogLayoutDefaultView';

/**
 * AIR `default_3x3_color_grouping`: the default page with a one-row item grid and a colour grid under it.
 * Colour variants of a furni share one tile; a swatch swaps that tile (and the preview) to its variant.
 */
export const CatalogLayoutColorGroupingView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();
    const [chosen, setChosen] = useState<{ page: ICatalogPage; offers: Map<string, IPurchasableOffer> }>(null);

    const grouping = useMemo(() => groupCatalogColourOffers(page?.offers ?? []), [page?.offers]);
    const currentFamily = currentOffer && page?.offers.includes(currentOffer) ? getCatalogColourFamily(currentOffer) : null;
    const chosenOffers = chosen?.page === page ? chosen.offers : null;

    const selectColour = (offer: IPurchasableOffer) => {
        const offers = new Map(chosenOffers);

        offers.set(getCatalogColourFamily(offer), offer);
        setChosen({ page, offers });
        selectCatalogOffer(offer);
    };

    const gridOffers = useMemo(
        () =>
            grouping.gridOffers.map((offer) => {
                const family = getCatalogColourFamily(offer);

                if (!family) return offer;
                if (family === currentFamily) return currentOffer;

                return chosenOffers?.get(family) ?? offer;
            }),
        [grouping, currentFamily, currentOffer, chosenOffers]
    );

    const isGridOfferActive = (offer: IPurchasableOffer) => {
        if (!currentOffer) return false;

        const family = getCatalogColourFamily(offer);

        return family ? family === currentFamily : offer.offerId === currentOffer.offerId;
    };

    return (
        <CatalogLayoutDefaultView
            {...props}
            colourGrid={
                <CatalogColourGridWidgetView
                    selectedOffer={currentOffer}
                    variants={(currentFamily && grouping.families.get(currentFamily)) || []}
                    onSelect={selectColour}
                />
            }
            gridOffers={gridOffers}
            isGridOfferActive={isGridOfferActive}
        />
    );
};
