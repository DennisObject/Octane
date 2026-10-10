export const CATALOG_GRID_VIRTUALIZATION_THRESHOLD = 90;

export const shouldVirtualizeCatalogOffers = (offerCount: number): boolean =>
    offerCount > CATALOG_GRID_VIRTUALIZATION_THRESHOLD;
