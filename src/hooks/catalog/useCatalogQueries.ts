import {
    CatalogPageMessageEvent,
    CatalogPagesListEvent,
    FrontPageItem,
    GetCatalogIndexComposer,
    GetCatalogPageComposer,
    NodeData
} from '@volt/renderer';
import { keepPreviousData, QueryClient, UseQueryResult } from '@tanstack/react-query';
import { awaitVoltResponse, useVoltQuery } from '../../api/volt-query';
import {
    CatalogPage,
    GetFurnitureData,
    GetProductDataForLocalization,
    ICatalogNode,
    ICatalogPage,
    IProduct,
    IPurchasableOffer,
    Offer,
    PageLocalization,
    Product
} from '../../api';
import { buildCatalogNodeTree, normalizeCatalogType } from './useCatalog.helpers';

export const CATALOG_QUERY_ROOT = ['volt', 'catalog'] as const;
export const CATALOG_PAGE_TIMEOUT_MS = 10_000;
export const CATALOG_PAGE_STALE_MS = 30_000;

export const catalogIndexKey = (type: string) => [...CATALOG_QUERY_ROOT, 'index', type] as const;
export const catalogPageKey = (type: string, pageId: number) => [...CATALOG_QUERY_ROOT, 'page', type, pageId] as const;

export interface CatalogIndexData {
    rootNode: ICatalogNode;
    offersToNodes: Map<number, ICatalogNode[]>;
}

export interface CatalogPageData {
    page: ICatalogPage;
    frontPageItems: FrontPageItem[];
    offerId: number;
}

export interface OfferLookups {
    getProductData: typeof GetProductDataForLocalization;
    getFurnitureData: typeof GetFurnitureData;
}

interface ParserProduct {
    productType: string;
    furniClassId: number;
    extraParam: string;
    productCount: number;
    uniqueLimitedItem: boolean;
    uniqueLimitedSeriesSize: number;
    uniqueLimitedItemsLeft: number;
}

export interface ParserOffer {
    offerId: number;
    localizationId: string;
    rent: boolean;
    priceCredits: number;
    priceActivityPoints: number;
    priceActivityPointsType: number;
    giftable: boolean;
    clubLevel: number;
    products: ParserProduct[];
    bundlePurchaseAllowed: boolean;
    itemIds: string;
    haveOffer: boolean;
}

interface ParserPage {
    pageId: number;
    catalogType: string;
    layoutCode: string;
    localization: { images: string[]; texts: string[] };
    offers: ParserOffer[];
    offerId: number;
    acceptSeasonCurrencyAsCredits: boolean;
    frontPageItems: FrontPageItem[];
}

const defaultLookups: OfferLookups = {
    getProductData: GetProductDataForLocalization,
    getFurnitureData: GetFurnitureData
};

export const buildPurchasableOffer = (offer: ParserOffer, lookups: OfferLookups = defaultLookups): IPurchasableOffer | null => {
    const products: IProduct[] = [];
    const productData = lookups.getProductData(offer.localizationId);

    for (const product of offer.products) {
        const furnitureData = lookups.getFurnitureData(product.furniClassId, product.productType);

        products.push(
            new Product(
                product.productType,
                product.furniClassId,
                product.extraParam,
                product.productCount,
                productData,
                furnitureData,
                product.uniqueLimitedItem,
                product.uniqueLimitedSeriesSize,
                product.uniqueLimitedItemsLeft
            )
        );
    }

    if (!products.length) return null;

    return new Offer(
        offer.offerId,
        offer.localizationId,
        offer.rent,
        offer.priceCredits,
        offer.priceActivityPoints,
        offer.priceActivityPointsType,
        offer.giftable,
        offer.clubLevel,
        products,
        offer.bundlePurchaseAllowed,
        offer.itemIds,
        offer.haveOffer
    );
};

export const selectCatalogIndex = (parser: { root: NodeData }): CatalogIndexData => buildCatalogNodeTree(parser.root);

