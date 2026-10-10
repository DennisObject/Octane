import { IObjectData, TradingListAddItemComposer, TradingListAddItemsComposer } from '@octane/renderer';
import {
    FurniCategory,
    GroupItem,
    getGuildFurniType,
    IFurnitureItem,
    LocalizeText,
    NotificationAlertType,
    SendMessageComposer,
    TradeUserData
} from '../../../../api';

export const MAX_ITEMS_TO_TRADE: number = 9;
const MAX_TRADE_ITEM_COUNT: number = 1500;

const canTradeGroupedItem = (ownUser: TradeUserData, isWallItem: boolean, spriteId: number, category: number, stuffData: IObjectData) =>
{
    if (!ownUser || ownUser.accepts || !ownUser.userItems) return false;

    if (ownUser.userItems.length < MAX_ITEMS_TO_TRADE) return true;

    let type = spriteId.toString();

    if (category === FurniCategory.POSTER)
    {
        type = type + 'poster' + stuffData.getLegacyString();
    }
    else if (category === FurniCategory.GUILD_FURNI)
    {
        type = getGuildFurniType(spriteId, stuffData);
    }
    else
    {
        type = (isWallItem ? 'I' : 'S') + type;
    }

    return !!ownUser.userItems.getValue(type);
};

/** Adds up to count of the group's tradable items to the open trade; returns how many ids were sent. */
export const offerGroupItemsToTrade = (
    ownUser: TradeUserData,
    groupItem: GroupItem,
    count: number,
    showAlert: (message: string, type: string, link: string, linkTitle: string, title: string) => void
): number =>
{
    if (!ownUser || !groupItem) return 0;

    const tradeItems = groupItem.getTradeItems(count);

    if (!tradeItems || !tradeItems.length) return 0;

    let coreItem: IFurnitureItem = null;
    const itemIds: number[] = [];

    for (const item of tradeItems)
    {
        itemIds.push(item.id);

        if (!coreItem) coreItem = item;
    }

    if (ownUser.itemCount + itemIds.length > MAX_TRADE_ITEM_COUNT)
    {
        showAlert(
            LocalizeText('trading.items.too_many_items.desc'),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('trading.items.too_many_items.title')
        );

        return 0;
    }

    if (!coreItem.isGroupable)
    {
        SendMessageComposer(new TradingListAddItemComposer(itemIds[itemIds.length - 1]));

        return 1;
    }

    const tradeIds = canTradeGroupedItem(ownUser, coreItem.isWallItem, coreItem.type, coreItem.category, coreItem.stuffData) ? itemIds : [];

    if (!tradeIds.length) return 0;

    if (tradeIds.length === 1) SendMessageComposer(new TradingListAddItemComposer(tradeIds[0]));
    else SendMessageComposer(new TradingListAddItemsComposer(...tradeIds));

    return tradeIds.length;
};
