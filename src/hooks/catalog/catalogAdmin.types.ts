import type { IPurchasableOffer } from '../../api/catalog/IPurchasableOffer';
import type { ICatalogNode } from '../../api/catalog/ICatalogNode';
import type { CatalogStudioCatalogType, CatalogStudioHistoryGroup, CatalogStudioOfferSnapshot, CatalogStudioPageSnapshot } from './catalogStudio.types';

/** The page fields the editor sends; mirrors CatalogAdminSave/CreatePageComposer. */
export interface CatalogAdminPageForm {
    pageId: number | null;
    caption: string;
    captionSave: string;
    parentId: number;
    catalogMode: string;
    pageLayout: string;
    iconColor: number;
    iconImage: number;
    minRank: number;
    orderNum: number;
    visible: boolean;
    enabled: boolean;
    clubOnly: boolean;
    vipOnly: boolean;
    pageHeadline: string;
    pageTeaser: string;
    pageSpecial: string;
    pageText1: string;
    pageText2: string;
    pageTextDetails: string;
    pageTextTeaser: string;
    roomId: number;
    includes: string;
}

/** The offer fields the editor sends; mirrors CatalogAdminSave/CreateOfferComposer. */
export interface CatalogAdminOfferForm {
    offerId: number | null;
    pageId: number;
    itemIds: string;
    catalogName: string;
    costCredits: number;
    costPoints: number;
    pointsType: number;
    amount: number;
    clubOnly: boolean;
    extradata: string;
    haveOffer: boolean;
    offerIdGroup: number;
    songId: number;
    limitedStack: number;
    orderNumber: number;
}

/**
 * Which page the page editor is open for. The catalog type is captured when the editor
 * opens, so switching between the normal and Builders Club catalog never redirects a save.
 */
export type CatalogAdminPageEditorTarget =
    | { kind: 'create'; parent: ICatalogNode; catalogType: string }
    | { kind: 'edit'; node: ICatalogNode; catalogType: string };

export interface CatalogAdminOfferEditorTarget {
    /** null while creating a new offer. */
    offerId: number | null;
    pageId: number;
    catalogType: string;
    /** The live catalog offer, used as a placeholder until the server sends the stored row. */
    offer: IPurchasableOffer | null;
}

export type CatalogAdminSmartSaveAction = 'createPage' | 'savePage' | 'createOffer' | 'saveOffer';

export interface CatalogAdminMutationResult {
    operationId: string;
    action: CatalogAdminSmartSaveAction;
    success: boolean;
    code: string;
    message: string;
    entityType: 'PAGE' | 'OFFER';
    catalogType: CatalogStudioCatalogType;
    entityId: number;
    entity: CatalogStudioPageSnapshot | CatalogStudioOfferSnapshot | null;
    historyGroup: CatalogStudioHistoryGroup | null;
    fieldErrors: Record<string, string>;
    acknowledgedAt: number;
}

export interface CatalogAdminOfferOrder {
    id: number;
    orderNumber: number;
}

export interface CatalogAdminStatus {
    tone: 'error' | 'success' | 'pending';
    message: string;
}
