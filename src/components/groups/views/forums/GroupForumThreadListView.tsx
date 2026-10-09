import {
    ExtendedForumData,
    GetThreadsMessageComposer,
    GuildForumThread,
    GuildForumThreadsEvent,
    ModerateThreadMessageComposer,
    PostThreadMessageEvent,
    UpdateThreadMessageComposer,
    UpdateThreadMessageEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, ReportType, SendMessageComposer } from '../../../../api';
import lockedIcon from '../../../../assets/images/groups/native/forum_forum_locked.png';
import unlockedIcon from '../../../../assets/images/groups/native/forum_forum_unlocked.png';
import hideIcon from '../../../../assets/images/groups/native/forum_forum_hide.png';
import pinnedIcon from '../../../../assets/images/groups/native/forum_forum_pinned.png';
import unpinnedIcon from '../../../../assets/images/groups/native/forum_forum_unpinned.png';
import reportIcon from '../../../../assets/images/groups/native/forum_forum_report.png';
import unhideIcon from '../../../../assets/images/groups/native/forum_forum_unhide.png';
import { ClassicScrollAreaView } from '../../../../common';
import { useHelp, useMessageEvent } from '../../../../hooks';
import { flatText, GroupText } from '../GroupNativeLayout';
import { FORUM_PAGE_SIZE, FORUM_SURFACE, stripTags, ForumButton, forumAge, ForumPager } from './GroupForumLayout';

// Thread states: 1 visible, 10 hidden by a group administrator, 20 deleted by Hotel staff.
export const THREAD_HIDDEN_BY_ADMIN = 10;
export const THREAD_DELETED_BY_STAFF = 20;
export const THREAD_VISIBLE = 1;

const ROW_WIDTH = 532;
const BUTTON_WIDTH = 25;

/** Maps the error code of a permission to the text of that refusal ("Only group owner can start new threads."). */
export const forumPermissionText = (code: string, operationKey: string): string => {
    const operation = LocalizeText(`groupforum.view.error.${operationKey}`);

    return LocalizeText(`groupforum.view.error.${code}`, ['operation', 'OPERATION'], [operation, operation]);
};

interface GroupForumThreadListViewProps {
    forumData: ExtendedForumData;
    groupId: number;
    pageIndex: number;
    onLeave: () => void;
    onNewThread: () => void;
    onOpenThread: (thread: GuildForumThread) => void;
    onPageChange: (pageIndex: number) => void;
}


