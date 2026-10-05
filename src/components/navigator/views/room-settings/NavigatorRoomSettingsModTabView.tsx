import { BannedUserData, BannedUsersFromRoomEvent, RoomBannedUsersComposer, RoomModerationSettings, RoomUnbanUserComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { UserProfileIconView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { NavigatorRoomSettingsAtView } from './NavigatorRoomSettingsAtView';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsModTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null } = props;
    const [selectedUserId, setSelectedUserId] = useState<number>(-1);
    const [bannedUsers, setBannedUsers] = useState<BannedUserData[]>([]);

    const unBanUser = (userId: number) => {
        setBannedUsers((prevValue) => {
            const newValue = [...prevValue];

            const index = newValue.findIndex((value) => value.userId === userId);

            if (index >= 0) newValue.splice(index, 1);

            return newValue;
        });

        SendMessageComposer(new RoomUnbanUserComposer(userId, roomData.roomId));

        setSelectedUserId(-1);
    };

    useMessageEvent<BannedUsersFromRoomEvent>(BannedUsersFromRoomEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setBannedUsers(parser.bannedUsers);
    });

    useEffect(() => {
        SendMessageComposer(new RoomBannedUsersComposer(roomData.roomId));
    }, [roomData.roomId]);

    const selectedUser = selectedUserId > 0 ? bannedUsers.find((user) => user.userId === selectedUserId) : null;

    return (
        <div className="ros-tab ros-tab-wide" style={{ height: 356 }}>
            <NavigatorRoomSettingsAtView className="ros-text ros-multi" h={37} w={317} x={6} y={5}>
                {LocalizeText('navigator.roomsettings.moderation.header')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={24} w={276} x={7} y={42}>
                {LocalizeText('navigator.roomsettings.moderation.mute.header')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={276} x={10} y={61}>
                <select
                    className="ros-select"
                    value={roomData.moderationSettings.allowMute}
                    onChange={(event) => handleChange('moderation_mute', event.target.value)}
                >
                    <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                    <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>{LocalizeText('navigator.roomsettings.moderation.rights')}</option>
                </select>
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={20} w={273} x={7} y={92}>
                {LocalizeText('navigator.roomsettings.moderation.kick.header')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={276} x={10} y={112}>
                <select
                    className="ros-select"
                    value={roomData.moderationSettings.allowKick}
                    onChange={(event) => handleChange('moderation_kick', event.target.value)}
                >
                    <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                    <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>{LocalizeText('navigator.roomsettings.moderation.rights')}</option>
                    <option value={RoomModerationSettings.MODERATION_LEVEL_ALL}>{LocalizeText('navigator.roomsettings.moderation.all')}</option>
                </select>
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={21} w={292} x={7} y={142}>
                {LocalizeText('navigator.roomsettings.moderation.ban.header')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={276} x={10} y={161}>
                <select
                    className="ros-select"
                    value={roomData.moderationSettings.allowBan}
                    onChange={(event) => handleChange('moderation_ban', event.target.value)}
                >
                    <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                    <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>{LocalizeText('navigator.roomsettings.moderation.rights')}</option>
                </select>
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-list-border" h={156} w={172} x={8} y={200}>
                <div className="ros-list" style={{ left: 3, top: 3, width: 146, height: 150 }}>
                    {bannedUsers.map((user) => (
                        <div key={user.userId} className={`ros-user-row${selectedUserId === user.userId ? ' is-selected' : ''}`}>
                            <button type="button" className="ros-user-bg" onClick={(event) => setSelectedUserId(user.userId)}>
                                <span className="ros-user-name">{user.userName}</span>
                            </button>
                            <UserProfileIconView className="ros-user-eye" userId={user.userId} />
                        </div>
                    ))}
                </div>
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text" h={23} w={125} x={190} y={236}>
                {`${LocalizeText('navigator.roomsettings.moderation.banned.users')} (${bannedUsers.length})`}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView h={32} x={190} y={261}>
                <button type="button" className="ros-button ros-button-fit" disabled={selectedUserId <= 0} onClick={(event) => unBanUser(selectedUserId)}>
                    <span className="ros-button-label">
                        {LocalizeText('navigator.roomsettings.moderation.unban')} {selectedUser?.userName}
                    </span>
                </button>
            </NavigatorRoomSettingsAtView>
        </div>
    );
};
