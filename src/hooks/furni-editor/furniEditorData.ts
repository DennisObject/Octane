import type { CatalogRefData, FurniDetailData, FurniItemData } from '@octane/renderer';

// Client-side shapes of the furni editor packets (10040-10049). The parser
// classes are mapped into plain objects so React state never holds a parser
// instance the renderer may flush and reuse.

export interface FurniItem {
    id: number;
    spriteId: number;
    itemName: string;
    publicName: string;
    type: string;
    width: number;
    length: number;
    stackHeight: number;
    allowStack: boolean;
    allowWalk: boolean;
    allowSit: boolean;
    allowLay: boolean;
    interactionType: string;
    interactionModesCount: number;
}

export interface FurniDetail extends FurniItem {
    allowGift: boolean;
    allowTrade: boolean;
    allowRecycle: boolean;
    allowMarketplaceSell: boolean;
    allowInventoryStack: boolean;
    vendingIds: string;
    customparams: string;
    effectIdMale: number;
    effectIdFemale: number;
    clothingOnWalk: string;
    multiheight: string;
    description: string;
    usageCount: number;
}

export interface CatalogRef {
    id: number;
    catalogName: string;
    costCredits: number;
    costPoints: number;
    pointsType: number;
    pageId: number;
    pageName: string;
}

/** The furnidata.json entry the server resolved for the open furni. */
export type FurniDataEntry = Readonly<Record<string, unknown>>;

/** How the server resolved that entry (reason codes come from the emulator). */
export interface FurniDataDiagnostic {
    reason: string;
    sourcePath: string;
    sourceStatus: string;
    message: string;
}

export interface FurniEditorDetail {
    item: FurniDetail;
    catalogItems: CatalogRef[];
    furniDataEntry: FurniDataEntry | null;
    furniDataDiagnostic: FurniDataDiagnostic | null;
}

export interface FurniImportResult {
    itemId: number;
    found: boolean;
    name: string;
    description: string;
    classname: string;
    /** Increments per answer so the same text imported twice still applies. */
    sequence: number;
}

export interface FurniSearchCriteria {
    query: string;
    type: '' | 's' | 'i';
    page: number;
    sortField: FurniSortField;
    sortDir: 'asc' | 'desc';
}

export type FurniSortField = 'id' | 'spriteId' | 'itemName' | 'publicName' | 'type' | 'interactionType';

export const DEFAULT_SEARCH_CRITERIA: FurniSearchCriteria = { query: '', type: '', page: 1, sortField: 'id', sortDir: 'asc' };

/** Rows per page of the server search (FurniEditorSearchEvent.PAGE_SIZE). */
export const SEARCH_PAGE_SIZE = 20;

export const toFurniItem = (data: FurniItemData): FurniItem => ({
    id: data.id,
    spriteId: data.spriteId,
    itemName: data.itemName ?? '',
    publicName: data.publicName ?? '',
    type: data.type ?? '',
    width: data.width,
    length: data.length,
    stackHeight: data.stackHeight,
    allowStack: data.allowStack,
    allowWalk: data.allowWalk,
    allowSit: data.allowSit,
    allowLay: data.allowLay,
    interactionType: data.interactionType ?? '',
    interactionModesCount: data.interactionModesCount
});

export const toFurniDetail = (data: FurniDetailData): FurniDetail => ({
    ...toFurniItem(data),
    allowGift: data.allowGift,
    allowTrade: data.allowTrade,
    allowRecycle: data.allowRecycle,
    allowMarketplaceSell: data.allowMarketplaceSell,
    allowInventoryStack: data.allowInventoryStack,
    vendingIds: data.vendingIds ?? '',
    customparams: data.customparams ?? '',
    effectIdMale: data.effectIdMale,
    effectIdFemale: data.effectIdFemale,
    clothingOnWalk: data.clothingOnWalk ?? '',
    multiheight: data.multiheight ?? '',
    description: data.description ?? '',
    usageCount: data.usageCount
});

export const toCatalogRef = (data: CatalogRefData): CatalogRef => ({
    id: data.id,
    catalogName: data.catalogName ?? '',
    costCredits: data.costCredits,
    costPoints: data.costPoints,
    pointsType: data.pointsType,
    pageId: data.pageId,
    pageName: data.pageName ?? ''
});

/** A non-empty JSON object, or null for '', '{}', arrays, primitives and broken JSON. */
export const parseJsonObject = (json: string): Record<string, unknown> | null => {
    if (!json) return null;

    try {
        const value: unknown = JSON.parse(json);

        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

        return Object.keys(value).length ? (value as Record<string, unknown>) : null;
    } catch {
        return null;
    }
};

/** A scalar entry value as text; objects and arrays read as empty. */
export const entryText = (entry: FurniDataEntry | Record<string, unknown> | null, key: string): string => {
    const value = entry?.[key];

    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    return '';
};

export const toDiagnostic = (json: string): FurniDataDiagnostic | null => {
    const value = parseJsonObject(json);

    if (!value) return null;

    return {
        reason: entryText(value, 'reason'),
        sourcePath: entryText(value, 'sourcePath'),
        sourceStatus: entryText(value, 'sourceStatus'),
        message: entryText(value, 'message')
    };
};
