import type { NodeData } from '@octane/renderer';
import { CatalogNode } from '../../api/catalog/CatalogNode';
import type { ICatalogNode } from '../../api/catalog/ICatalogNode';
import { parseCatalogTabLabel } from '../../components/catalog/catalogTabLabel';
import type { CatalogStudioCatalogType, CatalogStudioPageSnapshot } from './catalogStudio.types';

/** Drag payload type for catalog pages, shared by the catalog navigation and the manager tree. */
export const CATALOG_ADMIN_PAGE_DRAG_TYPE = 'application/x-catalog-admin-page';

export const toStudioCatalogType = (catalogType: string): CatalogStudioCatalogType =>
    catalogType === 'BUILDERS_CLUB' || catalogType === 'BUILDER' ? 'BUILDER' : 'NORMAL';

const stripSwfSuffix = (label: string) => (label || '').replace(/\s*\(\D[^)]*\)\s*$/g, '').trim();

export const getCatalogAdminNodeName = (node: ICatalogNode): string => stripSwfSuffix(parseCatalogTabLabel(node.localization).name) || node.pageName;

export const findCatalogAdminNode = (node: ICatalogNode | null, pageId: number): ICatalogNode | null => {
    if (!node) return null;
    if (node.pageId === pageId) return node;

    for (const child of node.children) {
        const found = findCatalogAdminNode(child, pageId);
        if (found) return found;
    }

    return null;
};

export const catalogAdminSubtreeMatches = (node: ICatalogNode, query: string): boolean => {
    if (!query) return true;
    if (getCatalogAdminNodeName(node).toLowerCase().includes(query)) return true;

    return node.children.some((child) => catalogAdminSubtreeMatches(child, query));
};

/** Reads the page id written by a catalog admin page drag, or null for any other drag. */
export const readCatalogAdminPageDrag = (dataTransfer: DataTransfer): number | null => {
    const pageId = Number(dataTransfer.getData(CATALOG_ADMIN_PAGE_DRAG_TYPE));

    return Number.isInteger(pageId) && pageId > 0 ? pageId : null;
};

const collectLiveNodes = (node: ICatalogNode | null, result: Map<number, ICatalogNode>) => {
    if (!node) return;
    result.set(node.pageId, node);
    node.children.forEach((child) => collectLiveNodes(child, result));
};

const nodeData = (page: CatalogStudioPageSnapshot, liveNode: ICatalogNode | undefined): NodeData =>
    ({
        visible: page.visible,
        icon: page.iconImage,
        pageId: page.pageId,
        parentId: page.parentId,
        pageName: page.captionSave || liveNode?.pageName || `page-${page.pageId}`,
        localization: page.caption || liveNode?.localization || page.captionSave || `Page ${page.pageId}`,
        children: [],
        offerIds: liveNode?.offerIds ?? []
    }) as unknown as NodeData;

const rootData = (root: ICatalogNode): NodeData =>
    ({
        visible: true,
        icon: root.iconId,
        pageId: root.pageId,
        parentId: root.parentId,
        pageName: root.pageName || 'root',
        localization: root.localization,
        children: [],
        offerIds: root.offerIds
    }) as unknown as NodeData;

export type CatalogAdminPageDropPosition = 'before' | 'inside' | 'after' | 'root';

export interface CatalogAdminPageMovePlan {
    pageId: number;
    newParentId: number;
    newIndex: number;
}

export const resolveCatalogAdminPageDropPosition = (pointerY: number, rowTop: number, rowHeight: number): Exclude<CatalogAdminPageDropPosition, 'root'> => {
    const ratio = rowHeight > 0 ? (pointerY - rowTop) / rowHeight : 0.5;
    if (ratio <= 0.25) return 'before';
    if (ratio >= 0.75) return 'after';
    return 'inside';
};

const nodeContains = (ancestor: ICatalogNode, node: ICatalogNode | null) => {
    let current = node;
    while (current) {
        if (current.pageId === ancestor.pageId) return true;
        current = current.parent;
    }
    return false;
};

export const planCatalogAdminPageDrop = (
    dragged: ICatalogNode | null | undefined,
    target: ICatalogNode | null | undefined,
    position: CatalogAdminPageDropPosition,
    root: ICatalogNode | null | undefined
): CatalogAdminPageMovePlan | null => {
    if (!dragged || !root || dragged.pageId <= 0) return null;
    if (target?.pageId === dragged.pageId) return null;

    let parent = root;
    let insertionIndex = root.children.length;

    if (position !== 'root') {
        if (!target) return null;

        if (position === 'inside') {
            parent = target;
            insertionIndex = target.children.length;
        } else {
            parent = target.parent ?? root;
            const targetIndex = parent.children.indexOf(target);
            if (targetIndex < 0) return null;
            insertionIndex = targetIndex + (position === 'after' ? 1 : 0);
        }
    }

    if (nodeContains(dragged, parent)) return null;

    const sourceParent = dragged.parent;
    if (sourceParent?.pageId === parent.pageId) {
        const sourceIndex = sourceParent.children.indexOf(dragged);
        if (sourceIndex >= 0 && sourceIndex < insertionIndex) insertionIndex--;
        if (sourceIndex === insertionIndex) return null;
    }

    return {
        pageId: dragged.pageId,
        newParentId: parent === root ? -1 : parent.pageId,
        newIndex: Math.max(0, insertionIndex)
    };
};

export const buildCatalogAdminDraftTree = (liveRoot: ICatalogNode | null, pages: CatalogStudioPageSnapshot[], catalogType: string): ICatalogNode | null => {
    if (!liveRoot) return null;

    const scopedPages = pages.filter((page) => page.catalogType === toStudioCatalogType(catalogType));
    if (!scopedPages.length) return liveRoot;

    const liveNodes = new Map<number, ICatalogNode>();
    collectLiveNodes(liveRoot, liveNodes);

    const pageIds = new Set(scopedPages.map((page) => page.pageId));
    const childrenByParent = new Map<number, CatalogStudioPageSnapshot[]>();
    const roots: CatalogStudioPageSnapshot[] = [];

    for (const page of scopedPages) {
        if (!pageIds.has(page.parentId)) {
            roots.push(page);
            continue;
        }

        const siblings = childrenByParent.get(page.parentId) ?? [];
        siblings.push(page);
        childrenByParent.set(page.parentId, siblings);
    }

    const sortPages = (items: CatalogStudioPageSnapshot[]) => items.sort((left, right) => left.orderNum - right.orderNum || left.pageId - right.pageId);

    sortPages(roots);
    childrenByParent.forEach(sortPages);

    const draftRoot = new CatalogNode(rootData(liveRoot), 0, null);
    const visited = new Set<number>();

    const append = (page: CatalogStudioPageSnapshot, parent: ICatalogNode, depth: number): ICatalogNode | null => {
        if (visited.has(page.pageId)) return null;
        visited.add(page.pageId);

        const node = new CatalogNode(nodeData(page, liveNodes.get(page.pageId)), depth, parent);
        for (const child of childrenByParent.get(page.pageId) ?? []) {
            append(child, node, depth + 1);
        }
        parent.addChild(node);
        return node;
    };

    roots.forEach((page) => append(page, draftRoot, 1));
    scopedPages.forEach((page) => {
        if (!visited.has(page.pageId)) append(page, draftRoot, 1);
    });

    return draftRoot;
};
