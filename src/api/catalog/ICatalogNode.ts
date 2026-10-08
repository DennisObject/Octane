export interface ICatalogNode {
    addChild(node: ICatalogNode): void;
    /** Unique per node. Folder headings all share pageId -1, so the node is never identified by its page. */
    readonly id: number;
    readonly depth: number;
    readonly isBranch: boolean;
    readonly isLeaf: boolean;
    readonly localization: string;
    readonly pageId: number;
    readonly parentId: number;
    readonly pageName: string;
    readonly iconId: number;
    readonly children: ICatalogNode[];
    readonly offerIds: number[];
    readonly parent: ICatalogNode;
    readonly isVisible: boolean;
}
