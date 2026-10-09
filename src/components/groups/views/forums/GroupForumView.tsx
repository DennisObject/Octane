import {
    AddLinkEventTracker,
    CreateLinkEvent,
    ExtendedForumData,
    ForumDataMessageEvent,
    GetForumStatsMessageComposer,
    GetThreadMessageComposer,
    GetUnreadForumsCountMessageComposer,
    GuildForumThread,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    UnreadForumsCountMessageEvent,
    UpdateForumReadMarkerEntry,
    UpdateForumReadMarkerMessageComposer,
    UpdateThreadMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetGroupInformation, LocalizeText, SendMessageComposer } from '../../../../api';
import { useMessageEvent } from '../../../../hooks';
import { NativeNotificationPopupView } from '../../../notification-center/views/native/NativeNotificationPopupView';
import listActive from '../../../../assets/images/groups/native/forum_forum_list0.png';
import listViewed from '../../../../assets/images/groups/native/forum_forum_list1.png';
import listMine from '../../../../assets/images/groups/native/forum_forum_list2.png';
import { ForumFrame, ForumHeader, ForumShortcuts, FORUM_PAGE_SIZE } from './GroupForumLayout';
import { GroupForumComposeView } from './GroupForumComposeView';
import { GroupForumListView } from './GroupForumListView';
import { GroupForumSettingsView } from './GroupForumSettingsView';
import { GroupForumThreadListView } from './GroupForumThreadListView';
import { GroupForumThreadView } from './GroupForumThreadView';

type ForumMode = 'threads' | 'thread' | 'list';
type ForumCompose = { kind: 'thread' } | { kind: 'reply'; threadId: number; subject: string; quote?: string; quoteSeq: number };

// forum_forum_list0..2: most active, most viewed, my forums.
const LIST_ICONS = [listActive, listViewed, listMine];
const LIST_CODES: Record<string, number> = { active: 0, popular: 1, my: 2 };

const WINDOW_WIDTH = 552;
const WINDOW_HEIGHT = 565;
// The v75 client opens the forum 100px below the top of the screen and puts its dialogs to the right of it.
const WINDOW_TOP = 100;

// A forum opened by a link to one of its messages (groupforum/<group>/<thread>/<message index>): the thread is fetched first, then its page opens and scrolls to the message.
interface PendingThread {
    groupId: number;
    threadId: number;
    messageIndex: number;
}

