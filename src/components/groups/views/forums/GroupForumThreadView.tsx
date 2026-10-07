import {
    ExtendedForumData,
    GetMessagesMessageComposer,
    GuildForumThread,
    MessageData,
    ModerateMessageMessageComposer,
    PostMessageMessageEvent,
    PostThreadMessageEvent,
    ThreadMessagesMessageEvent,
    UpdateForumReadMarkerEntry,
    UpdateForumReadMarkerMessageComposer,
    UpdateMessageMessageEvent,
    UpdateThreadMessageEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, ReportType, SendMessageComposer } from '../../../../api';
import hideIcon from '../../../../assets/images/groups/native/forum_forum_hide.png';
import replyIcon from '../../../../assets/images/groups/native/forum_reply.png';
import reportIcon from '../../../../assets/images/groups/native/forum_forum_report.png';
import unhideIcon from '../../../../assets/images/groups/native/forum_forum_unhide.png';
import { ClassicScrollAreaView, LayoutAvatarImageView } from '../../../../common';
import { useHelp, useMessageEvent } from '../../../../hooks';
import { flatText, GroupText } from '../GroupNativeLayout';
import { FORUM_PAGE_SIZE, FORUM_SURFACE, stripTags, ForumButton, forumAge, ForumPager } from './GroupForumLayout';
import { forumPermissionText } from './GroupForumThreadListView';

// Message states: 0 and 1 are visible, 10 is hidden by a group administrator, 20 deleted by Hotel staff.
const MESSAGE_VISIBLE = 1;
const MESSAGE_HIDDEN_BY_ADMIN = 10;
const MESSAGE_DELETED_BY_STAFF = 20;

const ITEM_WIDTH = 515;

interface GroupForumThreadViewProps {
    forumData: ExtendedForumData;
    groupId: number;
    threadId: number;
    initialThread: GuildForumThread;
    onBack: () => void;
    onReply: (subject: string, quote?: string) => void;
}

