import { AddLinkEventTracker, CreateLinkEvent, ILinkEventTracker, RemoveLinkEventTracker, RoomEngineEvent, RoomId, RoomObjectCategory, RoomObjectType } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { GetRoomSession, ISelectedUser, LocalizeText } from '../../api';
import { MOD_WINDOW_SIZE, useIssueManager, useModTools, useModWindowTrackerStore, useObjectSelectedEvent, useOctaneEvent } from '../../hooks';
import { EvidenceChatlogView } from './views/EvidenceChatlogView';
import { IssueBrowserView } from './views/IssueBrowserView';
import { IssueHandlerView } from './views/IssueHandlerView';
import { ModActionView } from './views/ModActionView';
import { NativeAlertView } from './views/NativeAlertView';
import { RoomToolView } from './views/RoomToolView';
import { RoomVisitsView } from './views/RoomVisitsView';
import { SendMessageView } from './views/SendMessageView';
import { StartPanelView } from './views/StartPanelView';
import { UserInfoView } from './views/UserInfoView';


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
    const windows = useModWindowTrackerStore((state) => state.windows);
    const showWindow = useModWindowTrackerStore((state) => state.show);
    const closeWindow = useModWindowTrackerStore((state) => state.close);
    const hideWindow = useModWindowTrackerStore((state) => state.hide);
    const resizeWindow = useModWindowTrackerStore((state) => state.resize);
    const startPanel = useModWindowTrackerStore((state) => state.startPanel);
    const setStartPanel = useModWindowTrackerStore((state) => state.setStartPanel);
    const { settings = null, cfhCategories = [] } = useModTools();
    const issueContext = useIssueManager();

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
                        showWindow({ type: 'roomTool', key: parts[2], ...MOD_WINDOW_SIZE.roomTool, parent: useModWindowTrackerStore.getState().startPanel, toggle: parts[1] === 'toggle-room-info' });
                        return;
                    case 'close-room-info':
                        closeWindow('roomTool', parts[2]);
                        return;
                    case 'open-room-chatlog':
                    case 'toggle-room-chatlog':
                        showWindow({ type: 'roomChatlog', key: parts[2], ...MOD_WINDOW_SIZE.roomChatlog, parent: useModWindowTrackerStore.getState().startPanel, toggle: parts[1] === 'toggle-room-chatlog' });
                        return;
                    case 'close-room-chatlog':
                        closeWindow('roomChatlog', parts[2]);
                        return;
                    case 'open-user-info':
                    case 'toggle-user-info':
                        showWindow({ type: 'userInfo', key: parts[2], ...MOD_WINDOW_SIZE.userInfo, parent: useModWindowTrackerStore.getState().startPanel, toggle: parts[1] === 'toggle-user-info' });
                        return;
                    case 'close-user-info':
                        closeWindow('userInfo', parts[2]);
                        return;
                    case 'open-user-chatlog':
                    case 'toggle-user-chatlog':
                        showWindow({ type: 'userChatlog', key: parts[2], ...MOD_WINDOW_SIZE.userChatlog, parent: useModWindowTrackerStore.getState().startPanel, toggle: parts[1] === 'toggle-user-chatlog' });
                        return;
                    case 'close-user-chatlog':
                        closeWindow('userChatlog', parts[2]);
                        return;
                }
            },
            eventUrlPrefix: 'mod-tools/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [showWindow, closeWindow]);

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
                    x={startPanel.x}
                    y={startPanel.y}
                    onMove={(x, y) => setStartPanel({ ...startPanel, x, y })}
                    onTicketQueue={() => showWindow({ type: 'issueBrowser', key: 'main', ...MOD_WINDOW_SIZE.issueBrowser, parent: null })}
                    onUserInfo={() => CreateLinkEvent(`mod-tools/toggle-user-info/${selectedUser.userId}`)}
                />
            )}
            {windows.map((entry) => {
                if (entry.hidden) return null;

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
                            onOpenChatlog={(id) => showWindow({ type: 'roomChatlog', key: `${id}`, ...MOD_WINDOW_SIZE.roomChatlog, parent: entry, toggle: true })}
                            onOpenUserInfo={(id) => showWindow({ type: 'userInfo', key: `${id}`, ...MOD_WINDOW_SIZE.userInfo, parent: entry, toggle: true })}
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
                            onOpenChatlog={() => showWindow({ type: 'userChatlog', key: entry.key, ...MOD_WINDOW_SIZE.userChatlog, parent: entry, below: true, toggle: true })}
                            onOpenModAction={(userName) =>
                                showWindow({ type: 'modAction', key: userName, ...MOD_WINDOW_SIZE.modAction, parent: entry, below: true, toggle: true, params: { userId: Number(entry.key) } })
                            }
                            onOpenRoomVisits={() => showWindow({ type: 'roomVisits', key: entry.key, ...MOD_WINDOW_SIZE.roomVisits, parent: entry, below: true, toggle: true })}
                            onOpenSendMessage={(userName) =>
                                showWindow({ type: 'sendMessage', key: userName, ...MOD_WINDOW_SIZE.sendMessage, parent: entry, below: true, toggle: true, params: { userId: Number(entry.key) } })
                            }
                        />
                    );
                }

                if (entry.type === 'userChatlog' || entry.type === 'roomChatlog' || entry.type === 'cfhChatlog') {
                    return (
                        <EvidenceChatlogView
                            key={key}
                            height={entry.height}
                            id={Number(entry.key)}
                            kind={entry.type === 'userChatlog' ? 'user' : entry.type === 'roomChatlog' ? 'room' : 'cfh'}
                            width={entry.width}
                            x={entry.x}
                            y={entry.y}
                            onClose={() => closeWindow(entry.type, entry.key)}
                            onEnterRoom={(roomId) => CreateLinkEvent(`navigator/goto/${roomId}`)}
                            onOpenRoomTool={(roomId) => showWindow({ type: 'roomTool', key: `${roomId}`, ...MOD_WINDOW_SIZE.roomTool, parent: entry, toggle: true })}
                            onOpenUserInfo={(userId) => showWindow({ type: 'userInfo', key: `${userId}`, ...MOD_WINDOW_SIZE.userInfo, parent: entry, toggle: true })}
                            onResize={(width, height) => resizeWindow(entry.type, entry.key, width, height)}
                        />
                    );
                }

                if (entry.type === 'roomVisits') {
                    return (
                        <RoomVisitsView
                            key={key}
                            height={entry.height}
                            userId={Number(entry.key)}
                            width={entry.width}
                            x={entry.x}
                            y={entry.y}
                            onClose={() => closeWindow('roomVisits', entry.key)}
                            onEnterRoom={(roomId) => CreateLinkEvent(`navigator/goto/${roomId}`)}
                            onOpenRoomTool={(roomId) => showWindow({ type: 'roomTool', key: `${roomId}`, ...MOD_WINDOW_SIZE.roomTool, parent: entry, toggle: true })}
                            onResize={(width, height) => resizeWindow('roomVisits', entry.key, width, height)}
                        />
                    );
                }

                if (entry.type === 'issueBrowser') {
                    return (
                        <IssueBrowserView
                            key={key}
                            context={issueContext}
                            height={entry.height}
                            localize={LocalizeText}
                            width={entry.width}
                            x={entry.x}
                            y={entry.y}
                            onClose={() => hideWindow('issueBrowser', entry.key)}
                            onResize={(width, height) => resizeWindow('issueBrowser', entry.key, width, height)}
                        />
                    );
                }

                if (entry.type === 'issueHandler') {
                    return (
                        <IssueHandlerView
                            key={key}
                            bundleId={Number(entry.key)}
                            categories={cfhCategories}
                            context={issueContext}
                            height={entry.height}
                            localize={LocalizeText}
                            settings={settings}
                            width={entry.width}
                            x={entry.x}
                            y={entry.y}
                            onClose={() => closeWindow('issueHandler', entry.key)}
                            onEnterRoom={(roomId) => CreateLinkEvent(`navigator/goto/${roomId}`)}
                            onOpenChatlog={(userId) => showWindow({ type: 'userChatlog', key: `${userId}`, ...MOD_WINDOW_SIZE.userChatlog, parent: entry, toggle: true })}
                            onOpenModAction={(userId, userName) => showWindow({ type: 'modAction', key: userName, ...MOD_WINDOW_SIZE.modAction, parent: entry, toggle: true, params: { userId } })}
                            onOpenRoomTool={(roomId) => showWindow({ type: 'roomTool', key: `${roomId}`, ...MOD_WINDOW_SIZE.roomTool, parent: null, toggle: true })}
                            onOpenRoomVisits={(userId) => showWindow({ type: 'roomVisits', key: `${userId}`, ...MOD_WINDOW_SIZE.roomVisits, parent: entry, toggle: true })}
                            onOpenSendMessage={(userId, userName) => showWindow({ type: 'sendMessage', key: userName, ...MOD_WINDOW_SIZE.sendMessage, parent: entry, toggle: true, params: { userId } })}
                            onOpenUserInfo={(userId, parent) => showWindow({ type: 'userInfo', key: `${userId}`, ...MOD_WINDOW_SIZE.userInfo, parent, toggle: true })}
                            onResize={(width, height) => resizeWindow('issueHandler', entry.key, width, height)}
                        />
                    );
                }

                if (entry.type === 'modAction') {
                    return <ModActionView key={key} settings={settings} userId={Number(entry.params.userId)} userName={entry.key} x={entry.x} y={entry.y} onClose={() => closeWindow('modAction', entry.key)} />;
                }

                if (entry.type === 'sendMessage') {
                    return (
                        <SendMessageView
                            key={key}
                            settings={settings}
                            userId={Number(entry.params.userId)}
                            userName={entry.key}
                            x={entry.x}
                            y={entry.y}
                            onClose={() => closeWindow('sendMessage', entry.key)}
                        />
                    );
                }

                return null;
            })}
            <NativeAlertView />
        </>
    );
};