export const GroupForumView: FC<{}> = () =>
{
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [mode, setMode] = useState<ForumMode>('threads');
    const [groupId, setGroupId] = useState<number>(0);
    const [threadId, setThreadId] = useState<number>(0);
    const [currentThread, setCurrentThread] = useState<GuildForumThread>(null);
    const [forumData, setForumData] = useState<ExtendedForumData>(null);
    const [listCode, setListCode] = useState<number>(2);
    const [listPage, setListPage] = useState<number>(0);
    const [threadsPage, setThreadsPage] = useState<number>(0);
    const [threadStart, setThreadStart] = useState<{ pageIndex: number; scrollIndex: number }>({ pageIndex: 0, scrollIndex: 0 });
    const [fromList, setFromList] = useState<boolean>(false);
    const [unreadForums, setUnreadForums] = useState<number>(0);
    const [compose, setCompose] = useState<ForumCompose>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [denied, setDenied] = useState<{ title: string; message: string }>(null);
    // GroupForumController: the group whose data was asked for (var_1421), the forum data of it (var_95) and the newest message the reader has seen in it (var_535).
    const requestedGroup = useRef<number>(-1);
    const forumRef = useRef<ExtendedForumData>(null);
    const seenMessageId = useRef<number>(0);
    const pendingThread = useRef<PendingThread>(null);

    useMessageEvent<ForumDataMessageEvent>(ForumDataMessageEvent, (event) =>
    {
        const parser = event.getParser();
        const data = parser.extendedForumData;

        // onForumData: an answer for any other group than the one asked for last is dropped, a refusal included.
        if (data.groupId !== requestedGroup.current) return;

        // A forum without read permission is refused with an alert instead of a window (the error is a localization key).
        if (data.readPermissionError && data.readPermissionError.length > 0)
        {
            requestedGroup.current = 0;
            forumRef.current = null;
            pendingThread.current = null;
            setIsVisible(false);
            setForumData(null);
            setDenied({
                title: LocalizeText('notification.forums.error.access_denied.title'),
                message: LocalizeText(`groupforum.view.error.${data.readPermissionError}`, ['operation', 'OPERATION'], [LocalizeText('groupforum.view.error.operation_read'), LocalizeText('groupforum.view.error.operation_read')])
            });

            return;
        }

        forumRef.current = data;
        seenMessageId.current = data.lastReadMessageId;
        setForumData(data);
    });

    useMessageEvent<UnreadForumsCountMessageEvent>(UnreadForumsCountMessageEvent, (event) => setUnreadForums(event.getParser().count));

    // markForumAsRead: only when the reader has seen newer messages than the stored marker, or by force ("Mark read"), which marks the whole forum.
    const markForumAsRead = useCallback((force: boolean = false) =>
    {
        const data = forumRef.current;
        const seen = seenMessageId.current;

        if (data && (force || seen > data.lastReadMessageId))
        {
            const entry = force ? new UpdateForumReadMarkerEntry(data.groupId, Math.max(data.totalMessages, seen), seen === 0) : new UpdateForumReadMarkerEntry(data.groupId, seen, false);

            SendMessageComposer(new UpdateForumReadMarkerMessageComposer(entry));
        }

        seenMessageId.current = 0;
    }, []);

    const onMessagesSeen = useCallback((messageId: number) =>
    {
        if (messageId > seenMessageId.current) seenMessageId.current = messageId;
    }, []);

    // initForum: the previous forum is marked read before another one is asked for.
    const initForum = useCallback((id: number) =>
    {
        markForumAsRead();
        requestedGroup.current = id;
        forumRef.current = null;
        seenMessageId.current = 0;
        setGroupId(id);
        setThreadId(0);
        setCurrentThread(null);
        setForumData(null);
        setThreadsPage(0);
        setCompose(null);
        setIsSettingsOpen(false);
        setIsVisible(true);
        SendMessageComposer(new GetForumStatsMessageComposer(id));
    }, [markForumAsRead]);

    const openForum = useCallback((id: number, options?: { fromList?: boolean }) =>
    {
        pendingThread.current = null;
        setFromList(!!options?.fromList);
        setMode('threads');
        initForum(id);
    }, [initForum]);

    const openThread = useCallback((thread: GuildForumThread, start: { pageIndex: number; scrollIndex: number } = { pageIndex: 0, scrollIndex: 0 }) =>
    {
        setThreadId(thread.threadId);
        setCurrentThread(thread);
        setThreadStart(start);
        setMode('thread');
    }, []);

    // linkReceived "groupforum/<group>/<thread>[/<message index>]": initForum, GetThread, then the page that holds the message.
    const openForumThread = useCallback((id: number, linkedThreadId: number, messageIndex: number) =>
    {
        setFromList(false);
        setMode('threads');
        initForum(id);
        pendingThread.current = { groupId: id, threadId: linkedThreadId, messageIndex };
        SendMessageComposer(new GetThreadMessageComposer(id, linkedThreadId));
    }, [initForum]);

    useMessageEvent<UpdateThreadMessageEvent>(UpdateThreadMessageEvent, (event) =>
    {
        const parser = event.getParser();
        const pending = pendingThread.current;

        if (!pending || parser.groupId !== pending.groupId || parser.thread.threadId !== pending.threadId || requestedGroup.current !== pending.groupId) return;

        pendingThread.current = null;
        openThread(parser.thread, { pageIndex: Math.floor(pending.messageIndex / FORUM_PAGE_SIZE), scrollIndex: pending.messageIndex % FORUM_PAGE_SIZE });
    });

    // closeMainView: the window is gone, so the forum is marked read and answers for it are no longer wanted.
    const closeForum = useCallback(() =>
    {
        markForumAsRead();
        requestedGroup.current = -1;
        forumRef.current = null;
        pendingThread.current = null;
        setForumData(null);
        setIsVisible(false);
        setCompose(null);
        setIsSettingsOpen(false);
    }, [markForumAsRead]);

    // openForumsList: the forum that was open is marked read first.
    const openList = useCallback((listMode: string, startIndex: number = 0) =>
    {
        markForumAsRead();
        requestedGroup.current = -1;
        forumRef.current = null;
        pendingThread.current = null;
        setForumData(null);
        setListCode(LIST_CODES[listMode] ?? 2);
        setListPage(Math.floor(startIndex / FORUM_PAGE_SIZE));
        setMode('list');
        setCompose(null);
        setIsSettingsOpen(false);
        setIsVisible(true);
        SendMessageComposer(new GetUnreadForumsCountMessageComposer());
    }, [markForumAsRead]);

    // The thread list's back button (back_button in a thread list): the forum is marked read, then the list it came from opens again, or the window closes.
    const leaveThreads = useCallback(() =>
    {
        markForumAsRead(true);

        if (fromList)
        {
            const mode = Object.keys(LIST_CODES).find((key) => LIST_CODES[key] === listCode) ?? 'my';

            openList(mode, listPage * FORUM_PAGE_SIZE);
        }
        else
        {
            closeForum();
        }
    }, [closeForum, fromList, listCode, listPage, markForumAsRead, openList]);

    const backToThreads = useCallback(() =>
    {
        setMode('threads');
        setThreadId(0);
        setCurrentThread(null);
    }, []);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1])
                {
                    case 'toggle':
                        if (isVisible) closeForum();
                        else openList('my');
                        return;
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'list':
                        openList(parts[2] ?? 'my');
                        return;
                    case 'hide':
                        closeForum();
                        return;
                    default: {
                        const id = parseInt(parts[1]);

                        if (isNaN(id) || id <= 0) return;

                        if (parts.length === 2) openForum(id);
                        else openForumThread(id, parseInt(parts[2]) || 0, parts.length > 3 ? parseInt(parts[3]) || 0 : 0);
                    }
                }
            },
            eventUrlPrefix: 'groupforum/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [closeForum, isVisible, openForum, openForumThread, openList]);

    if (denied) return <NativeNotificationPopupView message={denied.message} title={denied.title} onClose={() => setDenied(null)} />;

    if (!isVisible) return null;

    const initialPosition = { x: Math.round((window.innerWidth - WINDOW_WIDTH) / 2), y: WINDOW_TOP };
    const dialogPosition = (width: number) => ({ x: Math.min(initialPosition.x + WINDOW_WIDTH + 1, window.innerWidth - width + 1), y: WINDOW_TOP });
    const isList = mode === 'list';
    // Only forum data of the requested group is kept (see the ForumDataMessageEvent handler), so every write goes to that group.
    const effectiveGroupId = groupId;

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
                onClose={closeForum}
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
                {isList && <GroupForumListView key={listCode} listCode={listCode} pageIndex={listPage} onLeave={closeForum} onOpenForum={(id) => openForum(id, { fromList: true })} onPageChange={setListPage} />}
                {mode === 'threads' && forumData && (
                    <GroupForumThreadListView
                        forumData={forumData}
                        groupId={effectiveGroupId}
                        pageIndex={threadsPage}
                        onLeave={leaveThreads}
                        onNewThread={() => setCompose({ kind: 'thread' })}
                        onOpenThread={(thread) => openThread(thread)}
                        onPageChange={setThreadsPage}
                    />
                )}
                {mode === 'thread' && (
                    <GroupForumThreadView
                        forumData={forumData}
                        groupId={effectiveGroupId}
                        initialPageIndex={threadStart.pageIndex}
                        initialThread={currentThread}
                        scrollIndex={threadStart.scrollIndex}
                        threadId={threadId}
                        onBack={backToThreads}
                        onMessagesSeen={onMessagesSeen}
                        onReply={(subject, quote) => setCompose((previous) => ({ kind: 'reply', threadId, subject, quote, quoteSeq: previous && previous.kind === 'reply' && previous.threadId === threadId ? previous.quoteSeq + 1 : 0 }))}
                    />
                )}
            </ForumFrame>
            {compose && forumData && (
                <GroupForumComposeView
                    compose={compose}
                    forumData={forumData}
                    groupId={effectiveGroupId}
                    initialPosition={dialogPosition(455)}
                    readForumData={() => forumRef.current}
                    onClose={() => setCompose(null)}
                    onThreadCreated={(thread) =>
                    {
                        setCompose(null);
                        openThread(thread);
                    }}
                />
            )}
            {isSettingsOpen && forumData && (
                <GroupForumSettingsView forumData={forumData} groupId={effectiveGroupId} initialPosition={dialogPosition(350)} readForumData={() => forumRef.current} onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
};
