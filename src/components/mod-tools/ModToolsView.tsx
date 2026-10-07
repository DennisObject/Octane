import { AddLinkEventTracker, CreateLinkEvent, ILinkEventTracker, RemoveLinkEventTracker, RoomEngineEvent, RoomId, RoomObjectCategory, RoomObjectType } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { GetRoomSession, ISelectedUser } from '../../api';
import { useModTools, useObjectSelectedEvent, useOctaneEvent } from '../../hooks';
import { ModToolsChatlogView } from './views/room/ModToolsChatlogView';
import { RoomToolView } from './views/RoomToolView';
import { StartPanelView } from './views/StartPanelView';
import { ModToolsTicketsView } from './views/tickets/ModToolsTicketsView';
import { ModToolsUserChatlogView } from './views/user/ModToolsUserChatlogView';
import { ModToolsUserView } from './views/user/ModToolsUserView';

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
    const {
        settings = null,
        openRooms = [],
        openRoomChatlogs = [],
        openUserChatlogs = [],
        openUserInfos = [],
        openRoomInfo = null,
        closeRoomInfo = null,
        toggleRoomInfo = null,
        openRoomChatlog = null,
        closeRoomChatlog = null,
        toggleRoomChatlog = null,
        openUserInfo = null,
        closeUserInfo = null,
        toggleUserInfo = null,
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
                        openRoomInfo(Number(parts[2]));
                        return;
                    case 'close-room-info':
                        closeRoomInfo(Number(parts[2]));
                        return;
                    case 'toggle-room-info':
                        toggleRoomInfo(Number(parts[2]));
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
                        openUserInfo(Number(parts[2]));
                        return;
                    case 'close-user-info':
                        closeUserInfo(Number(parts[2]));
                        return;
                    case 'toggle-user-info':
                        toggleUserInfo(Number(parts[2]));
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
        openRoomInfo,
        closeRoomInfo,
        toggleRoomInfo,
        openRoomChatlog,
        closeRoomChatlog,
        toggleRoomChatlog,
        openUserInfo,
        closeUserInfo,
        toggleUserInfo,
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
            {openRooms.map((roomId) => (
                <RoomToolView
                    key={roomId}
                    currentRoomId={isInRoom ? currentRoomId : 0}
                    roomId={roomId}
                    settings={settings}
                    x={295}
                    y={64}
                    onClose={() => CreateLinkEvent(`mod-tools/close-room-info/${roomId}`)}
                    onOpenChatlog={(id) => CreateLinkEvent(`mod-tools/toggle-room-chatlog/${id}`)}
                    onOpenUserInfo={(id) => CreateLinkEvent(`mod-tools/toggle-user-info/${id}`)}
                />
            ))}
            {openRoomChatlogs.map((roomId) => (
                <ModToolsChatlogView key={roomId} roomId={roomId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-room-chatlog/${roomId}`)} />
            ))}
            {openUserInfos.map((userId) => (
                <ModToolsUserView key={userId} userId={userId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-user-info/${userId}`)} />
            ))}
            {openUserChatlogs.map((userId) => (
                <ModToolsUserChatlogView key={userId} userId={userId} onCloseClick={() => CreateLinkEvent(`mod-tools/close-user-chatlog/${userId}`)} />
            ))}
            {isTicketsVisible && <ModToolsTicketsView onCloseClick={() => setIsTicketsVisible(false)} />}
        </>
    );
};
