import { IPurchasableOffer } from '../../../../../api';

export const AIR_CATALOG_GRID_HORIZONTAL_SPACING = 3;
export const AIR_GRID_WINDOW_OVERSCAN = 120;

export interface CatalogAirGridEntry {
    offer: IPurchasableOffer;
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CatalogAirGridLayout {
    entries: CatalogAirGridEntry[];
    width: number;
    height: number;
}

export const isAirBaseCatalogOffer = (offer: IPurchasableOffer) => offer.priceInCredits <= 0 && offer.priceInActivityPoints <= 0;

export const getAirCatalogOfferDimensions = (offer: IPurchasableOffer) =>
    isAirBaseCatalogOffer(offer) ? { width: 36, height: 36 } : { width: 53, height: 74 };

/** Mirrors ItemGridController.resolveColumnForNextItem for the first visual row. */
export const getAirCatalogColumnCount = (offers: IPurchasableOffer[], availableWidth: number) => {
    if (!offers.length) return 0;

    let columnCount = 1;
    let right = getAirCatalogOfferDimensions(offers[0]).width;

    while (columnCount < offers.length) {
        const nextWidth = getAirCatalogOfferDimensions(offers[columnCount]).width;

        if (right + nextWidth > availableWidth) break;

        right += AIR_CATALOG_GRID_HORIZONTAL_SPACING + nextWidth;
        columnCount++;
    }

    return columnCount;
};

/** AIR fills columns round-robin, widens each to its widest child, and stacks with no vertical gap. */
export const layoutAirCatalogOffers = (offers: IPurchasableOffer[], columnCount: number): CatalogAirGridLayout => {
    if (!offers.length || columnCount <= 0) return { entries: [], width: 0, height: 0 };

    const safeColumnCount = Math.min(columnCount, offers.length);
    const columnWidths = Array.from({ length: safeColumnCount }, () => 0);

    offers.forEach((offer, index) => {
        const columnIndex = index % safeColumnCount;
        columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], getAirCatalogOfferDimensions(offer).width);
    });

    const columnLefts = columnWidths.map((_, index) =>
        columnWidths.slice(0, index).reduce((left, width) => left + width + AIR_CATALOG_GRID_HORIZONTAL_SPACING, 0)
    );
    const columnHeights = Array.from({ length: safeColumnCount }, () => 0);
    const entries = offers.map((offer, index) => {
        const columnIndex = index % safeColumnCount;
        const dimensions = getAirCatalogOfferDimensions(offer);
        const entry = {
            offer,
            index,
            x: columnLefts[columnIndex],
            y: columnHeights[columnIndex],
            ...dimensions
        };

        columnHeights[columnIndex] += dimensions.height;

        return entry;
    });

    return {
        entries,
        width: columnWidths.reduce((width, columnWidth) => width + columnWidth, 0) + AIR_CATALOG_GRID_HORIZONTAL_SPACING * (safeColumnCount - 1),
        height: Math.max(...columnHeights)
    };
};

/** Entries whose vertical span intersects the scroll window; everything while the viewport is unmeasured. */
export const getVisibleAirGridEntries = (
    entries: CatalogAirGridEntry[],
    scrollTop: number,
    viewportHeight: number,
    overscan = AIR_GRID_WINDOW_OVERSCAN
): CatalogAirGridEntry[] => {
    if (viewportHeight <= 0) return entries;

    const top = scrollTop - overscan;
    const bottom = scrollTop + viewportHeight + overscan;

    return entries.filter((entry) => entry.y + entry.height >= top && entry.y <= bottom);
};
