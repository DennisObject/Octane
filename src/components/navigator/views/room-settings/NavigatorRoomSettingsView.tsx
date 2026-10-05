import { RoomBannedUsersComposer, RoomDataParser, RoomSettingsDataEvent, SaveRoomSettingsComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { CreateLinkEvent, GetClubMemberLevel, GetMaxVisitorsList, GetSelectedMaxVisitors, IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../../../common';
import { useMessageEvent, useNavigatorData } from '../../../../hooks';
import { NavigatorRoomSettingsAccessTabView } from './NavigatorRoomSettingsAccessTabView';
import { NavigatorRoomSettingsBasicTabView } from './NavigatorRoomSettingsBasicTabView';
import { NavigatorRoomSettingsModTabView } from './NavigatorRoomSettingsModTabView';
import { NavigatorRoomSettingsRightsTabView } from './NavigatorRoomSettingsRightsTabView';
import { NavigatorRoomSettingsVipChatTabView } from './NavigatorRoomSettingsVipChatTabView';

const TABS: string[] = [
    'navigator.roomsettings.tab.1',
    'navigator.roomsettings.tab.2',
    'navigator.roomsettings.tab.3',
    'navigator.roomsettings.tab.4',
    'navigator.roomsettings.tab.5'
];

// Access (2) and rights (3) only exist for the room the user is standing in.
const OWN_ROOM_ONLY_TABS: string[] = [TABS[1], TABS[2]];
const FRAME_WIDTH = 341;
type IdleTimeoutField = 'idle_sleep_timeout_seconds' | 'idle_autokick_timeout_seconds';

interface RoomSettingsForm {
    roomData: IRoomData;
    idle_sleep_timeout_seconds: string;
    idle_autokick_timeout_seconds: string;
}

const parseIdleTimeout = (value: string): number => /^\d+$/.test(value.trim()) ? Number(value.trim()) : -1;

export const NavigatorRoomSettingsView: FC<{}> = (props) => {
    const [form, setForm] = useState<RoomSettingsForm>(null);
    const [inputError, setInputError] = useState<{ field: IdleTimeoutField; key: string }>(null);
    const roomData = form?.roomData;
    const [selectedTab, setSelectedTab] = useState(TABS[0]);
    const { navigatorData } = useNavigatorData();

    useMessageEvent<RoomSettingsDataEvent>(RoomSettingsDataEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const data = parser.data;

        setInputError(null);
        setForm({
            idle_sleep_timeout_seconds: data.idleSleepTimeoutSeconds > 0 ? String(data.idleSleepTimeoutSeconds) : '',
            idle_autokick_timeout_seconds: data.idleAutokickTimeoutSeconds > 0 ? String(data.idleAutokickTimeoutSeconds) : '',
            roomData: {
                roomId: data.roomId,
                roomName: data.name,
                roomDescription: data.description,
                categoryId: data.categoryId,
                userCount: data.maximumVisitors,
                tags: data.tags,
                tradeState: data.tradeMode,
                allowWalkthrough: data.allowWalkThrough,
                allowUnderpass: data.allowUnderpass,
                muteAllPets: data.muteAllPets,
                leaveOnDoorTileEnabled: data.leaveOnDoorTileEnabled,
                idleSleepEnabled: data.idleSleepEnabled,
                idleSleepTimeoutSeconds: data.idleSleepTimeoutSeconds,
                idleAutokickEnabled: data.idleAutokickEnabled,
                idleAutokickTimeoutSeconds: data.idleAutokickTimeoutSeconds,
                lockState: data.doorMode,
                password: null,
                allowPets: data.allowPets,
                allowPetsEat: data.allowFoodConsume,
                hideWalls: data.hideWalls,
                wallThickness: data.wallThickness,
                floorThickness: data.floorThickness,
                chatSettings: {
                    mode: data.chatSettings.mode,
                    weight: data.chatSettings.weight,
                    speed: data.chatSettings.speed,
                    distance: data.chatSettings.distance,
                    protection: data.chatSettings.protection
                },
                moderationSettings: {
                    allowMute: data.roomModerationSettings.allowMute,
                    allowKick: data.roomModerationSettings.allowKick,
                    allowBan: data.roomModerationSettings.allowBan
                }
            }
        });

        SendMessageComposer(new RoomBannedUsersComposer(data.roomId));
    });

    const onClose = () => {
        setForm(null);
        setInputError(null);
        setSelectedTab(TABS[0]);
    };

    const handleDraftChange = (field: IdleTimeoutField, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleChange = (field: string, value: string | number | boolean | string[]) => {
        const newForm = { ...form };
        const newValue = {
            ...roomData,
            chatSettings: { ...roomData.chatSettings },
            moderationSettings: { ...roomData.moderationSettings },
            userCount: GetSelectedMaxVisitors(GetMaxVisitorsList(GetClubMemberLevel() > 0, roomData.userCount), roomData.userCount)
        };

        switch (field) {
            case 'name':
                newValue.roomName = String(value);
                break;
            case 'description':
                newValue.roomDescription = String(value);
                break;
            case 'category':
                newValue.categoryId = Number(value);
                break;
            case 'max_visitors':
                newValue.userCount = Number(value);
                break;
            case 'trade_state':
                newValue.tradeState = Number(value);
                break;
            case 'tags':
                newValue.tags = value as Array<string>;
                break;
            case 'allow_walkthrough':
                newValue.allowWalkthrough = Boolean(value);
                break;
            case 'mute_all_pets':
                newValue.muteAllPets = Boolean(value);
                break;
            case 'leave_on_door_tile_enabled':
                newValue.leaveOnDoorTileEnabled = Boolean(value);
                break;
            case 'idle_sleep_enabled':
                newValue.idleSleepEnabled = Boolean(value);
                break;
            case 'idle_sleep_timeout_seconds':
                newForm.idle_sleep_timeout_seconds = String(value);
                break;
            case 'idle_autokick_enabled':
                newValue.idleAutokickEnabled = Boolean(value);
                break;
            case 'idle_autokick_timeout_seconds':
                newForm.idle_autokick_timeout_seconds = String(value);
                break;
            case 'allow_pets':
                newValue.allowPets = Boolean(value);
                break;
            case 'allow_pets_eat':
                newValue.allowPetsEat = Boolean(value);
                break;
            case 'hide_walls':
                newValue.hideWalls = Boolean(value);
                break;
            case 'wall_thickness':
                newValue.wallThickness = Number(value);
                break;
            case 'floor_thickness':
                newValue.floorThickness = Number(value);
                break;
            case 'lock_state':
                newValue.lockState = Number(value);
                break;
            case 'password':
                newValue.lockState = RoomDataParser.PASSWORD_STATE;
                newValue.password = String(value);
                break;
            case 'moderation_mute':
                newValue.moderationSettings.allowMute = Number(value);
                break;
            case 'moderation_kick':
                newValue.moderationSettings.allowKick = Number(value);
                break;
            case 'moderation_ban':
                newValue.moderationSettings.allowBan = Number(value);
                break;
            case 'flood_protection':
                newValue.chatSettings.protection = Number(value);
                break;
        }

        newForm.roomData = newValue;
        setInputError(null);

        if (GetClubMemberLevel() > 0) {
            const sleepTimeout = parseIdleTimeout(newForm.idle_sleep_timeout_seconds);
            const autokickTimeout = parseIdleTimeout(newForm.idle_autokick_timeout_seconds);
            let error: { field: IdleTimeoutField; key: string } = null;

            if (newValue.idleSleepEnabled && (sleepTimeout < 30 || sleepTimeout > 3600)) {
                error = { field: 'idle_sleep_timeout_seconds', key: 'navigator.roomsettings.idle_sleep_timeout.invalid' };
            } else if (newValue.idleAutokickEnabled && (autokickTimeout < 60 || autokickTimeout > 36000)) {
                error = { field: 'idle_autokick_timeout_seconds', key: 'navigator.roomsettings.idle_autokick_timeout.invalid' };
            } else if (newValue.idleSleepEnabled && newValue.idleAutokickEnabled && autokickTimeout < sleepTimeout + 30) {
                error = { field: 'idle_autokick_timeout_seconds', key: 'navigator.roomsettings.idle_autokick_timeout.offset.invalid' };
            }

            if (error) {
                setForm(newForm);
                setInputError(error);
                setSelectedTab(TABS[3]);
                return;
            }

            newValue.idleSleepTimeoutSeconds = newValue.idleSleepEnabled ? sleepTimeout : 0;
            newValue.idleAutokickTimeoutSeconds = newValue.idleAutokickEnabled ? autokickTimeout : 0;
        }

        setForm(newForm);

        SendMessageComposer(
            new SaveRoomSettingsComposer(
                newValue.roomId,
                newValue.roomName,
                newValue.roomDescription,
                newValue.lockState,
                newValue.password,
                Math.max(1, Math.min(200, Number(newValue.userCount) || 1)),
                newValue.categoryId,
                newValue.tags.length,
                newValue.tags,
                newValue.tradeState,
                newValue.allowPets,
                newValue.allowPetsEat,
                newValue.allowWalkthrough,
                newValue.hideWalls,
                newValue.wallThickness,
                newValue.floorThickness,
                newValue.moderationSettings.allowMute,
                newValue.moderationSettings.allowKick,
                newValue.moderationSettings.allowBan,
                newValue.chatSettings.mode,
                newValue.chatSettings.weight,
                newValue.chatSettings.speed,
                Math.max(1, Math.min(99, Number(newValue.chatSettings.distance) || 1)),
                newValue.chatSettings.protection,
                newValue.allowUnderpass,
                newValue.muteAllPets,
                newValue.leaveOnDoorTileEnabled,
                newValue.idleSleepEnabled,
                newValue.idleSleepTimeoutSeconds,
                newValue.idleAutokickEnabled,
                newValue.idleAutokickTimeoutSeconds
            )
        );
    };

    if (!roomData) return null;

    // The current room comes from RoomEntryInfo; enteredGuestRoom can also hold a room that was only looked at.
    const isEnteredRoom = navigatorData?.currentRoomId === roomData.roomId;
    const enteredRoom = navigatorData?.enteredGuestRoom?.roomId === roomData.roomId ? navigatorData.enteredGuestRoom : null;
    const visibleTabs = isEnteredRoom ? TABS : TABS.filter((tab) => !OWN_ROOM_ONLY_TABS.includes(tab));
    const currentTab = visibleTabs.includes(selectedTab) ? selectedTab : TABS[0];
    const tabWidth = Math.floor(FRAME_WIDTH / visibleTabs.length) - 1;

    return (
        <OctaneCardView className="octane-room-settings" frameStyle={3} isResizable={false} uniqueKey="octane-room-settings">
            <OctaneCardHeaderView
                headerText={LocalizeText('navigator.roomsettings')}
                isInfoToHabboPages={currentTab === TABS[3]}
                onClickInfoHabboPages={() => {
                    if (currentTab === TABS[3]) CreateLinkEvent('habbopages/chat/options');
                }}
                onCloseClick={onClose}
            />
            <OctaneCardTabsView classNames={['octane-room-settings-tabs']}>
                {visibleTabs.map((tab) => {
                    return (
                        <OctaneCardTabsItemView
                            key={tab}
                            isActive={currentTab === tab}
                            style={{ width: tabWidth, minWidth: tabWidth, maxWidth: tabWidth }}
                            onClick={(event) => setSelectedTab(tab)}
                        >
                            {LocalizeText(tab)}
                        </OctaneCardTabsItemView>
                    );
                })}
            </OctaneCardTabsView>
            <OctaneCardContentView className="octane-room-settings-content" gap={0}>
                <div className="ros-viewport">
                    {currentTab === TABS[0] && (
                        <NavigatorRoomSettingsBasicTabView handleChange={handleChange} isEnteredRoom={isEnteredRoom} roomData={roomData} onClose={onClose} />
                    )}
                    {currentTab === TABS[1] && (
                        <NavigatorRoomSettingsAccessTabView handleChange={handleChange} hasGroup={(enteredRoom?.habboGroupId ?? 0) > 0} roomData={roomData} />
                    )}
                    {currentTab === TABS[2] && <NavigatorRoomSettingsRightsTabView handleChange={handleChange} roomData={roomData} />}
                    {currentTab === TABS[3] && <NavigatorRoomSettingsVipChatTabView
                        handleChange={handleChange}
                        handleDraftChange={handleDraftChange}
                        roomData={roomData}
                        idleSleepTimeoutSeconds={form.idle_sleep_timeout_seconds}
                        idleAutokickTimeoutSeconds={form.idle_autokick_timeout_seconds}
                        inputError={inputError}
                    />}
                    {currentTab === TABS[4] && <NavigatorRoomSettingsModTabView handleChange={handleChange} roomData={roomData} />}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
