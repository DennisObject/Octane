import { FC } from 'react';
import { MessengerFriend } from '../../../../../api';
import { FriendsListGroupItemView } from './FriendsListGroupItemView';

interface FriendsListGroupViewProps {
    list: MessengerFriend[];
    selectedFriendsIds: number[];
    selectFriend: (userId: number) => void;
    rowStartIndex?: number;
}

export const FriendsListGroupView: FC<FriendsListGroupViewProps> = (props) => {
    const { list = null, selectedFriendsIds = null, selectFriend = null, rowStartIndex = 0 } = props;

    if (!list || !list.length) return null;

    return (
        <>
            {list.map((item, index) => (
                <FriendsListGroupItemView
                    key={item.id}
                    rowIndex={rowStartIndex + index}
                    friend={item}
                    selected={selectedFriendsIds && selectedFriendsIds.indexOf(item.id) >= 0}
                    selectFriend={selectFriend}
                />
            ))}
        </>
    );
};
