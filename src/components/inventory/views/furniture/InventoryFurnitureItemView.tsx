import { MouseEventType } from '@volt/renderer';
import { FC, MouseEvent, useState } from 'react';
import { attemptItemPlacement, GroupItem } from '../../../../api';
import { classNames, InfiniteGrid } from '../../../../layout';
import { InventoryThumbIconView } from '../InventoryThumbIconView';

export const InventoryFurnitureItemView: FC<{
    groupItem: GroupItem;
    isActive: boolean;
    onSelect: (groupItem: GroupItem) => void;
    // Set while a trade is open: v75 offers the item on double click and never drags it into the room.
    onOffer?: (groupItem: GroupItem) => void;
}> = (props) => {
    const { groupItem = null, isActive = false, onSelect = null, onOffer = null } = props;
    const [isMouseDown, setMouseDown] = useState(false);

    const onMouseEvent = (event: MouseEvent) => {
        switch (event.type) {
            case MouseEventType.MOUSE_DOWN:
                onSelect?.(groupItem);
                setMouseDown(true);
                return;
            case MouseEventType.MOUSE_UP:
                setMouseDown(false);
                return;
            case MouseEventType.ROLL_OUT:
                if (onOffer || !isMouseDown || !isActive) return;

                attemptItemPlacement(groupItem);
                return;
            case 'dblclick':
                if (onOffer) onOffer(groupItem);
                else attemptItemPlacement(groupItem);
                return;
        }
    };

    const count = groupItem.getUnlockedCount();

    return (
        <InfiniteGrid.Item
            className={classNames('volt-inventory-thumb', isActive && 'is-selected', groupItem.hasUnseenItems && 'is-unseen', !count && 'opacity-50')}
            itemActive={isActive}
            itemCount={count}
            itemImage={groupItem.stuffData.uniqueNumber > 0 ? groupItem.iconUrl : undefined}
            itemUniqueNumber={groupItem.stuffData.uniqueNumber}
            itemUnseen={groupItem.hasUnseenItems}
            onDoubleClick={onMouseEvent}
            onMouseDown={onMouseEvent}
            onMouseOut={onMouseEvent}
            onMouseUp={onMouseEvent}
        >
            {groupItem.stuffData.uniqueNumber <= 0 && <InventoryThumbIconView iconUrl={groupItem.iconUrl} />}
        </InfiniteGrid.Item>
    );
};
