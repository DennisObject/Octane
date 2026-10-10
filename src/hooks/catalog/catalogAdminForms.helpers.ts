import type { CatalogAdminOfferDetailsMessageParser, CatalogAdminPageDetailsMessageParser } from '@volt/renderer';
import type { ICatalogNode } from '../../api/catalog/ICatalogNode';
import type { IProduct } from '../../api/catalog/IProduct';
import type { IPurchasableOffer } from '../../api/catalog/IPurchasableOffer';
import { ProductTypeEnum } from '../../api/catalog/ProductTypeEnum';
import { GetConfigurationValue } from '../../api/volt/GetConfigurationValue';
import { isCatalogStudioLayoutCode } from '../../components/catalog/views/page/layout/catalogLayoutRegistry';
import type { CatalogAdminOfferForm, CatalogAdminPageForm } from './catalogAdmin.types';
import type { CatalogStudioOfferSnapshot, CatalogStudioPageSnapshot } from './catalogStudio.types';

/** Next free order number after the given siblings, 0 for the first one. */
export const nextCatalogAdminOrder = (orders: number[]): number => (orders.length ? Math.max(...orders) + 1 : 0);

export const createNewPageForm = (parentId: number, catalogMode: string, orderNum = 0): CatalogAdminPageForm => ({
    pageId: null,
    caption: '',
    captionSave: '',
    parentId,
    catalogMode,
    pageLayout: 'default_3x3',
    iconColor: 1,
    iconImage: 0,
    requiredPermission: '',
    orderNum,
    visible: true,
    enabled: true,
    clubOnly: false,
    pageHeadline: '',
    pageTeaser: '',
    pageSpecial: '',
    pageText1: '',
    pageText2: '',
    pageTextDetails: '',
    pageTextTeaser: '',
    roomId: 0,
    includes: ''
});

/** Placeholder built from the catalog tree while the stored page row is on its way. */
export const createPageFormFromNode = (node: ICatalogNode, catalogMode: string): CatalogAdminPageForm => {
    const parentId = typeof node.parentId === 'number' && node.parentId !== -1 ? node.parentId : (node.parent?.pageId ?? -1);

    return {
        ...createNewPageForm(parentId, catalogMode),
        pageId: node.pageId,
        iconImage: node.iconId ?? 0,
        visible: node.isVisible
    };
};

export const createPageFormFromSnapshot = (snapshot: CatalogStudioPageSnapshot): CatalogAdminPageForm => ({
    pageId: snapshot.pageId,
    caption: snapshot.caption,
    captionSave: snapshot.captionSave,
    parentId: snapshot.parentId,
    catalogMode: snapshot.catalogMode,
    pageLayout: snapshot.pageLayout,
    iconColor: snapshot.iconColor,
    iconImage: snapshot.iconImage,
    requiredPermission: snapshot.requiredPermission,
    orderNum: snapshot.orderNum,
    visible: snapshot.visible,
    enabled: snapshot.enabled,
    clubOnly: snapshot.clubOnly,
    pageHeadline: snapshot.pageHeadline,
    pageTeaser: snapshot.pageTeaser,
    pageSpecial: snapshot.pageSpecial,
    pageText1: snapshot.pageText1,
    pageText2: snapshot.pageText2,
    pageTextDetails: snapshot.pageTextDetails,
    pageTextTeaser: snapshot.pageTextTeaser,
    roomId: snapshot.roomId,
    includes: snapshot.includes
});

export const createPageFormFromDetails = (details: CatalogAdminPageDetailsMessageParser): CatalogAdminPageForm => ({
    pageId: details.pageId,
    caption: details.caption,
    captionSave: details.captionSave,
    parentId: details.parentId,
    catalogMode: details.catalogMode,
    pageLayout: details.layout,
    iconColor: details.iconColor,
    iconImage: details.iconImage,
    requiredPermission: details.requiredPermission,
    orderNum: details.orderNum,
    visible: details.visible,
    enabled: details.enabled,
    clubOnly: details.clubOnly,
    pageHeadline: details.headline,
    pageTeaser: details.teaser,
    pageSpecial: details.special,
    pageText1: details.textOne,
    pageText2: details.textTwo,
    pageTextDetails: details.textDetails,
    pageTextTeaser: details.textTeaser,
    roomId: details.roomId,
    includes: details.includes
});

/**
 * Returns the localisation key of the first problem, or null when the page can be sent. HC-only,
 * room link, included pages and icon colour are not edited here, so they are not checked either.
 */
export const validatePageForm = (form: CatalogAdminPageForm): string | null => {
    if (!form.caption.trim()) return 'catalog.admin.page.error.caption';
    if (!isCatalogStudioLayoutCode(form.pageLayout)) return 'catalog.admin.page.error.layout';
    if (form.iconImage < 0) return 'catalog.admin.page.error.icon';
    if (form.parentId < -1) return 'catalog.admin.page.error.parent';

    return null;
};

