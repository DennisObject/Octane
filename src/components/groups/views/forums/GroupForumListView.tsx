import { CreateLinkEvent, ForumData, ForumsListMessageEvent, GetForumsListMessageComposer, UpdateForumReadMarkerEntry, UpdateForumReadMarkerMessageComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { ClassicScrollAreaView, LayoutBadgeImageView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { flatText, GroupText } from '../GroupNativeLayout';
import { FORUM_PAGE_SIZE, FORUM_SURFACE, stripTags, ForumButton, forumAge, ForumPager } from './GroupForumLayout';

const ROW_WIDTH = 532;

interface GroupForumListViewProps {
    listCode: number;
    pageIndex: number;
    onLeave: () => void;
    onOpenForum: (groupId: number) => void;
    onPageChange: (pageIndex: number) => void;
}

export const GroupForumListView: FC<GroupForumListViewProps> = ({ listCode, pageIndex, onLeave, onOpenForum, onPageChange }) => {
    const [forums, setForums] = useState<ForumData[]>([]);
    const [totalForums, setTotalForums] = useState<number>(0);
    const pageCount = Math.max(1, Math.ceil(totalForums / FORUM_PAGE_SIZE));

    useMessageEvent<ForumsListMessageEvent>(ForumsListMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.listCode !== listCode || parser.startIndex !== pageIndex * FORUM_PAGE_SIZE) return;

        setTotalForums(parser.totalAmount);
        setForums(parser.forums);
    });

    useEffect(() => {
        SendMessageComposer(new GetForumsListMessageComposer(listCode, pageIndex * FORUM_PAGE_SIZE, FORUM_PAGE_SIZE));
    }, [listCode, pageIndex]);

    // markForumsAsRead: every listed forum with unread messages is marked read as a whole, then the window closes (back_button of the forums list).
    const markAsRead = () => {
        const entries = forums.filter((forum) => forum.unreadMessages > 0).map((forum) => new UpdateForumReadMarkerEntry(forum.groupId, forum.totalMessages, true));

        if (entries.length) SendMessageComposer(new UpdateForumReadMarkerMessageComposer(...entries));

        onLeave();
    };

    // "Did you know? You can get your own group forum <u><a href=...>here</a></u>." keeps its link as a separate, working piece.
    const status = LocalizeText('groupforum.view.forums_list.status');
    const linkMatch = status.match(/^(.*?)<u><a[^>]*>(.*?)<\/a><\/u>(.*)$/);
    const before = linkMatch ? stripTags(linkMatch[1]) : stripTags(status);
    const linkText = linkMatch ? linkMatch[2] : '';
    const after = linkMatch ? stripTags(linkMatch[3]) : '';

    return (
        <>
            <GroupText background={FORUM_SURFACE} height={25} overrides={flatText(16, { bold: true, color: 0xa6a6a2 })} text={LocalizeText(`groupforum.view.forums_list.${listCode}`)} width={541} x={0} y={115} />
            <div className="octane-forum__list">
                <ClassicScrollAreaView className="octane-forum__scroll" contentClassName="octane-forum__scroll-content" minThumbSize={26} scrollStep={42}>
                    {forums.map((forum, rowIndex) => {
                        const isUnread = forum.unreadMessages > 0;
                        const background = rowIndex % 2 === 1 ? 0xb2e6fa : 0xeefeff;
                        const rowColor = '#' + background.toString(16).padStart(6, '0');
                        const details = stripTags(
                            LocalizeText(
                                'groupforum.view.forum_details',
                                ['RATING', 'LAST_AUTHOR_NAME', 'UPDATE_TIME'],
                                [String(forum.leaderboardScore), forum.lastMessageAuthorName, forumAge(forum.lastMessageTimeAsSecondsAgo)]
                            )
                        );

                        return (
                            <div key={forum.groupId} className="octane-forum__forum" onClick={() => onOpenForum(forum.groupId)}>
                                <div className="octane-forum__forum-badge" style={{ background: rowColor }}>
                                    <LayoutBadgeImageView badgeCode={forum.icon} isGroup={true} />
                                </div>
                                <div className="octane-forum__forum-body" style={{ left: 42, width: ROW_WIDTH - 42 - 1 - 100, background: rowColor }}>
                                    <GroupText background={background} overrides={isUnread ? { bold: true } : undefined} text={forum.name} x={0} y={0} />
                                    <GroupText background={background} overrides={flatText(10)} text={details} x={0} y={16} />
                                </div>
                                <div className="octane-forum__forum-counts" style={{ left: ROW_WIDTH - 100, background: rowColor }}>
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details1', ['TOTAL_MESSAGES', 'total_messages'], [String(forum.totalMessages), String(forum.totalMessages)])}
                                        x={0}
                                        y={0}
                                    />
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details2', ['NEW_MESSAGES', 'new_messages'], [String(forum.unreadMessages), String(forum.unreadMessages)])}
                                        x={0}
                                        y={15}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </ClassicScrollAreaView>
            </div>
            <div className="octane-forum__footer">
                <ForumButton label={LocalizeText('groupforum.view.mark_read')} width={95} x={10} onClick={markAsRead} />
                <ForumPager pageCount={pageCount} pageIndex={pageIndex} onPage={onPageChange} />
            </div>
            <div className="octane-forum__status is-list">
                <GroupText background={FORUM_SURFACE} className="is-static" overrides={flatText(11)} text={before} x={0} y={0} />
                {linkText && (
                    <GroupText background={FORUM_SURFACE} className="is-static is-link" overrides={flatText(11, { underline: true })} text={linkText} x={0} y={0} onClick={() => CreateLinkEvent('catalog/open/guild_forum')} />
                )}
                {after && <GroupText background={FORUM_SURFACE} className="is-static" overrides={flatText(11)} text={after} x={0} y={0} />}
            </div>
        </>
    );
};
