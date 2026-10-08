import { NodeData } from '@octane/renderer';
import { ICatalogNode } from './ICatalogNode';

let nextNodeId = 1;

export class CatalogNode implements ICatalogNode {
    private readonly _id: number = nextNodeId++;
    private _depth: number = 0;
    private _localization: string = '';
    private _pageId: number = -1;
    private _parentId: number = -1;
    private _pageName: string = '';
    private _iconId: number = 0;
    private _children: ICatalogNode[];
    private _offerIds: number[];
    private _parent: ICatalogNode;
    private _isVisible: boolean;

    constructor(node: NodeData, depth: number, parent: ICatalogNode) {
        this._depth = depth;
        this._parent = parent;
        this._localization = node.localization;
        this._pageId = node.pageId;
        this._parentId = node.parentId;
        this._pageName = node.pageName;
        this._iconId = node.icon;
        this._children = [];
        this._offerIds = node.offerIds;
        this._isVisible = node.visible;
    }

    public addChild(child: ICatalogNode): void {
        if (!child) return;

        this._children.push(child);
    }

    public get id(): number {
        return this._id;
    }

    public get depth(): number {
        return this._depth;
    }

    public get isBranch(): boolean {
        return this._children.length > 0;
    }

    public get isLeaf(): boolean {
        return this._children.length === 0;
    }

    public get localization(): string {
        return this._localization;
    }

    public get pageId(): number {
        return this._pageId;
    }

    public get parentId(): number {
        return this._parentId;
    }

    public get pageName(): string {
        return this._pageName;
    }

    public get iconId(): number {
        return this._iconId;
    }

    public get children(): ICatalogNode[] {
        return this._children;
    }

    public get offerIds(): number[] {
        return this._offerIds;
    }

    public get parent(): ICatalogNode {
        return this._parent;
    }

    public get isVisible(): boolean {
        return this._isVisible;
    }
}