export const GroupForumThreadListView: FC<GroupForumThreadListViewProps> = ({ forumData, groupId, pageIndex, onLeave, onNewThread, onOpenThread, onPageChange }) => {
    const [threads, setThreads] = useState<GuildForumThread[]>([]);
    const { report = null } = useHelp();
    const canModerate = forumData.hasModeratePermissionError;
    const canReport = forumData.canReport;
    const canPostThread = forumData.hasPostThreadPermissionError;
    const pageCount = Math.max(1, Math.ceil(forumData.totalThreads / FORUM_PAGE_SIZE));

    useMessageEvent<GuildForumThreadsEvent>(GuildForumThreadsEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== groupId || parser.startIndex !== pageIndex * FORUM_PAGE_SIZE) return;

        setThreads(parser.threads);
    });

    useMessageEvent<PostThreadMessageEvent>(PostThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== groupId || pageIndex !== 0) return;

        setThreads((previous) => [parser.thread, ...previous.filter((thread) => thread.threadId !== parser.thread.threadId)]);
    });

    useMessageEvent<UpdateThreadMessageEvent>(UpdateThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== groupId) return;

        setThreads((previous) => previous.map((thread) => (thread.threadId === parser.thread.threadId ? parser.thread : thread)));
    });

    useEffect(() => {
        if (!groupId) return;

        SendMessageComposer(new GetThreadsMessageComposer(groupId, pageIndex * FORUM_PAGE_SIZE, FORUM_PAGE_SIZE));
    }, [groupId, pageIndex]);

    const moderate = (thread: GuildForumThread) => {
        SendMessageComposer(new ModerateThreadMessageComposer(groupId, thread.threadId, thread.state === THREAD_HIDDEN_BY_ADMIN ? THREAD_VISIBLE : THREAD_HIDDEN_BY_ADMIN));
    };

    const buttonCount = (canModerate ? 1 : 0) + (canReport ? 1 : 0);
    const buttonsWidth = buttonCount * BUTTON_WIDTH;
    const textsWidth = ROW_WIDTH - 20 - 1 - 1 - 140 - (buttonCount ? 1 + buttonsWidth : 0);
    const sorted = [...threads.filter((thread) => thread.isPinned), ...threads.filter((thread) => !thread.isPinned)];

    const statusKey = !canPostThread ? forumData.postThreadPermissionError : '';

    return (
        <>
            <GroupText background={FORUM_SURFACE} height={25} overrides={flatText(16, { bold: true, color: 0xa6a6a2 })} text={LocalizeText('groupforum.view.all_threads')} width={541} x={0} y={115} />
            <div className="octane-forum__list">
                <ClassicScrollAreaView className="octane-forum__scroll" contentClassName="octane-forum__scroll-content" minThumbSize={26} scrollStep={41}>
                    {sorted.map((thread, rowIndex) => {
                        const isHidden = thread.state === THREAD_HIDDEN_BY_ADMIN || thread.state === THREAD_DELETED_BY_STAFF;
                        const isUnread = thread.unreadMessagesCount > 0;
                        // The rows alternate: the even ones are tinted blue; a hidden thread is grey.
                        const background = isHidden ? 0xaaaaaa : rowIndex % 2 === 1 ? 0xb2e6fa : 0xeefeff;
                        const rowColor = '#' + background.toString(16).padStart(6, '0');
                        const header = isHidden && !canModerate
                            ? LocalizeText(thread.state === THREAD_DELETED_BY_STAFF ? 'groupforum.view.thread_hidden_by_staff' : 'groupforum.view.thread_hidden_by_admin', ['ADMIN_NAME', 'admin_name'], [thread.adminName, thread.adminName])
                            : thread.header;
                        const details = stripTags(
                            LocalizeText(
                                'groupforum.view.thread_details',
                                ['THREAD_AUTHOR_NAME', 'CREATION_TIME', 'LAST_AUTHOR_NAME', 'UPDATE_TIME'],
                                [thread.authorName, forumAge(thread.creationTimeAsSecondsAgo), thread.lastUserName, forumAge(thread.lastCommentTime)]
                            )
                        );

                        return (
                            <div key={thread.threadId} className="octane-forum__thread">
                                <div className="octane-forum__thread-flags" style={{ background: rowColor }}>
                                    <button
                                        className="octane-forum__flag"
                                        disabled={!canModerate}
                                        style={{ top: 0 }}
                                        type="button"
                                        onClick={() => SendMessageComposer(new UpdateThreadMessageComposer(groupId, thread.threadId, !thread.isLocked, thread.isPinned))}
                                    >
                                        <img alt="" draggable={false} src={thread.isLocked ? lockedIcon : unlockedIcon} style={{ left: 3, top: 1 }} />
                                    </button>
                                    <button
                                        className="octane-forum__flag"
                                        disabled={!canModerate}
                                        style={{ top: 20 }}
                                        type="button"
                                        onClick={() => SendMessageComposer(new UpdateThreadMessageComposer(groupId, thread.threadId, thread.isLocked, !thread.isPinned))}
                                    >
                                        <img alt="" draggable={false} src={thread.isPinned ? pinnedIcon : unpinnedIcon} style={{ left: 3, top: 2 }} />
                                    </button>
                                </div>
                                <div className="octane-forum__thread-body" style={{ left: 21, width: textsWidth, background: rowColor }} onClick={() => !isHidden || canModerate ? onOpenThread(thread) : undefined}>
                                    <GroupText background={background} overrides={isUnread ? { bold: true } : undefined} text={header} x={0} y={0} />
                                    <GroupText background={background} overrides={flatText(10)} text={details} x={0} y={16} />
                                </div>
                                <div className="octane-forum__thread-counts" style={{ left: 21 + textsWidth + 1, background: rowColor }}>
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details1', ['TOTAL_MESSAGES', 'total_messages'], [String(thread.totalMessages), String(thread.totalMessages)])}
                                        x={0}
                                        y={0}
                                    />
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details2', ['NEW_MESSAGES', 'new_messages'], [String(thread.unreadMessagesCount), String(thread.unreadMessagesCount)])}
                                        x={0}
                                        y={15}
                                    />
                                </div>
                                {buttonCount > 0 && (
                                    <div className="octane-forum__thread-actions" style={{ left: ROW_WIDTH - buttonsWidth, width: buttonsWidth }}>
                                        {canModerate && (
                                            <button className="octane-forum__action is-hide" type="button" onClick={() => moderate(thread)}>
                                                <img alt="" draggable={false} src={thread.state === THREAD_HIDDEN_BY_ADMIN ? unhideIcon : hideIcon} style={{ left: 5, top: 11 }} />
                                            </button>
                                        )}
                                        {canReport && (
                                            <button className="octane-forum__action is-report" style={{ left: canModerate ? BUTTON_WIDTH : 0 }} type="button" onClick={() => report(ReportType.THREAD, { groupId, threadId: thread.threadId })}>
                                                <img alt="" draggable={false} src={reportIcon} style={{ left: 4, top: 12 }} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </ClassicScrollAreaView>
            </div>
            <div className="octane-forum__footer">
                <ForumButton label={LocalizeText('groupforum.view.mark_read')} width={95} x={10} onClick={onLeave} />
                <ForumButton disabled={!canPostThread} label={LocalizeText('groupforum.view.start_thread')} right={178} tint="blue" width={95} onClick={onNewThread} />
                <ForumPager pageCount={pageCount} pageIndex={pageIndex} onPage={onPageChange} />
            </div>
            {statusKey && (
                <div className="octane-forum__status">
                    <GroupText align="center" background={FORUM_SURFACE} overrides={flatText(11)} text={forumPermissionText(statusKey, 'operation_post_thread')} width={300} x={3} y={3} />
                </div>
            )}
        </>
    );
};
