import { AddLinkEventTracker, ILinkEventTracker, RemoveFriendComposer, RemoveLinkEventTracker, SendRoomInviteComposer } from '@octane/renderer';
import { FC, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, LocalizeText, MessengerFriend, MessengerRequest, SendMessageComposer } from '../../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { useFriends } from '../../../../hooks';
import './FriendsListView.css';
import { FriendsRemoveConfirmationView } from './FriendsListRemoveConfirmationView';
import { FriendsRoomInviteView } from './FriendsListRoomInviteView';
import { FriendsSearchView } from './FriendsListSearchView';
import { FriendsListSkinView } from './friends-list-group/FriendsListGroupItemView';
import { FriendsListGroupView } from './friends-list-group/FriendsListGroupView';
import { FriendsListRequestView } from './friends-list-request/FriendsListRequestView';

export const FriendsListView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [selectedFriendsIds, setSelectedFriendsIds] = useState<number[]>([]);
    const [showRoomInvite, setShowRoomInvite] = useState<boolean>(false);
    const [showRemoveFriendsConfirmation, setShowRemoveFriendsConfirmation] = useState<boolean>(false);
    const [activePanel, setActivePanel] = useState<'friends' | 'requests' | 'search' | null>('friends');
    const [isFriendSearchOpen, setIsFriendSearchOpen] = useState(false);
    const [friendSearchValue, setFriendSearchValue] = useState('');
    const [closedCategories, setClosedCategories] = useState(() => new Set([-1]));
    const { onlineFriends = [], offlineFriends = [], requestRows: requests = [], settings, requestFriend = null, requestResponse = null, clearRequestOutcomes } = useFriends();

    const changeVisibility = useCallback((visible: boolean) => {
        if (isVisible && !visible && activePanel === 'requests') clearRequestOutcomes();
        setIsVisible(visible);
    }, [isVisible, activePanel, clearRequestOutcomes]);

    const changePanel = useCallback((panel: 'friends' | 'requests' | 'search' | null) => {
        if (isVisible && activePanel === 'requests' && panel !== 'requests') clearRequestOutcomes();
        setActivePanel(panel);
    }, [isVisible, activePanel, clearRequestOutcomes]);

    const windowRef = useRef<HTMLDivElement>(null);
    const resizeStart = useRef<{ x: number; y: number; width: number; height: number; scaleX: number; scaleY: number } | null>(null);
    const startResize = (event: PointerEvent<HTMLDivElement>) => {
        const element = windowRef.current;
        if (!element) return;
        event.stopPropagation();
        event.preventDefault();
        const bounds = element.getBoundingClientRect();
        resizeStart.current = { x: event.clientX, y: event.clientY, width: element.offsetWidth, height: element.offsetHeight,
            scaleX: bounds.width / element.offsetWidth, scaleY: bounds.height / element.offsetHeight };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const resizeWindow = (event: PointerEvent<HTMLDivElement>) => {
        const start = resizeStart.current;
        const element = windowRef.current;
        if (!start || !element) return;
        element.style.width = `${Math.max(220, start.width + (event.clientX - start.x) / start.scaleX)}px`;
        if (activePanel !== null) element.style.height = `${Math.max(0, start.height + (event.clientY - start.y) / start.scaleY)}px`;
    };
    const stopResize = () => { resizeStart.current = null; };

    const friendSearch = friendSearchValue.trim().toLocaleLowerCase();
    const filteredOnlineFriends = onlineFriends.filter((friend) => !friendSearch || friend.name.toLocaleLowerCase().includes(friendSearch));
    const filteredOfflineFriends = offlineFriends.filter((friend) => !friendSearch || friend.name.toLocaleLowerCase().includes(friendSearch));
    const categories = [
        { id: 0, name: settings?.categories.find((category) => category.id === 0)?.name ?? LocalizeText('friendlist.friends'), friends: filteredOnlineFriends.filter((friend) => friend.categoryId === 0) },
        { id: -1, name: settings?.categories.find((category) => category.id === -1)?.name ?? LocalizeText('friendlist.friends.offlinecaption'), friends: filteredOfflineFriends }
    ];
    const pendingRequestCount = requests.filter((request) => request.state === MessengerRequest.PENDING).length;
    let rowIndex = 0;

    const removeFriendsText = useMemo(() => {
        if (!selectedFriendsIds || !selectedFriendsIds.length) return '';

        const userNames: string[] = [];

        for (const userId of selectedFriendsIds) {
            let existingFriend: MessengerFriend = onlineFriends.find((f) => f.id === userId);

            if (!existingFriend) existingFriend = offlineFriends.find((f) => f.id === userId);

            if (!existingFriend) continue;

            userNames.push(existingFriend.name);
        }

        return LocalizeText('friendlist.removefriendconfirm.userlist', ['user_names'], [userNames.join('\n')]);
    }, [offlineFriends, onlineFriends, selectedFriendsIds]);

    const selectFriend = useCallback(
        (userId: number) => {
            if (userId < 0) return;

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
        [setSelectedFriendsIds]
    );

    const toggleSelectFriends = useCallback((friendIds: number[]) => {
        if (!friendIds.length) return;

        setSelectedFriendsIds((prevValue) => {
            const allSelected = friendIds.every((friendId) => prevValue.indexOf(friendId) >= 0);

            if (allSelected) return prevValue.filter((friendId) => friendIds.indexOf(friendId) === -1);

            const nextValue = [...prevValue];

            for (const friendId of friendIds) {
                if (nextValue.indexOf(friendId) === -1) nextValue.push(friendId);
            }

            return nextValue;
        });
    }, []);

    const sendRoomInvite = (message: string) => {
        if (!selectedFriendsIds.length || !message || !message.length || message.length > 255) return;

        SendMessageComposer(new SendRoomInviteComposer(message, selectedFriendsIds));

        setShowRoomInvite(false);
    };

    const removeSelectedFriends = () => {
        if (selectedFriendsIds.length === 0) return;

        SendMessageComposer(new RemoveFriendComposer(...selectedFriendsIds));
        setSelectedFriendsIds([]);

        setShowRemoveFriendsConfirmation(false);
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
                    case 'request':
                        if (parts.length < 4) return;

                        requestFriend(parseInt(parts[2]), parts[3]);
                }
            },
            eventUrlPrefix: 'friends/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [requestFriend, changeVisibility, isVisible]);

    useEffect(() => {
        if (activePanel === 'requests' && !requests.length) changePanel('friends');
    }, [activePanel, requests.length, changePanel]);

    if (!isVisible) return null;

    const respondToAllRequests = (accept: boolean) => requestResponse(-1, accept);

    return (
        <>
            <DraggableWindow
                uniqueKey="octane-friends"
                handleSelector=".hfl-titlebar"
                windowPosition={DraggableWindowPosition.TOP_LEFT}
                offsetLeft={110}
                offsetTop={50}
            >
                <div
                    ref={windowRef}
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
                            aria-expanded={activePanel === 'friends'}
                            onClick={() => changePanel(activePanel === 'friends' ? null : 'friends')}
                        >
                            {`${LocalizeText('friendlist.friends')} (${onlineFriends.filter((friend) => friend.categoryId === 0).length})`}
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
                            {activePanel === 'friends' && categories.map((category) => {
                                const open = !closedCategories.has(category.id);
                                const headerIndex = rowIndex++;
                                const rowStartIndex = rowIndex;
                                if (open) rowIndex += category.friends.length;
                                const selectable = category.id === 0 && open && category.friends.length >= 5 && GetConfigurationValue<boolean>('friend_list.select_all.enabled', false);
                                return <section key={category.id} className="hfl-section">
                                    <div className={`hfl-section-header${headerIndex % 2 ? ' alternate' : ''}${open ? '' : ' collapsed'}`}>
                                        <button type="button" className="hfl-section-toggle" aria-expanded={open} onClick={() => {
                                            setClosedCategories((previous) => {
                                                const next = new Set(previous);
                                                if (next.has(category.id)) next.delete(category.id);
                                                else next.add(category.id);
                                                return next;
                                            });
                                            if (open) setSelectedFriendsIds((previous) => previous.filter((id) => !category.friends.some((friend) => friend.id === id)));
                                        }}>
                                            <span>{`${category.name} (${category.friends.length})`}</span>
                                        </button>
                                        {selectable && <button type="button" className="hfl-select-all" onClick={() => toggleSelectFriends(category.friends.map((friend) => friend.id))}>
                                            {category.friends.every((friend) => selectedFriendsIds.includes(friend.id)) ? LocalizeText('friendlist.unselect_all') : LocalizeText('friendlist.select_all')}
                                        </button>}
                                    </div>
                                    {open && <div className="hfl-list"><FriendsListGroupView list={category.friends} rowStartIndex={rowStartIndex}
                                        selectedFriendsIds={selectedFriendsIds} selectFriend={selectFriend} /></div>}
                                </section>;
                            })}
                        </div>
                    )}
                    {activePanel === 'friends' && (
                        <div className="hfl-footer" data-testid="friends-footer">
                            <div className="hfl-footer-border">
                                <button
                                    type="button"
                                    className="hfl-footer-button invite"
                                    title={LocalizeText('friendlist.tip.invite')}
                                    onClick={() => setShowRoomInvite(true)}
                                />
                                <button
                                    type="button"
                                    className="hfl-footer-button home"
                                    title={LocalizeText('friendlist.tip.home')}
                                    onClick={() => CreateLinkEvent('navigator/goto/home')}
                                />
                                {isFriendSearchOpen ? (
                                    <div className="hfl-footer-search">
                                        <input autoFocus value={friendSearchValue} onChange={(event) => setFriendSearchValue(event.target.value)} />
                                        <button
                                            type="button"
                                            title={LocalizeText('generic.clear')}
                                            onClick={() => {
                                                if (friendSearchValue.length) setFriendSearchValue('');
                                                else setIsFriendSearchOpen(false);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="hfl-footer-button search"
                                        title={LocalizeText('people.search.title')}
                                        onClick={() => setIsFriendSearchOpen(true)}
                                    />
                                )}
                                <button
                                    type="button"
                                    className="hfl-footer-button delete"
                                    disabled={!selectedFriendsIds.length}
                                    title={LocalizeText('generic.delete')}
                                    onClick={() => selectedFriendsIds.length && setShowRemoveFriendsConfirmation(true)}
                                />
                            </div>
                        </div>
                    )}
                    {!!requests.length && (
                        <button
                            type="button"
                            className="hfl-request-strip"
                            onClick={() => changePanel(activePanel === 'requests' ? null : 'requests')}
                        >
                            {`${LocalizeText('friendlist.tab.friendrequests')} (${pendingRequestCount})`}
                        </button>
                    )}
                    <button type="button" className="hfl-search-strip" onClick={() => changePanel(activePanel === 'search' ? null : 'search')}>
                        {LocalizeText('generic.search')}
                    </button>
                    <div className="hfl-bottom" />
                    <div className="hfl-resize-handle" aria-hidden="true" onPointerDown={startResize} onPointerMove={resizeWindow}
                        onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} />
                </div>
            </DraggableWindow>
            {showRoomInvite && (
                <FriendsRoomInviteView selectedFriendsIds={selectedFriendsIds} sendRoomInvite={sendRoomInvite} onCloseClick={() => setShowRoomInvite(false)} />
            )}
            {showRemoveFriendsConfirmation && (
                <FriendsRemoveConfirmationView
                    removeFriendsText={removeFriendsText}
                    removeSelectedFriends={removeSelectedFriends}
                    selectedFriendsIds={selectedFriendsIds}
                    onCloseClick={() => setShowRemoveFriendsConfirmation(false)}
                />
            )}
        </>
    );
};