export const selectCatalogPage = (parser: ParserPage, lookups: OfferLookups = defaultLookups): CatalogPageData => {
    const offers: IPurchasableOffer[] = [];

    for (const parserOffer of parser.offers) {
        const offer = buildPurchasableOffer(parserOffer, lookups);

        if (offer) offers.push(offer);
    }

    const page = new CatalogPage(
        parser.pageId,
        parser.layoutCode,
        new PageLocalization(parser.localization.images.concat(), parser.localization.texts.concat()),
        offers,
        parser.acceptSeasonCurrencyAsCredits
    ) as ICatalogPage;

    return { page, frontPageItems: parser.frontPageItems ?? [], offerId: parser.offerId };
};

const indexQueryConfig = (type: string) => ({
    key: catalogIndexKey(type) as unknown as string[],
    request: () => new GetCatalogIndexComposer(type),
    parser: CatalogPagesListEvent,
    accept: (event: CatalogPagesListEvent) => normalizeCatalogType(event.getParser().catalogType) === type,
    select: (event: CatalogPagesListEvent) => selectCatalogIndex(event.getParser())
});

export const useCatalogIndexQuery = (type: string, enabled: boolean): UseQueryResult<CatalogIndexData> =>
    useVoltQuery<CatalogPagesListEvent, CatalogIndexData>({
        ...indexQueryConfig(type),
        enabled,
        staleTime: Infinity,
        retry: false
    });

export const useCatalogPageQuery = (type: string, pageId: number, enabled: boolean): UseQueryResult<CatalogPageData> =>
    useVoltQuery<CatalogPageMessageEvent, CatalogPageData>({
        key: catalogPageKey(type, pageId) as unknown as string[],
        request: () => new GetCatalogPageComposer(pageId, -1, type),
        parser: CatalogPageMessageEvent,
        accept: (event) => {
            const parser = event.getParser();

            return parser.pageId === pageId && normalizeCatalogType(parser.catalogType) === type;
        },
        select: (event) => selectCatalogPage(event.getParser() as unknown as ParserPage),
        enabled: enabled && pageId > -1,
        staleTime: CATALOG_PAGE_STALE_MS,
        timeoutMs: CATALOG_PAGE_TIMEOUT_MS,
        placeholderData: keepPreviousData,
        retry: false
    });

// The store's actions run outside React; the effects hook binds the app's
// QueryClient here on mount so they can read and invalidate the cache.
let boundClient: QueryClient | null = null;

export const bindCatalogQueryClient = (client: QueryClient | null): void => {
    boundClient = client;
};

export const readCatalogIndex = (type: string): CatalogIndexData | undefined => boundClient?.getQueryData<CatalogIndexData>(catalogIndexKey(type));

export const invalidateCatalogIndex = (type: string): void => {
    boundClient?.invalidateQueries({ queryKey: catalogIndexKey(type) });
};

export const invalidateCatalogPage = (type: string, pageId: number): void => {
    boundClient?.invalidateQueries({ queryKey: catalogPageKey(type, pageId) });
};

export const invalidateCatalogPages = (): void => {
    boundClient?.invalidateQueries({ queryKey: [...CATALOG_QUERY_ROOT, 'page'] });
};

export const refetchCatalogPage = (type: string, pageId: number): void => {
    boundClient?.refetchQueries({ queryKey: catalogPageKey(type, pageId) });
};

export const prefetchCatalogIndex = (type: string): void => {
    boundClient?.prefetchQuery({
        queryKey: catalogIndexKey(type),
        queryFn: () => awaitVoltResponse<CatalogPagesListEvent, CatalogIndexData>(indexQueryConfig(type)),
        staleTime: Infinity
    });
};

export const cloneCachedCatalogPages = (): void => {
    boundClient?.setQueriesData<CatalogPageData>({ queryKey: [...CATALOG_QUERY_ROOT, 'page'] }, (data) => {
        if (!data?.page) return data;

        const offers = data.page.offers.map((offer) => (offer?.clone ? offer.clone() : offer));
        const page = new CatalogPage(
            data.page.pageId,
            data.page.layoutCode,
            data.page.localization,
            offers,
            data.page.acceptSeasonCurrencyAsCredits,
            data.page.mode
        ) as ICatalogPage;

        return { ...data, page };
    });
};

export const dropCatalogCache = (): void => {
    boundClient?.removeQueries({ queryKey: CATALOG_QUERY_ROOT });
};
