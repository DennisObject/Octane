import {
    FlatControllerAddedEvent,
    FlatControllerRemovedEvent,
    FlatControllersEvent,
    RemoveAllRightsMessageComposer,
    RoomGiveRightsComposer,
    RoomTakeRightsComposer,
    RoomUsersWithRightsComposer
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { UserProfileIconView } from '../../../../common';
import { useFriends, useMessageEvent } from '../../../../hooks';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

// Polaris Staff Chat is not a real friend; keep it out of the rights picker.
const STAFF_CHAT_ID = -1;
const STAFF_CHAT_NAME = 'Staff Chat';

export const NavigatorRoomSettingsRightsTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null } = props;
    const [usersWithRights, setUsersWithRights] = useState<Map<number, string>>(new Map());
    const [filter, setFilter] = useState<string>('');
    const { onlineFriends = [], offlineFriends = [] } = useFriends();
    const pendingActionsRef = useRef<Set<string>>(new Set());

    const guardedSend = (key: string, composer: any) => {
        if (pendingActionsRef.current.has(key)) return;

        pendingActionsRef.current.add(key);
        SendMessageComposer(composer);

        setTimeout(() => pendingActionsRef.current.delete(key), 2000);
    };

    // v75 loads arrow_move_left/right from ${image.library.url}Events/ (ros_flat_controller_xml / ros_friend_xml).
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const allFriendsRaw = [...onlineFriends, ...offlineFriends];

    const allFriends = allFriendsRaw.filter((friend) => {
        if (friend.id === STAFF_CHAT_ID) return false;
        if (friend.name === STAFF_CHAT_NAME) return false;
        if (friend.id <= 0) return false;

        return true;
    });

    const filteredUsersWithRights = new Map(
        Array.from(usersWithRights.entries()).filter(([id, name]) => {
            if (id === STAFF_CHAT_ID) return false;
            if (name === STAFF_CHAT_NAME) return false;
            if (id <= 0) return false;

            return true;
        })
    );

    const friendsWithoutRights = allFriends.filter((friend) => !filteredUsersWithRights.has(friend.id));

    // The v75 filter box narrows both lists by name (`_r890bf3b741b447`).
    const query = filter.trim().toLowerCase();
    const shownUsersWithRights = Array.from(filteredUsersWithRights.entries()).filter(([id, name]) => !query || name.toLowerCase().includes(query));
    const shownFriends = friendsWithoutRights.filter((friend) => !query || friend.name.toLowerCase().includes(query));

    useMessageEvent<FlatControllersEvent>(FlatControllersEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights(parser.users);
    });

    useMessageEvent<FlatControllerAddedEvent>(FlatControllerAddedEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.set(parser.data.userId, parser.data.userName);

            return newValue;
        });
    });

    useMessageEvent<FlatControllerRemovedEvent>(FlatControllerRemovedEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setUsersWithRights((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.delete(parser.userId);

            return newValue;
        });
    });

    useEffect(() => {
        if (!roomData) return;

        SendMessageComposer(new RoomUsersWithRightsComposer(roomData.roomId));
    }, [roomData]);

    return (
        <div className="ros-tab ros-tab-wide" style={{ height: 364 }}>
            <NavigatorRoomSettingsAtView className="ros-search" h={42} w={322} x={0} y={1} />
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={17} w={138} x={6} y={13}>
                {LocalizeText('navigator.flatctrls.filter')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView h={23} w={216} x={97} y={9}>
                <input className="ros-input" value={filter} onChange={(event) => setFilter(event.target.value)} />
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-multi" h={34} w={150} x={0} y={44}>
                {LocalizeText(
                    'navigator.flatctrls.userswithrights',
                    ['displayed', 'total'],
                    [shownUsersWithRights.length.toString(), filteredUsersWithRights.size.toString()]
                )}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-multi" h={34} w={150} x={175} y={44}>
                {LocalizeText('navigator.flatctrls.friends', ['displayed', 'total'], [shownFriends.length.toString(), friendsWithoutRights.length.toString()])}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-list-border" h={289} w={150} x={0} y={74}>
                <div className="ros-list" style={{ height: 246 }}>
                    {shownUsersWithRights.map(([id, name]) => (
                        <div key={id} className="ros-user-row">
                            <button type="button" className="ros-user-bg" onClick={() => guardedSend(`take_${id}`, new RoomTakeRightsComposer(id))}>
                                <span className="ros-user-name">{name}</span>
                                <img alt="" className="ros-user-arrow is-rights" draggable={false} src={`${imageLibraryUrl}Events/arrow_move_right.png`} />
                            </button>
                            <UserProfileIconView className="ros-user-eye" userId={id} />
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className="ros-button ros-button-thick"
                    disabled={!filteredUsersWithRights.size}
                    style={{ left: 4, top: 256, width: 142, height: 29 }}
                    onClick={() => roomData && guardedSend('removeAll', new RemoveAllRightsMessageComposer(roomData.roomId))}
                >
                    {LocalizeText('navigator.flatctrls.clear')}
                </button>
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-list-border" h={289} w={150} x={173} y={74}>
                <div className="ros-list" style={{ height: 281 }}>
                    {shownFriends.map((friend) => (
                        <div key={friend.id} className="ros-user-row">
                            <button
                                type="button"
                                className="ros-user-bg"
                                onClick={() => guardedSend(`give_${friend.id}`, new RoomGiveRightsComposer(friend.id))}
                            >
                                <span className="ros-user-name">{friend.name}</span>
                                <img alt="" className="ros-user-arrow is-friend" draggable={false} src={`${imageLibraryUrl}Events/arrow_move_left.png`} />
                            </button>
                            <UserProfileIconView className="ros-user-eye" userId={friend.id} />
                        </div>
                    ))}
                </div>
            </NavigatorRoomSettingsAtView>
        </div>
    );
};
