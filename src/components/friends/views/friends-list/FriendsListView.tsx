import { AddLinkEventTracker, HabboWebTools, ILinkEventTracker, RemoveFriendComposer, RemoveLinkEventTracker, SendRoomInviteComposer } from '@volt/renderer';
import { CSSProperties, FC, PointerEvent, ReactNode, RefObject, useCallback, useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, GetOptionalConfigurationValue, LocalizeText, MessengerFriend, MessengerRequest, SendMessageComposer } from '../../../../api';
import thumbDefault from '../../../../assets/images/habbo-skin/slices/scroll-thumb-v.png';
import thumbPressed from '../../../../assets/images/habbo-skin/slices/scroll-thumb-v-pressed.png';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { getClassicScrollbarMetrics } from '../../../../common/scroll-area/classicScrollbar.helpers';
import { useFriends, useNotificationActions } from '../../../../hooks';
import './FriendsListView.css';
import { FriendsRemoveConfirmationView } from './FriendsListRemoveConfirmationView';
import { FRIENDS_DIALOG_SIZES, FriendsDialogSnapshot, FriendsRoomInviteView } from './FriendsListRoomInviteView';
import { FriendsSearchView } from './FriendsListSearchView';
import { FriendsListSkinView } from './friends-list-group/FriendsListGroupItemView';
import { FriendsListGroupView } from './friends-list-group/FriendsListGroupView';
import { FriendsListRequestView } from './friends-list-request/FriendsListRequestView';

const FriendsListScrollView = ({ children, positionRef }: { children: ReactNode; positionRef: RefObject<number> }) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ pointerId: number; y: number; scrollTop: number }>(null);
    const [bounds, setBounds] = useState({ content: 0, viewport: 0 });
    const [scrollTop, setScrollTop] = useState(0);
    const [dragging, setDragging] = useState(false);
    const id = useId();
    const metrics = getClassicScrollbarMetrics(bounds.content, bounds.viewport, bounds.viewport - 32, scrollTop);
    const maxScroll = Math.max(0, bounds.content - bounds.viewport);
    const source = dragging ? thumbPressed : thumbDefault;
    const image = <image href={source} width="17" height="24" />;

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;
        viewport.scrollTop = positionRef.current;
        const measure = () => {
            const next = { content: content.offsetHeight, viewport: viewport.clientHeight };
            setBounds((previous) => previous.content === next.content && previous.viewport === next.viewport ? previous : next);
            setScrollTop(viewport.scrollTop);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        observer.observe(content);
        measure();
        return () => observer.disconnect();
    }, [positionRef]);

    const stopDragging = () => { dragRef.current = null; setDragging(false); };
    return <div className="hfl-native-scroll-area">
        <div ref={viewportRef} className={'hfl-native-scroll-viewport' + (metrics.overflow ? ' has-scrollbar' : '')}
            onScroll={(event) => { positionRef.current = event.currentTarget.scrollTop; setScrollTop(event.currentTarget.scrollTop); }}>
            <div ref={contentRef}>{children}</div>
        </div>
        {metrics.overflow && <div className="hfl-native-scrollbar">
            <button type="button" aria-label="Scroll up" className="hfl-native-scroll-up" disabled={scrollTop <= 0}
                onClick={() => viewportRef.current?.scrollBy(0, -15)} />
            <div className="hfl-native-scroll-track" onPointerDown={(event) => {
                if (event.button !== 0 || event.target !== event.currentTarget) return;
                const y = event.clientY - event.currentTarget.getBoundingClientRect().top;
                if (y < metrics.thumbOffset) viewportRef.current?.scrollBy(0, -(bounds.viewport - 15));
                else if (y > metrics.thumbOffset + metrics.thumbSize) viewportRef.current?.scrollBy(0, bounds.viewport - 15);
            }}>
                <div className="hfl-native-scroll-thumb" style={{ top: metrics.thumbOffset, height: metrics.thumbSize }}
                    onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        dragRef.current = { pointerId: event.pointerId, y: event.clientY, scrollTop };
                        setDragging(true);
                    }} onPointerMove={(event) => {
                        const drag = dragRef.current;
                        if (drag?.pointerId !== event.pointerId || !viewportRef.current) return;
                        const travel = bounds.viewport - 32 - metrics.thumbSize;
                        if (travel > 0) viewportRef.current.scrollTop = drag.scrollTop + (event.clientY - drag.y) * maxScroll / travel;
                    }} onPointerUp={stopDragging} onPointerCancel={stopDragging} onLostPointerCapture={stopDragging}>
                    <svg aria-hidden="true" className="hfl-scroll-thumb-middle" width="17" height="100%">
                        <defs><pattern id={id + '-middle'} width="17" height="1" patternUnits="userSpaceOnUse">
                            <svg width="17" height="1" viewBox="0 2 17 1">{image}</svg>
                        </pattern></defs>
                        <rect width="17" height="100%" fill={'url(#' + id + '-middle)'} />
                    </svg>
                    <svg aria-hidden="true" className="hfl-scroll-thumb-top" viewBox="0 0 17 2">{image}</svg>
                    <svg aria-hidden="true" className="hfl-scroll-thumb-bottom" viewBox="0 22 17 2">{image}</svg>
                    <svg aria-hidden="true" className="hfl-scroll-thumb-grip" width="7" height="100%">
                        <defs><pattern id={id + '-grip'} width="7" height="10" patternUnits="userSpaceOnUse">
                            <svg width="7" height="10" viewBox="5 7 7 10">{image}</svg>
                        </pattern></defs>
                        <rect width="7" height="100%" fill={'url(#' + id + '-grip)'} />
                    </svg>
                </div>
            </div>
            <button type="button" aria-label="Scroll down" className="hfl-native-scroll-down" disabled={scrollTop >= maxScroll}
                onClick={() => viewportRef.current?.scrollBy(0, 15)} />
        </div>}
    </div>;
};

