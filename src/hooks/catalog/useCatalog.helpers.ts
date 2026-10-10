import { NodeData, RoomControllerLevel, RoomObjectCategory } from '@volt/renderer';
import { CatalogNode, CatalogPage, CatalogType, ICatalogNode, ICatalogPage, IPurchasableOffer } from '../../api';

export const normalizeCatalogType = (_type?: string): string => CatalogType.NORMAL;

/** Nodes from the top-level tab down to the target; the index root is left out. */
export const getCatalogNodePath = (target: ICatalogNode): ICatalogNode[] => {
    const nodes: ICatalogNode[] = [];
    let node: ICatalogNode | null = target;

    while (node && node.parent) {
        nodes.push(node);
        node = node.parent;
    }

    return nodes.reverse();
};

export const restoreCatalogActivePath = (rootNode: ICatalogNode, activePageId: number): ICatalogNode[] => {
    const target = activePageId > -1 ? findNodeById(activePageId, rootNode, rootNode) : null;

    return target ? getCatalogNodePath(target) : [];
};

export const findNodeById = (id: number, node: ICatalogNode | null, rootNode: ICatalogNode | null): ICatalogNode | null => {
    if (!node) return null;
    if (node.pageId === id && node !== rootNode) return node;

    for (const child of node.children) {
        const found = findNodeById(id, child, rootNode);

        if (found) return found;
    }

    return null;
};

export const findNodeByName = (name: string, node: ICatalogNode | null, rootNode: ICatalogNode | null): ICatalogNode | null => {
    if (!node) return null;
    if (node.pageName === name && node !== rootNode) return node;

    for (const child of node.children) {
        const found = findNodeByName(name, child, rootNode);

        if (found) return found;
    }

    return null;
};

export const getNodesByOfferIdFromMap = (
    offerId: number,
    offersToNodes: Map<number, ICatalogNode[]> | null | undefined,
    onlyVisible: boolean = false
): ICatalogNode[] | null => {
    if (!offersToNodes || !offersToNodes.size) return null;

    if (onlyVisible) {
        const offers = offersToNodes.get(offerId);
        const visible: ICatalogNode[] = [];

        if (offers && offers.length) {
            for (const offer of offers) {
                if (offer.isVisible) visible.push(offer);
            }
        }

        if (visible.length) return visible;
    }

    return offersToNodes.get(offerId) ?? null;
};

export const buildCatalogNodeTree = (root: NodeData): { rootNode: ICatalogNode; offersToNodes: Map<number, ICatalogNode[]> } => {
    const offersToNodes: Map<number, ICatalogNode[]> = new Map();

    const walk = (node: NodeData, depth: number, parent: ICatalogNode | null): ICatalogNode => {
        const catalogNode = new CatalogNode(node, depth, parent) as ICatalogNode;

        for (const offerId of catalogNode.offerIds) {
            const existing = offersToNodes.get(offerId);

            if (existing) existing.push(catalogNode);
            else offersToNodes.set(offerId, [catalogNode]);
        }

        for (const child of node.children) catalogNode.addChild(walk(child, depth + 1, catalogNode));

        return catalogNode;
    };

    return { rootNode: walk(root, 0, null), offersToNodes };
};

export const replaceCatalogPageOffers = (page: ICatalogPage, offers: IPurchasableOffer[]): CatalogPage => {
    return new CatalogPage(page.pageId, page.layoutCode, page.localization, offers, page.acceptSeasonCurrencyAsCredits, page.mode);
};

export { RoomControllerLevel, RoomObjectCategory };