export const GroupForumThreadView: FC<GroupForumThreadViewProps> = ({ forumData, groupId, threadId, initialThread, onBack, onReply }) => {
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [thread, setThread] = useState<GuildForumThread>(initialThread);
    const [pageIndex, setPageIndex] = useState<number>(0);
    const { report = null } = useHelp();
    const canModerate = forumData?.hasModeratePermissionError ?? false;
    const canReport = forumData?.canReport ?? false;
    const canPost = forumData?.hasPostMessagePermissionError ?? false;
    const totalMessages = thread?.totalMessages ?? messages.length;
    const pageCount = Math.max(1, Math.ceil(totalMessages / FORUM_PAGE_SIZE));

    useMessageEvent<ThreadMessagesMessageEvent>(ThreadMessagesMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== groupId || parser.threadId !== threadId || parser.startIndex !== pageIndex * FORUM_PAGE_SIZE) return;

        setMessages(parser.messages);

        if (parser.messages.length > 0) {
            const last = parser.messages[parser.messages.length - 1];

            SendMessageComposer(new UpdateForumReadMarkerMessageComposer(new UpdateForumReadMarkerEntry(groupId, last.messageId, true)));
        }
    });

    useMessageEvent<PostMessageMessageEvent>(PostMessageMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== groupId || parser.threadId !== threadId) return;

        setMessages((previous) => (previous.length < FORUM_PAGE_SIZE ? [...previous, parser.message] : previous));
        setThread((previous) => (previous ? Object.assign(Object.create(Object.getPrototypeOf(previous)), previous, { _totalMessages: previous.totalMessages + 1 }) : previous));
    });

    useMessageEvent<UpdateMessageMessageEvent>(UpdateMessageMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== groupId || parser.threadId !== threadId) return;

        setMessages((previous) => previous.map((message) => (message.messageId === parser.message.messageId ? parser.message : message)));
    });

    useMessageEvent<PostThreadMessageEvent>(PostThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId === groupId && parser.thread.threadId === threadId) setThread(parser.thread);
    });

    useMessageEvent<UpdateThreadMessageEvent>(UpdateThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId === groupId && parser.thread.threadId === threadId) setThread(parser.thread);
    });

    useEffect(() => {
        if (!groupId || !threadId) return;

        SendMessageComposer(new GetMessagesMessageComposer(groupId, threadId, pageIndex * FORUM_PAGE_SIZE, FORUM_PAGE_SIZE));
    }, [groupId, threadId, pageIndex]);

    const moderate = (message: MessageData) => {
        SendMessageComposer(new ModerateMessageMessageComposer(groupId, threadId, message.messageId, message.state === MESSAGE_HIDDEN_BY_ADMIN ? MESSAGE_VISIBLE : MESSAGE_HIDDEN_BY_ADMIN));
    };

    const subject = thread?.header ?? '';
    const statusCode = !forumData?.hasPostMessagePermissionError ? forumData?.postMessagePermissionError : '';
    const statusText = statusCode ? forumPermissionText(statusCode, 'operation_post_message') : '';

    return (
        <>
            <GroupText background={FORUM_SURFACE} height={25} overrides={flatText(16, { bold: true, color: 0xa6a6a2 })} text={subject} width={541} x={0} y={115} />
            <div className="octane-forum__list">
                <ClassicScrollAreaView className="octane-forum__scroll is-messages" contentClassName="octane-forum__scroll-content" minThumbSize={26} scrollStep={127}>
                    {messages.map((message) => {
                        const isHiddenByAdmin = message.state === MESSAGE_HIDDEN_BY_ADMIN;
                        const isDeleted = message.state === MESSAGE_DELETED_BY_STAFF;
                        const isHidden = isHiddenByAdmin || isDeleted;
                        const panelColor = isDeleted ? 0xffdfd2 : isHiddenByAdmin ? 0xd7d7cf : 0xc6eff9;
                        const textColor = isDeleted ? 0xffc6ba : isHiddenByAdmin ? 0xe9e9e0 : 0xffffff;
                        const showText = !isHidden || canModerate || isDeleted;
                        const text = isDeleted
                            ? LocalizeText('groupforum.view.message_hidden_by_staff')
                            : isHiddenByAdmin && !canModerate
                              ? LocalizeText('groupforum.view.message_hidden_by_admin', ['ADMIN_NAME', 'admin_name'], [message.adminName, message.adminName])
                              : message.messageText;
                        const actions = (canModerate && !isDeleted ? 1 : 0) + (canReport ? 1 : 0) + 1;
                        const actionsWidth = actions * 22;

                        return (
                            <div key={message.messageId} className="octane-forum__message">
                                <div className="octane-forum__message-bar">
                                    <GroupText background={0x227aad} overrides={flatText(12, { color: 0xeeeeee })} text={forumAge(message.creationTime)} x={0} y={4} />
                                    <GroupText
                                        align="center"
                                        background={0x227aad}
                                        overrides={flatText(12, { color: 0xeeeeee })}
                                        text={'#' + (message.messageIndex + 1)}
                                        width={40}
                                        x={ITEM_WIDTH - actionsWidth - 40}
                                        y={4}
                                    />
                                    <div className="octane-forum__message-actions" style={{ width: actionsWidth }}>
                                        {canModerate && !isDeleted && (
                                            <button className="octane-forum__action is-hide" type="button" onClick={() => moderate(message)}>
                                                <img alt="" draggable={false} src={isHiddenByAdmin ? unhideIcon : hideIcon} style={{ left: 4, top: 5 }} />
                                            </button>
                                        )}
                                        {canReport && (
                                            <button className="octane-forum__action is-report" type="button" onClick={() => report(ReportType.MESSAGE, { groupId, threadId, messageId: message.messageId })}>
                                                <img alt="" draggable={false} src={reportIcon} style={{ left: 2, top: 6 }} />
                                            </button>
                                        )}
                                        <button className="octane-forum__action is-reply" disabled={!canPost} type="button" onClick={() => onReply(subject, message.messageText)}>
                                            <img alt="" draggable={false} src={replyIcon} style={{ left: 2, top: 6 }} />
                                        </button>
                                    </div>
                                </div>
                                <div className="octane-forum__message-body">
                                    <div className="octane-forum__message-author" style={{ background: '#' + panelColor.toString(16).padStart(6, '0') }}>
                                        <GroupText background={panelColor} overrides={{ bold: true }} text={message.authorName} x={2} y={5} />
                                        <GroupText
                                            background={panelColor}
                                            text={LocalizeText('groupforum.view.thread_details1', ['TOTAL_MESSAGES', 'total_messages'], [String(message.authorPostCount), String(message.authorPostCount)])}
                                            x={2}
                                            y={23}
                                        />
                                        <div className="octane-forum__message-avatar">
                                            <LayoutAvatarImageView direction={2} figure={message.authorFigure} />
                                        </div>
                                    </div>
                                    <div className="octane-forum__message-text" style={{ background: '#' + textColor.toString(16).padStart(6, '0') }}>
                                        {showText && (
                                            <GroupText background={textColor} overrides={flatText(12)} text={text} width={ITEM_WIDTH - 130 - 12} wrap x={8} y={4} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </ClassicScrollAreaView>
            </div>
            <div className="octane-forum__footer">
                <ForumButton label={LocalizeText('groupforum.view.back')} width={95} x={10} onClick={onBack} />
                <ForumButton disabled={!canPost} label={LocalizeText('groupforum.view.reply')} right={178} tint="blue" width={95} onClick={() => onReply(subject)} />
                <ForumPager pageCount={pageCount} pageIndex={pageIndex} onPage={setPageIndex} />
            </div>
            {statusText && (
                <div className="octane-forum__status">
                    <GroupText align="center" background={FORUM_SURFACE} overrides={flatText(11)} text={stripTags(statusText)} width={300} x={3} y={3} />
                </div>
            )}
        </>
    );
};
