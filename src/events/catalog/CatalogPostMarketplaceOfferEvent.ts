import { FurnitureItem } from '../../api';
import { CatalogEvent } from '.';

export class CatalogPostMarketplaceOfferEvent extends CatalogEvent {
    public static readonly POST_MARKETPLACE = 'CE_POST_MARKETPLACE';

    private _item: FurnitureItem;
    private _itemIds: number[];

    constructor(item: FurnitureItem, itemIds: number[] = [item.id]) {
        super(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE);
        this._item = item;
        this._itemIds = itemIds;
    }

    public get item(): FurnitureItem {
        return this._item;
    }

    /** Ids of the stacked items that can be put up for sale. */
    public get itemIds(): number[] {
        return this._itemIds;
    }
}
