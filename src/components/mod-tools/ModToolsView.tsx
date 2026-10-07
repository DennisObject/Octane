import { AddLinkEventTracker, CreateLinkEvent, ILinkEventTracker, RemoveLinkEventTracker, RoomEngineEvent, RoomId, RoomObjectCategory, RoomObjectType } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { GetRoomSession, ISelectedUser } from '../../api';
import { useModTools, useModWindowTrackerStore, useObjectSelectedEvent, useOctaneEvent } from '../../hooks';
import { ModToolsChatlogView } from './views/room/ModToolsChatlogView';
import { RoomToolView } from './views/RoomToolView';
import { StartPanelView } from './views/StartPanelView';
import { UserInfoView } from './views/UserInfoView';
import { ModToolsTicketsView } from './views/tickets/ModToolsTicketsView';
import { ModToolsUserChatlogView } from './views/user/ModToolsUserChatlogView';

const START_PANEL = { x: 120, y: 64, width: 170, height: 170 };
const ROOM_TOOL_SIZE = { width: 240, height: 437 };
const USER_INFO_SIZE = { width: 292, height: 225 };

// Classic v75 ModerationManager / StartPanelCtrl (fme): the panel opens when the moderator init message arrives, the room and chatlog buttons follow the
// room entered / left events, the user button follows the last selected avatar and stays enabled after the room is left.
export const ModToolsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentRoomId, setCurrentRoomId] = useState<number>(-1);
    // fme._r835c944dce1cfb / _rd920c7b97e4ea7: the room buttons are enabled by the room entered event and disabled by the room left event; a panel created
    // while a room is already open starts with them disabled.
    const [roomEntered, setRoomEntered] = useState(false);
    const [chatlogEnabled, setChatlogEnabled] = useState(false);
    const [ticketQueueEnabled, setTicketQueueEnabled] = useState(false);
    const panelCreatedRef = useRef(false);
    const settingsRef = useRef<typeof settings>(null);
    const [selectedUser, setSelectedUser] = useState<ISelectedUser>(null);
    const [isTicketsVisible, setIsTicketsVisible] = useState(false);
    const windows = useModWindowTrackerStore((state) => state.windows);
    const showWindow = useModWindowTrackerStore((state) => state.show);
    const closeWindow = useModWindowTrackerStore((state) => state.close);
    const {
        settings = null,
        openRoomChatlogs = [],
        openUserChatlogs = [],
        openRoomChatlog = null,
        closeRoomChatlog = null,
        toggleRoomChatlog = null,
        openUserChatlog = null,
        closeUserChatlog = null,
        toggleUserChatlog = null
    } = useModTools();

    useEffect(() => {
        settingsRef.current = settings;

        if (!settings) return;

        // fme.show(): the frame is created once (user, room tool and chatlog buttons start disabled, the ticket queue follows the call for help
        // permission); every later init message only makes the existing frame visible again.
        if (!panelCreatedRef.current) {
            panelCreatedRef.current = true;
            setRoomEntered(false);
            setChatlogEnabled(false);
            setTicketQueueEnabled(settings.cfhPermission);
        }

        setIsVisible(true);
    }, [settings]);

    useOctaneEvent<RoomEngineEvent>([RoomEngineEvent.INITIALIZED, RoomEngineEvent.DISPOSED], (event) => {
        if (RoomId.isRoomPreviewerId(event.roomId)) return;

        const entered = event.type === RoomEngineEvent.INITIALIZED;

        setCurrentRoomId(entered ? event.roomId : -1);
        setRoomEntered(entered && panelCreatedRef.current);
        setChatlogEnabled(entered && panelCreatedRef.current && !!settingsRef.current?.chatlogsPermission);
    });

    useObjectSelectedEvent((event) => {
        if (event.category !== RoomObjectCategory.UNIT) return;

        const userData = GetRoomSession()?.userDataManager.getUserDataByIndex(event.id);

        if (!userData || userData.type !== RoomObjectType.USER) return;

        setSelectedUser({ userId: userData.webID, username: userData.name });
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'open-room-info':
                    case 'toggle-room-info':
                        showWindow({ type: 'roomTool', key: parts[2], ...ROOM_TOOL_SIZE, parent: START_PANEL, toggle: parts[1] === 'toggle-room-info' });
                        return;
                    case 'close-room-info':
                        closeWindow('roomTool', parts[2]);
                        return;
                    case 'open-room-chatlog':
                        openRoomChatlog(Number(parts[2]));
                        return;
                    case 'close-room-chatlog':
                        closeRoomChatlog(Number(parts[2]));
                        return;
                    case 'toggle-room-chatlog':
                        toggleRoomChatlog(Number(parts[2]));
                        return;
                    case 'open-user-info':
                    case 'toggle-user-info':
                        showWindow({ type: 'userInfo', key: parts[2], ...USER_INFO_SIZE, parent: START_PANEL, toggle: parts[1] === 'toggle-user-info' });
                        return;
                    case 'close-user-info':
                        closeWindow('userInfo', parts[2]);
                        return;
                    case 'open-user-chatlog':
                        openUserChatlog(Number(parts[2]));
                        return;
                    case 'close-user-chatlog':
                        closeUserChatlog(Number(parts[2]));
                        return;
                    case 'toggle-user-chatlog':
                        toggleUserChatlog(Number(parts[2]));
                        return;
                }
            },
            eventUrlPrefix: 'mod-tools/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [
        showWindow,
        closeWindow,
        openRoomChatlog,
        closeRoomChatlog,
        toggleRoomChatlog,
        openUserChatlog,
        closeUserChatlog,
        toggleUserChatlog
    ]);

    const isInRoom = currentRoomId > 0 && roomEntered;

    return (
        <>
            {isVisible && settings && (
                <StartPanelView
                    canUseChatlog={isInRoom && chatlogEnabled}
                    canUseRoomTool={isInRoom}
                    canUseTicketQueue={ticketQueueEnabled}
                    canUseUserInfo={!!selectedUser}
                    userCaption={selectedUser ? `User info: ${selectedUser.username}` : 'User info:'}
                    onChatlog={() => CreateLinkEvent(`mod-tools/toggle-room-chatlog/${currentRoomId}`)}
                    onClose={() => setIsVisible(false)}
                    onRoomTool={() => CreateLinkEvent(`mod-tools/toggle-room-info/${currentRoomId}`)}
                    onTicketQueue={() => setIsTicketsVisible(true)}
                    onUserInfo={() => CreateLinkEvent(`mod-tools/toggle-user-info/${selectedUser.userId}`)}
                />
            )}
            {windows.map((entry) => {
                const key = `${entry.type}:${entry.key}:${entry.revision}`;

                if (entry.type === 'roomTool') {
                    return (
                        <RoomToolView
                            key={key}
                            currentRoomId={isInRoom ? currentRoomId : 0}
                            roomId={Number(entry.key)}
                            settings={settings}
                            x={entry.x}
                            y={entry.y}
                            onClose={() => closeWindow('roomTool', entry.key)}
                            onOpenChatlog={(id) => CreateLinkEvent(`mod-tools/toggle-room-chatlog/${id}`)}
                            onOpenUserInfo={(id) => CreateLinkEvent(`mod-tools/toggle-user-info/${id}`)}
                        />
                    );
                }

                if (entry.type === 'userInfo') {
                    return (
                        <UserInfoView
                            key={key}
                            settings={settings}
                            userId={Number(entry.key)}
                            x={entry.x}
                            y={entry.y}
                            onClose={() => closeWindow('userInfo', entry.key)}
                            onOpenChatlog={() => CreateLinkEvent(`mod-tools/toggle-user-chatlog/${entry.key}`)}
                            onOpenModAction={() => CreateLinkEvent(`mod-tools/toggle-user-mod-action/${entry.key}`)}
                            onOpenRoomVisits={() => CreateLinkEvent(`mod-tools/toggle-user-room-visits/${entry.key}`)}
                            onOpenSendMessage={() => CreateLinkEvent(`mod-tools/toggle-user-send-message/${entry.key}`)}
                        />
                    );
                }

                return null;
            })}
            {openRoomChatlogs.map((roomId) => (
                <ModToolsChatlogView key={roomId} roomId={roomId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-room-chatlog/${roomId}`)} />
            ))}
            {openUserChatlogs.map((userId) => (
                <ModToolsUserChatlogView key={userId} userId={userId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-user-chatlog/${userId}`)} />
            ))}
            {isTicketsVisible && <ModToolsTicketsView onCloseClick={() => setIsTicketsVisible(false)} />}
        </>
    );
};
