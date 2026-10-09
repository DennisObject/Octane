import { IPurchasableOffer } from '../../../../../api';

const WHITE = 0xffffff;
const NEAR_WHITE = 0xfffffe;

export interface CatalogColourVariant {
    offer: IPurchasableOffer;
    colour: number;
}

export interface CatalogColourGrouping {
    /** One tile per colour family (plus every offer that has no colour family), in page order. */
    gridOffers: IPurchasableOffer[];
    /** Swatches per family, ordered by the `*N` colour index of the furni. */
    families: Map<string, CatalogColourVariant[]>;
}

/** `bc_block_1*7` -> `bc_block_1`; null for offers that are not an indexed-colour furni. */
export const getCatalogColourFamily = (offer: IPurchasableOffer): string | null => {
    const furniData = offer?.product?.furnitureData;

    if (!furniData || !furniData.hasIndexedColor) return null;

    return furniData.fullName.split('*')[0];
};

/** AIR shows the last non-white furnidata colour of a variant as its swatch. */
const getVariantColour = (offer: IPurchasableOffer): number => {
    let colour = WHITE;

    for (const value of offer.product.furnitureData.colors ?? []) {
        if (value !== WHITE) colour = value;
    }

    return colour;
};

/**
 * Mirrors AIR's `ItemGridCatalogWidget.populateItemGrid` for `default_3x3_color_grouping`: colour variants
 * of one furni collapse into a single tile and their colours feed the colour grid. Builders Club families
 * (`bc_`) are represented by their white variant. Unlike AIR, a variant whose colour repeats an earlier
 * one only loses its swatch; the remaining swatches keep pointing at their own variant.
 */
export const groupCatalogColourOffers = (offers: readonly IPurchasableOffer[]): CatalogColourGrouping => {
    const gridOffers: IPurchasableOffer[] = [];
    const families = new Map<string, CatalogColourVariant[]>();
    const tileIndexByFamily = new Map<string, number>();

    for (const offer of offers) {
        if (!offer?.product) continue;

        const family = getCatalogColourFamily(offer);

        if (!family) {
            gridOffers.push(offer);
            continue;
        }

        const colour = getVariantColour(offer);
        const variants = families.get(family) ?? [];

        if (!variants.some((variant) => variant.colour === colour)) variants.push({ offer, colour });

        families.set(family, variants);

        if (!tileIndexByFamily.has(family)) {
            tileIndexByFamily.set(family, gridOffers.length);
            gridOffers.push(offer);
        } else if (family.startsWith('bc_') && (colour === WHITE || colour === NEAR_WHITE)) {
            gridOffers[tileIndexByFamily.get(family)] = offer;
        }
    }

    for (const variants of families.values()) {
        variants.sort((a, b) => a.offer.product.furnitureData.colorIndex - b.offer.product.furnitureData.colorIndex);
    }

    return { gridOffers, families };
};
