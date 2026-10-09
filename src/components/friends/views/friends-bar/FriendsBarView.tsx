import { FC, useLayoutEffect, useState } from 'react';
import friendsBrowseArrowLeft from '../../../../assets/images/toolbar/air/friend-browse-arrow-left.png';
import friendsBrowseArrowRight from '../../../../assets/images/toolbar/air/friend-browse-arrow-right.png';
import friendsBrowseBg from '../../../../assets/images/toolbar/air/friends-browse-bg.png';
import { localizeWithFallback, MessengerFriend } from '../../../../api';
import { FriendBarItemView } from './FriendBarItemView';

// HabboFriendBarView (v4e): 127px tabs with 3px list spacing, the 150px friendtools block and a 16px reserve.
const TAB_WIDTH = 127;
const TAB_SPACING = 3;
const FRIEND_TOOLS_WIDTH = 150;
const BAR_RESERVE = 16;
const MIN_TABS = 3;

// Bar width is the desktop width minus the left bottom bar's right edge.
const resolveCapacity = () =>
{
    const leftDock = document.querySelector('.tb-left-dock');
    const leftEdge = leftDock ? leftDock.getBoundingClientRect().right : 0;

    return Math.max(0, Math.trunc((window.innerWidth - leftEdge - FRIEND_TOOLS_WIDTH - BAR_RESERVE) / (TAB_WIDTH + TAB_SPACING)));
};

// Add-friends tabs fill up to three tabs; at least one is added while there is room for it.
const resolveFindFriendsCount = (capacity: number, used: number) =>
{
    if(used >= capacity) return 0;

    if(used + 1 < MIN_TABS) return Math.min(capacity - used, MIN_TABS - used);

    return 1;
};

export const FriendBarView: FC<{ onlineFriends: MessengerFriend[]; requestsCount?: number }> = (props) =>
{
    const { onlineFriends = [] } = props;
    const [ indexOffset, setIndexOffset ] = useState(0);
    const [ capacity, setCapacity ] = useState(MIN_TABS);
    const [ selectedKey, setSelectedKey ] = useState<string | null>(null);

    useLayoutEffect(() =>
    {
        const measure = () =>
        {
            const next = resolveCapacity();

            setCapacity(prev => (prev === next ? prev : next));
        };

        measure();

        const observer = new ResizeObserver(measure);
        const leftDock = document.querySelector('.tb-left-dock');

        observer.observe(document.documentElement);
        if(leftDock) observer.observe(leftDock);
        window.addEventListener('resize', measure);

        return () =>
        {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, []);

    const friends = onlineFriends.filter(Boolean);
    const total = friends.length + 1;
    const visibleCount = Math.min(capacity, total);
    const offset = Math.max(0, Math.min(indexOffset, total - visibleCount));
    const visibleFriends = friends.slice(offset, offset + capacity);
    const findFriendsCount = resolveFindFriendsCount(capacity, visibleFriends.length);
    const showPaging = (visibleFriends.length + findFriendsCount) < total && total > 0;
    const canPageLeft = offset !== 0;
    const canPageRight = (offset + visibleFriends.length + findFriendsCount) < total;

    const toggleSelected = (key: string) => setSelectedKey(prev => (prev === key ? null : key));

    return (
        <div className="friend-bar">
            {showPaging && (
                <button
                    type="button"
                    disabled={!canPageLeft}
                    aria-label={localizeWithFallback('friendbar.scroll.left', 'Previous friends')}
                    className="friend-bar-button left"
                    onClick={() => { setSelectedKey(null); setIndexOffset(Math.max(0, offset - capacity)); }}
                >
                    <img src={friendsBrowseBg} alt="" className="friend-bar-browse-bg" />
                    <img src={friendsBrowseArrowLeft} alt="" className="friend-bar-browse-arrow" />
                </button>
            )}
            <div className="friend-bar-list">
                {visibleFriends.map(friend => (
                    <FriendBarItemView
                        key={friend.id}
                        friend={friend}
                        selected={selectedKey === `friend-${ friend.id }`}
                        onToggle={() => toggleSelected(`friend-${ friend.id }`)}
                        onDeselect={() => setSelectedKey(null)}
                    />
                ))}
                {Array.from({ length: findFriendsCount }, (_, index) => (
                    <FriendBarItemView
                        key={`find-${ index }`}
                        friend={null}
                        selected={selectedKey === `find-${ index }`}
                        onToggle={() => toggleSelected(`find-${ index }`)}
                        onDeselect={() => setSelectedKey(null)}
                    />
                ))}
            </div>
            {showPaging && (
                <button
                    type="button"
                    disabled={!canPageRight}
                    aria-label={localizeWithFallback('friendbar.scroll.right', 'Next friends')}
                    className="friend-bar-button right"
                    onClick={() => { setSelectedKey(null); setIndexOffset(Math.min(total - capacity, offset + capacity)); }}
                >
                    <img src={friendsBrowseBg} alt="" className="friend-bar-browse-bg" />
                    <img src={friendsBrowseArrowRight} alt="" className="friend-bar-browse-arrow" />
                </button>
            )}
        </div>
    );
};