export const FriendsListView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [selectedFriendsIds, setSelectedFriendsIds] = useState<number[]>([]);
    const [roomInviteSnapshot, setRoomInviteSnapshot] = useState<FriendsDialogSnapshot>(null);
    const [removeConfirmationSnapshot, setRemoveConfirmationSnapshot] = useState<FriendsDialogSnapshot>(null);
    const nextDialogKeyRef = useRef(0);
    const [activePanel, setActivePanel] = useState<'friends' | 'requests' | 'search' | null>('friends');
    const [isFriendSearchOpen, setIsFriendSearchOpen] = useState(false);
    const [friendSearchValue, setFriendSearchValue] = useState('');
    const [appliedFriendSearch, setAppliedFriendSearch] = useState('');
    const [pages, setPages] = useState<Record<number, number>>({ 0: 0, [-1]: 0 });
    const [width, setWidth] = useState(230);
    const [tabHeight, setTabHeight] = useState(252);
    const [hoverInfo, setHoverInfo] = useState('');
    const initializedRef = useRef(false);
    const filterRef = useRef<HTMLInputElement>(null);
    const lastInviteRef = useRef(-Infinity);
    const friendScrollPositionRef = useRef(0);
    const { simpleAlert } = useNotificationActions();
    const [closedCategories, setClosedCategories] = useState(() => new Set([-1]));
    const { onlineFriends = [], offlineFriends = [], requestRows: requests = [], searchResults, settings, friendListReceived = false, requestFriend = null, requestResponse = null, clearRequestOutcomes } = useFriends();
    const categoryManagementEnabled = GetConfigurationValue<boolean>('friendship.category.management.enabled', false) && GetConfigurationValue<number>('spaweb', 0) !== 1;
    const friendListReceivedRef = useRef(false);

    useEffect(() =>
    {
        if (!friendListReceived || friendListReceivedRef.current) return;

        friendListReceivedRef.current = true;
        setClosedCategories((previous) =>
        {
            const next = new Set(previous);

            if (onlineFriends.length) next.add(-1);
            else next.delete(-1);

            return next;
        });
    }, [friendListReceived, onlineFriends.length]);

    const changeVisibility = useCallback((visible: boolean) => {
        if (isVisible && !visible && activePanel === 'requests') clearRequestOutcomes();
        if (visible && !initializedRef.current) {
            initializedRef.current = true;
            setTabHeight(350 - 62 - 18 * (requests.length ? 3 : 2));
        }
        if (!visible) setHoverInfo('');
        setIsVisible(visible);
    }, [isVisible, activePanel, clearRequestOutcomes, requests.length]);

    const changePanel = useCallback((panel: 'friends' | 'requests' | 'search' | null) => {
        if (isVisible && activePanel === 'requests' && panel !== 'requests') clearRequestOutcomes();
        setActivePanel(panel);
    }, [isVisible, activePanel, clearRequestOutcomes]);

    const windowRef = useRef<HTMLDivElement>(null);
    const resizeStart = useRef<{ x: number; y: number; width: number; tabHeight: number; scaleX: number; scaleY: number } | null>(null);
    const startResize = (event: PointerEvent<HTMLDivElement>) => {
        const element = windowRef.current;
        if (!element || event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        const bounds = element.getBoundingClientRect();
        resizeStart.current = { x: event.clientX, y: event.clientY, width: element.offsetWidth, tabHeight,
            scaleX: bounds.width / element.offsetWidth, scaleY: bounds.height / element.offsetHeight };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const resizeWindow = (event: PointerEvent<HTMLDivElement>) => {
        const start = resizeStart.current;
        const element = windowRef.current;
        if (!start || !element) return;
        setWidth(Math.max(220, start.width + (event.clientX - start.x) / start.scaleX));
        if (activePanel !== null) setTabHeight(Math.max(100, start.tabHeight + (event.clientY - start.y) / start.scaleY));
    };
    const stopResize = () => { resizeStart.current = null; };

    const categories = useMemo(() => {
        const filter = (friend: MessengerFriend) => !appliedFriendSearch || friend.name.toLowerCase().includes(appliedFriendSearch);
        const online = onlineFriends.filter((friend) => friend.categoryId === 0);
        return [
            { id: 0, name: settings?.categories.find((category) => category.id === 0)?.name ?? LocalizeText('friendlist.friends'), allFriends: online, friends: online.filter(filter) },
            { id: -1, name: settings?.categories.find((category) => category.id === -1)?.name ?? LocalizeText('friendlist.friends.offlinecaption'), allFriends: offlineFriends, friends: offlineFriends.filter(filter) }
        ];
    }, [onlineFriends, offlineFriends, settings, appliedFriendSearch]);
    const onlinePages = Math.max(1, Math.ceil(categories[0].friends.length / 100));
    const offlinePages = Math.max(1, Math.ceil(categories[1].friends.length / 100));
    useEffect(() => {
        setPages((previous) => {
            const online = closedCategories.has(0) ? previous[0] : Math.min(previous[0], onlinePages - 1);
            const offline = closedCategories.has(-1) ? previous[-1] : Math.min(previous[-1], offlinePages - 1);
            return online === previous[0] && offline === previous[-1] ? previous : { 0: online, [-1]: offline };
        });
    }, [onlinePages, offlinePages, closedCategories]);
    const applyCurrentFilter = useCallback(() => {
        setAppliedFriendSearch(isFriendSearchOpen ? friendSearchValue.toLowerCase() : '');
    }, [isFriendSearchOpen, friendSearchValue]);
    const refreshFriendFilter = useEffectEvent(applyCurrentFilter);
    useEffect(() => {
        refreshFriendFilter();
    }, [onlineFriends, offlineFriends]);
    const resetFilter = () => {
        setFriendSearchValue('');
        setAppliedFriendSearch('');
        setIsFriendSearchOpen(false);
    };
    const createDialogSnapshot = (kind: keyof typeof FRIENDS_DIALOG_SIZES): FriendsDialogSnapshot => {
        const selected = new Set(selectedFriendsIds);
        const friends = [...onlineFriends.filter((friend) => friend.categoryId === 0), ...offlineFriends].filter((friend) => selected.has(friend.id));
        const ids = friends.map((friend) => friend.id);
        const names = friends.map((friend) => friend.name);
        const bounds = windowRef.current?.getBoundingClientRect();
        const size = FRIENDS_DIALOG_SIZES[kind];
        return {
            key: ++nextDialogKeyRef.current,
            ids,
            names,
            caption: kind === 'invite' ? LocalizeText('friendlist.invite.summary', ['count'], [String(ids.length)])
                : LocalizeText('friendlist.removefriendconfirm.userlist', ['user_names'], [names.join(', ')]),
            initialPosition: bounds ? { x: Math.trunc(bounds.x + (bounds.width - size.width) / 2), y: Math.trunc(bounds.y + (bounds.height - size.height) / 2) }
                : { x: 300, y: 200 }
        };
    };
    const openRoomInvite = () => {
        if (!selectedFriendsIds.length) return;
        if (Date.now() - lastInviteRef.current < 60000) {
            simpleAlert(LocalizeText('friendlist.invite.frequentalert.text'), null, null, null, LocalizeText('friendlist.invite.frequentalert.title'));
            return;
        }
        setRoomInviteSnapshot(createDialogSnapshot('invite'));
    };
    const openRemoveConfirmation = () => {
        if (selectedFriendsIds.length) setRemoveConfirmationSnapshot(createDialogSnapshot('remove'));
    };
    const openFriendHomepage = () => {
        if (selectedFriendsIds.length !== 1) return;
        const friend = [...onlineFriends, ...offlineFriends].find((item) => item.id === selectedFriendsIds[0]);
        const template = GetOptionalConfigurationValue<string>('link.format.userpage', '');
        if (!friend || !template) return;
        const url = template.replace(/%ID%/g, String(friend.id)).replace(/%username%/g, friend.name);
        HabboWebTools.openWebPage(url);
    };
    const hoverTip = (key: string) => ({ onMouseEnter: () => setHoverInfo(LocalizeText(key)), onMouseLeave: () => setHoverInfo('') });
    const pendingRequestCount = requests.filter((request) => request.state === MessengerRequest.PENDING).length;
    let rowIndex = 0;

    const selectFriend = useCallback(
        (userId: number) => {
            if (userId < 0) return;
            applyCurrentFilter();

            setSelectedFriendsIds((prevValue) => {
                const newValue = [...prevValue];

                const existingUserIdIndex: number = newValue.indexOf(userId);

                if (existingUserIdIndex > -1) {
                    newValue.splice(existingUserIdIndex, 1);
                } else {
                    newValue.push(userId);
                }

                return newValue;
            });
        },
        [setSelectedFriendsIds, applyCurrentFilter]
    );

    const toggleSelectFriends = useCallback((friendIds: number[], categoryFriendIds: number[]) => {
        if (!friendIds.length) return;
        applyCurrentFilter();

        setSelectedFriendsIds((prevValue) => {
            const allSelected = categoryFriendIds.every((friendId) => prevValue.indexOf(friendId) >= 0);

            if (allSelected) return prevValue.filter((friendId) => friendIds.indexOf(friendId) === -1);

            const nextValue = [...prevValue];

            for (const friendId of friendIds) {
                if (nextValue.indexOf(friendId) === -1) nextValue.push(friendId);
            }

            return nextValue;
        });
    }, [applyCurrentFilter]);

    const sendRoomInvite = (message: string, ids: number[]) => {
        if (!ids.length || !message) return;

        SendMessageComposer(new SendRoomInviteComposer(message, ids));
        lastInviteRef.current = Date.now();

        setRoomInviteSnapshot(null);
    };

    const removeSelectedFriends = (ids: number[]) => {
        if (ids.length === 0) return;

        SendMessageComposer(new RemoveFriendComposer(...ids));
        setSelectedFriendsIds([]);

        setRemoveConfirmationSnapshot(null);
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        changeVisibility(true);
                        return;
                    case 'hide':
                        changeVisibility(false);
                        return;
                    case 'toggle':
                        changeVisibility(!isVisible);
                        return;
                    case 'search':
                        // Friend bar search icon: opens the list on its search tab, closes it when already there.
                        if (isVisible && activePanel === 'search') {
                            changeVisibility(false);
                            return;
                        }
                        changePanel('search');
                        changeVisibility(true);
                        return;
                    case 'request':
                        if (parts.length < 4) return;

                        requestFriend(parseInt(parts[2]), parts[3]);
                }
            },
            eventUrlPrefix: 'friends/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [requestFriend, changeVisibility, changePanel, isVisible, activePanel]);

    useEffect(() => {
        if (activePanel === 'requests' && !requests.length) changePanel('friends');
    }, [activePanel, requests.length, changePanel]);

    if (!isVisible) return null;

    const respondToAllRequests = (accept: boolean) => requestResponse(-1, accept);

    return (
        <>
            <DraggableWindow
                uniqueKey="volt-friends"
                handleSelector=".hfl-titlebar"
                windowPosition={DraggableWindowPosition.TOP_LEFT}
                offsetLeft={60}
                offsetTop={0}
            >
                <div
                    ref={windowRef}
                    style={{ width, height: (activePanel === null ? 0 : tabHeight) + 18 * (requests.length ? 3 : 2) + 62, '--hfl-tab-height': `${tabHeight}px` } as CSSProperties}
                    className={`habbo-friend-list${requests.length ? ' has-requests' : ''}${activePanel === 'search' ? ' search-mode' : ''}${activePanel === 'requests' ? ' requests-mode' : ''}${activePanel === null ? ' collapsed-mode' : ''}`}
                >
                    <div className="hfl-titlebar drag-handler">
                        <span className="hfl-titlebar-grip" />
                        <span className="hfl-title">{LocalizeText('friendlist.friends')}</span>
                        <button type="button" className="hfl-close" onClick={() => changeVisibility(false)} />
                    </div>
                    <div className="hfl-category">
                        <button
                            type="button"
                            className="hfl-category-current"
                            {...hoverTip('friendlist.tip.tab.1')}
                            aria-expanded={activePanel === 'friends'}
                            onClick={() => changePanel(activePanel === 'friends' ? null : 'friends')}
                        >
                            {LocalizeText('friendlist.friends')}
                        </button>
                    </div>
                    {activePanel !== null && (
                        <div className="hfl-content">
                            {activePanel === 'search' && <FriendsSearchView />}
                            {activePanel === 'requests' && (
                                <>
                                    <FriendsListRequestView />
                                    <div className="hfl-request-footer" data-testid="requests-footer">
                                        <FriendsListSkinView border />
                                        <button type="button" data-action="accept-all" disabled={!pendingRequestCount} onClick={() => respondToAllRequests(true)}>
                                            <FriendsListSkinView /><i className="hfl-request-accept-icon" /><span>{LocalizeText('friendlist.requests.acceptall')}</span>
                                        </button>
                                        <button type="button" data-action="dismiss-all" disabled={!pendingRequestCount} onClick={() => respondToAllRequests(false)}>
                                            <FriendsListSkinView /><i className="hfl-request-decline-icon" /><span>{LocalizeText('friendlist.requests.dismissall')}</span>
                                        </button>
                                    </div>
                                </>
                            )}
                            {activePanel === 'friends' && <FriendsListScrollView positionRef={friendScrollPositionRef}>{categories.map((category) => {
                                const open = !closedCategories.has(category.id);
                                const pageCount = Math.ceil(category.friends.length / 100);
                                const page = Math.min(pages[category.id], Math.max(0, pageCount - 1));
                                const visibleFriends = category.friends.slice(page * 100, (page + 1) * 100);
                                const headerIndex = rowIndex++;
                                const rowStartIndex = rowIndex;
                                if (open) rowIndex += visibleFriends.length;
                                const selectable = category.id === 0 && open && category.friends.length >= 5 && GetConfigurationValue<boolean>('friend_list.select_all.enabled', false);
                                return <section key={category.id} className="hfl-section">
                                    <div className={`hfl-section-header${headerIndex % 2 ? ' alternate' : ''}${open ? '' : ' collapsed'}`}>
                                        <button type="button" className="hfl-section-toggle" aria-expanded={open} onClick={() => {
                                            applyCurrentFilter();
                                            setClosedCategories((previous) => {
                                                const next = new Set(previous);
                                                if (next.has(category.id)) next.delete(category.id);
                                                else next.add(category.id);
                                                return next;
                                            });
                                            if (open) setSelectedFriendsIds((previous) => previous.filter((id) => !category.allFriends.some((friend) => friend.id === id)));
                                        }}>
                                            <span>{`${category.name} (${category.friends.length})`}</span>
                                        </button>
                                        {selectable && <button type="button" className="hfl-select-all" onClick={() => toggleSelectFriends(category.friends.map((friend) => friend.id), category.allFriends.map((friend) => friend.id))}>
                                            {category.allFriends.every((friend) => selectedFriendsIds.includes(friend.id)) ? LocalizeText('friendlist.unselect_all') : LocalizeText('friendlist.select_all')}
                                        </button>}
                                        {open && pageCount > 1 && <div className="hfl-pager">
                                            {Array.from({ length: pageCount }, (_, index) => <button type="button" key={index}
                                                aria-current={page === index ? 'page' : undefined} className={page === index ? ' selected' : ''}
                                                onClick={() => { applyCurrentFilter(); setPages((previous) => ({ ...previous, [category.id]: index })); }}>
                                                {`${index * 100 + 1}-${(index + 1) * 100}`}
                                            </button>)}
                                        </div>}
                                    </div>
                                    {open && <div className="hfl-list"><FriendsListGroupView list={visibleFriends} rowStartIndex={rowStartIndex}
                                        selectedFriendsIds={selectedFriendsIds} selectFriend={selectFriend} /></div>}
                                </section>;
                            })}</FriendsListScrollView>}
                        </div>
                    )}
                    {activePanel === 'friends' && (
                        <div className="hfl-footer" data-testid="friends-footer">
                            <div className="hfl-footer-border">
                                <FriendsListSkinView border />
                                <button
                                    type="button"
                                    className="hfl-footer-button invite"
                                    {...hoverTip('friendlist.tip.invite')}
                                    disabled={!selectedFriendsIds.length}
                                    aria-label={LocalizeText('friendlist.tip.invite')}
                                    onClick={openRoomInvite}
                                ><FriendsListSkinView /></button>
                                <button
                                    type="button"
                                    className="hfl-footer-button home"
                                    {...hoverTip('friendlist.tip.home')}
                                    disabled={selectedFriendsIds.length !== 1}
                                    aria-label={LocalizeText('friendlist.tip.home')}
                                    onClick={openFriendHomepage}
                                ><FriendsListSkinView /></button>
                                {isFriendSearchOpen ? (
                                    <div className="hfl-footer-search">
                                        <input ref={filterRef} autoFocus value={friendSearchValue} aria-label={LocalizeText('friendlist.tip.search')}
                                            {...hoverTip('friendlist.tip.search')}
                                            onChange={(event) => setFriendSearchValue(event.target.value)} onKeyDown={(event) => {
                                                if (event.key === 'Escape') resetFilter();
                                                else if (event.key === 'Enter') {
                                                    applyCurrentFilter();
                                                    filterRef.current?.focus();
                                                }
                                            }} />
                                        <button type="button" aria-label={LocalizeText('generic.clear')} onClick={resetFilter} />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="hfl-footer-button search"
                                        {...hoverTip('friendlist.tip.search')}
                                        aria-label={LocalizeText('friendlist.tip.search')}
                                        onClick={() => setIsFriendSearchOpen(true)}
                                    ><FriendsListSkinView /></button>
                                )}
                                <button
                                    type="button"
                                    className="hfl-footer-button delete"
                                    disabled={!selectedFriendsIds.length}
                                    {...hoverTip('friendlist.tip.remove')}
                                    aria-label={LocalizeText('friendlist.tip.remove')}
                                    onClick={openRemoveConfirmation}
                                ><FriendsListSkinView /></button>
                            </div>
                        </div>
                    )}
                    {!!requests.length && (
                        <button
                            type="button"
                            className="hfl-request-strip"
                            {...hoverTip('friendlist.tip.tab.2')}
                            onClick={() => changePanel(activePanel === 'requests' ? null : 'requests')}
                        >
                            {LocalizeText('friendlist.tab.friendrequests')}
                        </button>
                    )}
                    <button type="button" {...hoverTip('friendlist.tip.tab.3')} className="hfl-search-strip" onClick={() => changePanel(activePanel === 'search' ? null : 'search')}>
                        {LocalizeText('generic.search')}
                    </button>
                    <div className="hfl-bottom">
                        {categoryManagementEnabled && (
                            <button
                                type="button"
                                className="hfl-edit-categories"
                                {...hoverTip('friendlist.tip.preferences')}
                                onClick={() =>
                                {
                                    const url = GetOptionalConfigurationValue<string>('link.format.friendlist.pref', '');

                                    if (url) HabboWebTools.openWebPage(url);
                                }}
                            >
                                <i className="hfl-edit-categories-icon" />
                                <span>{LocalizeText('friendlist.settings')}</span>
                            </button>
                        )}
                        <span className="hfl-info-text">{hoverInfo}</span>
                    </div>
                    <div className="hfl-resize-handle" aria-hidden="true" onPointerDown={startResize} onPointerMove={resizeWindow}
                        onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} />
                </div>
            </DraggableWindow>
            {roomInviteSnapshot && (
                <FriendsRoomInviteView key={roomInviteSnapshot.key} snapshot={roomInviteSnapshot} sendRoomInvite={sendRoomInvite} onCloseClick={() => setRoomInviteSnapshot(null)} />
            )}
            {removeConfirmationSnapshot && (
                <FriendsRemoveConfirmationView
                    key={removeConfirmationSnapshot.key}
                    snapshot={removeConfirmationSnapshot}
                    removeSelectedFriends={removeSelectedFriends}
                    onCloseClick={() => setRemoveConfirmationSnapshot(null)}
                />
            )}
        </>
    );
};