export const createNewOfferForm = (pageId: number, orderNumber = 0): CatalogAdminOfferForm => ({
    offerId: null,
    pageId,
    itemIds: '',
    catalogName: '',
    costCredits: 0,
    costPoints: 0,
    pointsType: 0,
    amount: 1,
    clubOnly: false,
    extradata: '',
    haveOffer: true,
    offerIdGroup: -1,
    songId: 0,
    limitedStack: 0,
    orderNumber
});

/** Placeholder built from the live catalog offer while the stored offer row is on its way. */
export const createOfferFormFromOffer = (offer: IPurchasableOffer, pageId: number): CatalogAdminOfferForm => ({
    ...createNewOfferForm(pageId),
    offerId: offer.offerId,
    itemIds: offer.itemIds || '',
    catalogName: offer.localizationName || '',
    costCredits: offer.priceInCredits,
    costPoints: offer.priceInActivityPoints,
    pointsType: offer.activityPointType,
    amount: offer.product?.productCount || 1,
    clubOnly: offer.clubLevel > 0,
    extradata: offer.product?.extraParam || '',
    haveOffer: offer.haveOffer,
    offerIdGroup: 0
});

export const createOfferFormFromSnapshot = (snapshot: CatalogStudioOfferSnapshot): CatalogAdminOfferForm => ({
    offerId: snapshot.offerId,
    pageId: snapshot.pageId,
    itemIds: snapshot.itemIds,
    catalogName: snapshot.catalogName,
    costCredits: snapshot.costCredits,
    costPoints: snapshot.costPoints,
    pointsType: snapshot.pointsType,
    amount: snapshot.amount,
    clubOnly: snapshot.clubOnly,
    extradata: snapshot.extradata,
    haveOffer: snapshot.haveOffer,
    offerIdGroup: snapshot.offerIdClient,
    songId: snapshot.songId,
    limitedStack: snapshot.limitedStack,
    orderNumber: snapshot.orderNumber
});

export const createOfferFormFromDetails = (details: CatalogAdminOfferDetailsMessageParser): CatalogAdminOfferForm => ({
    offerId: details.offerId,
    pageId: details.pageId,
    itemIds: details.itemIds,
    catalogName: details.catalogName,
    costCredits: details.costCredits,
    costPoints: details.costPoints,
    pointsType: details.pointsType,
    amount: details.amount,
    clubOnly: details.clubOnly,
    extradata: details.extradata,
    haveOffer: details.haveOffer,
    offerIdGroup: details.offerIdGroup,
    songId: details.songId,
    limitedStack: details.limitedStack,
    orderNumber: details.orderNumber
});

/** Highest quantity one offer may sell; the hotel refuses more. */
export const CATALOG_ADMIN_MAX_OFFER_AMOUNT = 100;

/**
 * Returns the localisation key of the first problem, or null when the offer can be sent. The hotel
 * sells one furni per offer (no bundles); an item id it stored some other way may stay as it is.
 */
export const validateOfferForm = (form: CatalogAdminOfferForm, storedItemIds: string | null, limitedSells: number): string | null => {
    if (form.pageId <= 0) return 'catalog.admin.offer.error.page';
    if (!form.catalogName.trim()) return 'catalog.admin.offer.error.name';

    const itemIds = form.itemIds.trim();
    if (!itemIds) return 'catalog.admin.offer.error.items.required';
    if (itemIds !== storedItemIds?.trim() && !/^[1-9]\d*$/.test(itemIds)) return 'catalog.admin.offer.error.items.single';

    if (form.costCredits < 0 || form.costPoints < 0 || form.pointsType < 0) return 'catalog.admin.offer.error.price';
    if (form.amount < 1 || form.amount > CATALOG_ADMIN_MAX_OFFER_AMOUNT) return 'catalog.admin.offer.error.amount';
    if (form.limitedStack < limitedSells) return 'catalog.admin.offer.error.limited';

    return null;
};

const isFurniProduct = (product: IProduct | null | undefined): product is IProduct =>
    !!product && product.productClassId > 0 && (product.productType === ProductTypeEnum.FLOOR || product.productType === ProductTypeEnum.WALL);

/** The furni of an offer that the furni editor can open (every one of them for a bundle). */
export const getEditableFurniProducts = (offer: IPurchasableOffer): IProduct[] =>
    (offer.products?.length ? offer.products : [offer.product]).filter(isFurniProduct);

export const getCatalogAdminOfferIconUrl = (offer: IPurchasableOffer | null): string | null => {
    const product = offer?.product;
    if (!product) return null;

    const className = product.furnitureData?.className;
    if (isFurniProduct(product) && className?.length) {
        let param = '';

        if (product.productType === ProductTypeEnum.WALL && product.extraParam?.length) {
            param = `_${product.extraParam}`;
        } else if (product.productType === ProductTypeEnum.FLOOR && product.furnitureData?.hasIndexedColor && product.furnitureData.colorIndex > 0) {
            param = `_${product.furnitureData.colorIndex}`;
        }

        const configuredIconUrl = GetConfigurationValue<string>('furni.asset.icon.url', '');
        if (configuredIconUrl?.length) return configuredIconUrl.replace('%libname%', className).replace('%param%', param);
    }

    if (typeof product.getIconUrl !== 'function') return null;

    return product.getIconUrl(offer) ?? null;
};
