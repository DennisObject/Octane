import { BannedUserData, BannedUsersFromRoomEvent, RoomBannedUsersComposer, RoomModerationSettings, RoomUnbanUserComposer } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { ClassicScrollAreaView, UserProfileIconView } from '../../../../common';
import { HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';
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

    return (
        <div className="ros-tab ros-tab-wide" style={{ height: 356 }}>
            <NavigatorRoomSettingsAtView className="ros-text ros-multi" h={37} w={317} x={6} y={5}>
                {LocalizeText('navigator.roomsettings.moderation.header')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={24} w={276} x={7} y={42}>
                {LocalizeText('navigator.roomsettings.moderation.mute.header')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={276} x={10} y={61}>
                <HabboDropMenuView
                    label={LocalizeText('navigator.roomsettings.moderation.mute.header')}
                    value={roomData.moderationSettings.allowMute}
                    options={[
                        { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                        { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') }
                    ]}
                    onSelect={(value) => handleChange('moderation_mute', value)}
                />
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={20} w={273} x={7} y={92}>
                {LocalizeText('navigator.roomsettings.moderation.kick.header')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={276} x={10} y={112}>
                <HabboDropMenuView
                    label={LocalizeText('navigator.roomsettings.moderation.kick.header')}
                    value={roomData.moderationSettings.allowKick}
                    options={[
                        { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                        { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') },
                        { value: RoomModerationSettings.MODERATION_LEVEL_ALL, label: LocalizeText('navigator.roomsettings.moderation.all') }
                    ]}
                    onSelect={(value) => handleChange('moderation_kick', value)}
                />
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text ros-bold" h={21} w={292} x={7} y={142}>
                {LocalizeText('navigator.roomsettings.moderation.ban.header')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-drop" h={24} w={276} x={10} y={161}>
                <HabboDropMenuView
                    label={LocalizeText('navigator.roomsettings.moderation.ban.header')}
                    value={roomData.moderationSettings.allowBan}
                    options={[
                        { value: RoomModerationSettings.MODERATION_LEVEL_NONE, label: LocalizeText('navigator.roomsettings.moderation.none') },
                        { value: RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS, label: LocalizeText('navigator.roomsettings.moderation.rights') }
                    ]}
                    onSelect={(value) => handleChange('moderation_ban', value)}
                />
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-list-border" h={156} w={172} x={8} y={200}>
                <ClassicScrollAreaView className="ros-scroll ros-scroll-banned" style={{ left: 3, top: 3, width: 165, height: 149 }} viewportClassName="ros-scroll-viewport">
                    {bannedUsers.map((user, index) => (
                        <div key={user.userId} className={`ros-user-row${index % 2 !== 0 ? ' is-odd' : ''}${selectedUserId === user.userId ? ' is-selected' : ''}`}>
                            <button type="button" className="ros-user-bg" onClick={(event) => setSelectedUserId(user.userId)}>
                                <span className="ros-user-name">{user.userName}</span>
                            </button>
                            <UserProfileIconView className="ros-user-eye" userId={user.userId} />
                        </div>
                    ))}
                </ClassicScrollAreaView>
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView className="ros-text" h={23} w={125} x={190} y={236}>
                {LocalizeText('navigator.roomsettings.moderation.banned.users')}
            </NavigatorRoomSettingsAtView>
            <NavigatorRoomSettingsAtView h={32} x={190} y={261}>
                <button type="button" className="ros-button ros-button-fit" onClick={() => selectedUserId > 0 && unBanUser(selectedUserId)}>
                    <span className="ros-button-label">{LocalizeText('navigator.roomsettings.moderation.unban')}</span>
                </button>
            </NavigatorRoomSettingsAtView>
        </div>
    );
};
