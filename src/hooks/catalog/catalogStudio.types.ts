export interface CatalogStudioActor {
    id: number;
    username: string;
}

export interface CatalogStudioPublishedVersion {
    id: number;
    label: string;
    publishedAt: string;
}

export type CatalogStudioCatalogType = 'NORMAL';

export interface CatalogStudioPageSnapshot {
    catalogType: CatalogStudioCatalogType;
    pageId: number;
    parentId: number;
    captionSave: string;
    caption: string;
    pageLayout: string;
    iconColor: number;
    iconImage: number;
    requiredPermission: string;
    orderNum: number;
    visible: boolean;
    enabled: boolean;
    clubOnly: boolean;
    catalogMode: string;
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

export interface CatalogStudioOfferSnapshot {
    catalogType: CatalogStudioCatalogType;
    offerId: number;
    itemIds: string;
    pageId: number;
    catalogName: string;
    costCredits: number;
    costPoints: number;
    pointsType: number;
    amount: number;
    limitedStack: number;
    orderNumber: number;
    offerIdClient: number;
    songId: number;
    extradata: string;
    haveOffer: boolean;
    clubOnly: boolean;
}

export interface CatalogStudioSession {
    activeVersionId: number;
    draftVersionId: number;
    revision: number;
    activeUpdatedAt: string;
    draftCreatedAt: string;
    pendingCount: number;
    actors: CatalogStudioActor[];
    validationCurrent: boolean;
    validationIssueCount: number;
    publishedVersions: CatalogStudioPublishedVersion[];
    pages: CatalogStudioPageSnapshot[];
    offers: CatalogStudioOfferSnapshot[];
}

export interface CatalogStudioHistoryEntry {
    entityType: string;
    catalogType?: CatalogStudioCatalogType;
    entityId: number;
    operation: string;
}

export interface CatalogStudioHistoryGroup {
    id: number;
    revision: number;
    actorId: number;
    actorName: string;
    summary: string;
    source: string;
    createdAt: string;
    entries: CatalogStudioHistoryEntry[];
}

export interface CatalogStudioMutationResult {
    operationId: string;
    action: 'createPage' | 'savePage' | 'createOffer' | 'saveOffer';
    revision: number;
    entityType: 'PAGE' | 'OFFER';
    catalogType: CatalogStudioCatalogType;
    entity: CatalogStudioPageSnapshot | CatalogStudioOfferSnapshot;
    historyGroup: CatalogStudioHistoryGroup;
}

/** History operations the server can undo; creates, deletes and reorders cannot be. */
export const CATALOG_STUDIO_UNDOABLE_OPERATIONS: readonly string[] = ['UPDATE', 'MOVE'];
