import {
    AddLinkEventTracker,
    CreateLinkEvent,
    ExtendedForumData,
    ForumDataMessageEvent,
    GetForumStatsMessageComposer,
    GetUnreadForumsCountMessageComposer,
    GuildForumThread,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    UnreadForumsCountMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { GetGroupInformation, LocalizeText, SendMessageComposer } from '../../../../api';
import { useMessageEvent } from '../../../../hooks';
import { NativeNotificationPopupView } from '../../../notification-center/views/native/NativeNotificationPopupView';
import listActive from '../../../../assets/images/groups/native/forum_forum_list0.png';
import listViewed from '../../../../assets/images/groups/native/forum_forum_list1.png';
import listMine from '../../../../assets/images/groups/native/forum_forum_list2.png';
import { ForumFrame, ForumHeader, ForumShortcuts } from './GroupForumLayout';
import { GroupForumComposeView } from './GroupForumComposeView';
import { GroupForumListView } from './GroupForumListView';
import { GroupForumSettingsView } from './GroupForumSettingsView';
import { GroupForumThreadListView } from './GroupForumThreadListView';
import { GroupForumThreadView } from './GroupForumThreadView';

type ForumMode = 'threads' | 'thread' | 'list';
type ForumCompose = { kind: 'thread' } | { kind: 'reply'; threadId: number; subject: string; quote?: string };

// forum_forum_list0..2: most active, most viewed, my forums.
const LIST_ICONS = [listActive, listViewed, listMine];
const LIST_CODES: Record<string, number> = { active: 0, popular: 1, my: 2 };

const WINDOW_WIDTH = 552;
const WINDOW_HEIGHT = 565;
// The v75 client opens the forum 100px below the top of the screen and puts its dialogs to the right of it.
const WINDOW_TOP = 100;

export const GroupForumView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [mode, setMode] = useState<ForumMode>('threads');
    const [groupId, setGroupId] = useState<number>(0);
    const [threadId, setThreadId] = useState<number>(0);
    const [currentThread, setCurrentThread] = useState<GuildForumThread>(null);
    const [forumData, setForumData] = useState<ExtendedForumData>(null);
    const [listCode, setListCode] = useState<number>(2);
    const [unreadForums, setUnreadForums] = useState<number>(0);
    const [compose, setCompose] = useState<ForumCompose>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [denied, setDenied] = useState<{ title: string; message: string }>(null);

    useMessageEvent<ForumDataMessageEvent>(ForumDataMessageEvent, (event) => {
        const parser = event.getParser();
        const data = parser.extendedForumData;

        // A forum without read permission is refused with an alert instead of a window (the error is a localization key).
        if (data.readPermissionError && data.readPermissionError.length > 0) {
            setIsVisible(false);
            setDenied({
                title: LocalizeText('notification.forums.error.access_denied.title'),
                message: LocalizeText(`groupforum.view.error.${data.readPermissionError}`, ['operation', 'OPERATION'], [LocalizeText('groupforum.view.error.operation_read'), LocalizeText('groupforum.view.error.operation_read')])
            });

            return;
        }

        setForumData(data);
    });

    useMessageEvent<UnreadForumsCountMessageEvent>(UnreadForumsCountMessageEvent, (event) => setUnreadForums(event.getParser().count));

    const openForum = useCallback((id: number) => {
        setGroupId(id);
        setThreadId(0);
        setCurrentThread(null);
        setForumData((previous) => (previous && previous.groupId === id ? previous : null));
        setMode('threads');
        setCompose(null);
        setIsSettingsOpen(false);
        setIsVisible(true);
        SendMessageComposer(new GetForumStatsMessageComposer(id));
    }, []);

    const openList = useCallback((listMode: string) => {
        setListCode(LIST_CODES[listMode] ?? 2);
        setMode('list');
        setCompose(null);
        setIsSettingsOpen(false);
        setIsVisible(true);
        SendMessageComposer(new GetUnreadForumsCountMessageComposer());
    }, []);

    const openThread = useCallback((thread: GuildForumThread) => {
        setThreadId(thread.threadId);
        setCurrentThread(thread);
        setMode('thread');
    }, []);

    const backToThreads = useCallback(() => {
        setMode('threads');
        setThreadId(0);
        setCurrentThread(null);
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'toggle':
                        if (isVisible) setIsVisible(false);
                        else openList('my');
                        return;
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'list':
                        openList(parts[2] ?? 'my');
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    default: {
                        const id = parseInt(parts[1]);

                        if (!isNaN(id) && id > 0) openForum(id);
                    }
                }
            },
            eventUrlPrefix: 'groupforum/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [isVisible, openForum, openList]);

    if (denied) return <NativeNotificationPopupView message={denied.message} title={denied.title} onClose={() => setDenied(null)} />;

    if (!isVisible) return null;

    const close = () => {
        setIsVisible(false);
        setCompose(null);
        setIsSettingsOpen(false);
    };
    const initialPosition = { x: Math.round((window.innerWidth - WINDOW_WIDTH) / 2), y: WINDOW_TOP };
    const dialogPosition = (width: number) => ({ x: Math.min(initialPosition.x + WINDOW_WIDTH + 1, window.innerWidth - width + 1), y: WINDOW_TOP });
    const isList = mode === 'list';
    const effectiveGroupId = forumData?.groupId || groupId;

    return (
        <>
            <ForumFrame
                className="octane-group-forum"
                height={WINDOW_HEIGHT}
                initialPosition={initialPosition}
                isResizable={true}
                minHeight={525}
                minWidth={400}
                title={LocalizeText('groupforum.view.window_title')}
                uniqueKey="group-forum"
                width={WINDOW_WIDTH}
                onClose={close}
                onHelp={() => CreateLinkEvent('habbopages/forums')}
            >
                {isList ? (
                    <ForumHeader
                        description={LocalizeText(`groupforum.view.forums_description.${listCode}`)}
                        icon={LIST_ICONS[listCode]}
                        title={LocalizeText(`groupforum.view.forums_header.${listCode}`)}
                    />
                ) : (
                    <ForumHeader
                        badge={forumData?.icon ?? ''}
                        canChangeSettings={!!forumData?.canChangeSettings}
                        description={forumData?.description ?? ''}
                        title={forumData?.name ?? ''}
                        onClick={() => effectiveGroupId > 0 && GetGroupInformation(effectiveGroupId)}
                        onSettings={() => setIsSettingsOpen(true)}
                    />
                )}
                <ForumShortcuts unreadCount={unreadForums} onOpenList={openList} />
                {isList && <GroupForumListView key={listCode} listCode={listCode} onOpenForum={openForum} />}
                {mode === 'threads' && forumData && (
                    <GroupForumThreadListView
                        forumData={forumData}
                        groupId={effectiveGroupId}
                        onNewThread={() => setCompose({ kind: 'thread' })}
                        onOpenThread={openThread}
                    />
                )}
                {mode === 'thread' && (
                    <GroupForumThreadView
                        forumData={forumData}
                        groupId={effectiveGroupId}
                        initialThread={currentThread}
                        threadId={threadId}
                        onBack={backToThreads}
                        onReply={(subject, quote) => setCompose({ kind: 'reply', threadId, subject, quote })}
                    />
                )}
            </ForumFrame>
            {compose && forumData && (
                <GroupForumComposeView
                    compose={compose}
                    forumData={forumData}
                    groupId={effectiveGroupId}
                    initialPosition={dialogPosition(455)}
                    onClose={() => setCompose(null)}
                    onThreadCreated={(thread) => {
                        setCompose(null);
                        openThread(thread);
                    }}
                />
            )}
            {isSettingsOpen && forumData && (
                <GroupForumSettingsView forumData={forumData} groupId={effectiveGroupId} initialPosition={dialogPosition(350)} onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
};
