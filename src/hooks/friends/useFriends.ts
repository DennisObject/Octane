import {
    AcceptFriendMessageComposer,
    AcceptFriendResultEvent,
    AddFriendCategoryComposer,
    DeclineFriendMessageComposer,
    FollowFriendFailedEvent,
    FollowFriendMessageComposer,
    FriendListFragmentEvent,
    FriendListUpdateComposer,
    FriendListUpdateEvent,
    FriendParser,
    FriendRequestsEvent,
    GetFriendRequestsComposer,
    GetSessionDataManager,
    HabboSearchResultData,
    HabboSearchResultEvent,
    MessageErrorEvent,
    MessengerInitComposer,
    MessengerInitEvent,
    MoveFriendToCategoryComposer,
    NewFriendRequestEvent,
    RemoveFriendCategoryComposer,
    RenameFriendCategoryComposer,
    RequestFriendComposer,
    RequestOfflineMessagesComposer,
    SetRelationshipStatusComposer
} from '@octane/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    CloneObject,
    LocalizeText,
    localizeWithFallback,
    MessengerFriend,
    MessengerRequest,
    MessengerSettings,
    NotificationAlertType,
    NotificationBubbleType,
    SendMessageComposer,
    withUpdatedFriendCategories
} from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/**
 * Internal singleton store for friend-list state + actions. Public
 * consumers should use useFriendsState (read-only — friends arrays,
 * settings, derived online/offline split) or useFriendsActions
 * (imperative — request / response / follow / update). useFriends is
 * the legacy shim that composes both.
 */
const useFriendsStore = () => {
    const [friends, setFriends] = useState<MessengerFriend[]>([]);
    const [requests, setRequests] = useState<MessengerRequest[]>([]);
    const [sentRequests, setSentRequests] = useState<number[]>([]);
    const [dismissedRequestIds, setDismissedRequestIds] = useState<number[]>([]);
    const [settings, setSettings] = useState<MessengerSettings>(null);
    const [searchResults, setSearchResults] = useState<{ friends: HabboSearchResultData[]; others: HabboSearchResultData[] }>({ friends: [], others: [] });
    const [searchValue, setSearchValue] = useState('');
    const [offlineMessagesReady, setOfflineMessagesReady] = useState(false);
    const friendsRef = useRef<MessengerFriend[]>([]);
    const requestsRef = useRef<MessengerRequest[]>([]);
    const lastRequestedFriendIdRef = useRef<number>(-1);
    const { simpleAlert = null, showSingleBubble = null } = useNotification();

    const pendingRequests = useMemo(() => requests.filter((request) => request.state === MessengerRequest.PENDING), [requests]);

    const onlineFriends = useMemo(() => {
        const onlineFriends = friends.filter((friend) => friend.online);

        onlineFriends.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'accent' }));

        return onlineFriends;
    }, [friends]);

    const offlineFriends = useMemo(() => {
        const offlineFriends = friends.filter((friend) => !friend.online);

        offlineFriends.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'accent' }));

        return offlineFriends;
    }, [friends]);

    const followFriend = (friend: MessengerFriend) => SendMessageComposer(new FollowFriendMessageComposer(friend.id));

    const updateRelationship = (friend: MessengerFriend, type: number) =>
        type !== friend.relationshipStatus && SendMessageComposer(new SetRelationshipStatusComposer(friend.id, type));

    const addCategory = (name: string) => {
        const trimmed = (name ?? '').trim();

        if (!trimmed.length || trimmed.length > 25) return;

        SendMessageComposer(new AddFriendCategoryComposer(trimmed));
    };

    const renameCategory = (categoryId: number, name: string) => {
        const trimmed = (name ?? '').trim();

        if (!categoryId || !trimmed.length || trimmed.length > 25) return;

        SendMessageComposer(new RenameFriendCategoryComposer(categoryId, trimmed));
    };

    const removeCategory = (categoryId: number) => {
        if (!categoryId) return;

        SendMessageComposer(new RemoveFriendCategoryComposer(categoryId));
    };

    const moveFriendToCategory = (friendId: number, categoryId: number) => {
        if (!friendId) return;

        SendMessageComposer(new MoveFriendToCategoryComposer(friendId, categoryId));
    };

    const getFriend = (userId: number) => {
        for (const friend of friends) {
            if (friend.id === userId) return friend;
        }

        return null;
    };

    const canRequestFriend = (userId: number) => {
        if (userId === GetSessionDataManager().userId) return false;

        if (!settings || friends.length >= settings.userFriendLimit) return false;

        if (getFriend(userId)) return false;

        if (sentRequests.indexOf(userId) >= 0) return false;

        return true;
    };

    const requestFriend = (userId: number, userName: string) => {
        if (!canRequestFriend(userId)) {
            if (settings && friendsRef.current.length >= settings.userFriendLimit) showFriendLimit();
            return false;
        }

        lastRequestedFriendIdRef.current = userId;

        setSentRequests((prevValue) => {
            const newSentRequests = [...prevValue];

            newSentRequests.push(userId);

            return newSentRequests;
        });

        SendMessageComposer(new RequestFriendComposer(userName));
    };

    const updateRequests = useCallback((next: MessengerRequest[]) => {
        requestsRef.current = next;
        setRequests(next);
    }, []);

    const clearRequestOutcomes = useCallback(() => {
        updateRequests(requestsRef.current.filter((request) => request.state === MessengerRequest.PENDING));
    }, [updateRequests]);

    const showFriendLimit = () => simpleAlert(
        LocalizeText('friendlist.listfull.text', ['mylimit', 'clublimit'], [String(settings?.userFriendLimit ?? 0), String(settings?.extendedFriendLimit ?? 0)]),
        NotificationAlertType.DEFAULT, null, null, LocalizeText('friendlist.listfull.title')
    );

    const requestResponse = (requestId: number, accept: boolean) => {
        const all = requestId === -1;
        const current = requestsRef.current;
        const targets = all ? current.filter((request) => request.state !== MessengerRequest.ACCEPTED && request.state !== MessengerRequest.DECLINED)
            : current.filter((request) => request.id === requestId && request.state === MessengerRequest.PENDING);

        if (!targets.length) return;

        if (accept && all && settings && friendsRef.current.length + current.length > settings.userFriendLimit) {
            showFriendLimit();
            return;
        }

        const ids = new Set(targets.map((request) => request.id));
        updateRequests(current.map((request) => {
            if (!ids.has(request.id)) return request;
            const next = CloneObject(request);
            next.state = accept ? MessengerRequest.ACCEPTED : MessengerRequest.DECLINED;
            return next;
        }));

        if (accept && !all && settings && friendsRef.current.length >= settings.userFriendLimit) {
            showFriendLimit();
            return;
        }

        SendMessageComposer(accept ? new AcceptFriendMessageComposer(...ids) : new DeclineFriendMessageComposer(all, ...(all ? [] : ids)));
    };

    useMessageEvent<MessengerInitEvent>(MessengerInitEvent, (event) => {
        const parser = event.getParser();

        setSettings(new MessengerSettings(parser.userFriendLimit, parser.normalFriendLimit, parser.extendedFriendLimit, parser.categories));

        SendMessageComposer(new GetFriendRequestsComposer());
        SendMessageComposer(new FriendListUpdateComposer());
    });

    useMessageEvent<FriendListFragmentEvent>(FriendListFragmentEvent, (event) => {
        const parser = event.getParser();

        const newValue = [...friendsRef.current];
        for (const friend of parser.fragment) {
            const index = newValue.findIndex((existingFriend) => existingFriend.id === friend.id);
            const newFriend = new MessengerFriend();
            newFriend.populate(friend);

            if (index > -1) newValue[index] = newFriend;
            else newValue.push(newFriend);
        }
        friendsRef.current = newValue;
        setFriends(newValue);

        if (parser.totalFragments === 0 || parser.fragmentNumber >= parser.totalFragments - 1) setOfflineMessagesReady(true);
    });

    useMessageEvent<FriendListUpdateEvent>(FriendListUpdateEvent, (event) => {
        const parser = event.getParser();
        const previousFriends = new Map(friendsRef.current.map((friend) => [friend.id, friend]));
        const onlineNotifications: MessengerFriend[] = [];

        for (const friend of parser.updatedFriends) {
            const previousFriend = previousFriends.get(friend.id);
            const newFriend = new MessengerFriend();
            newFriend.populate(friend);

            if (previousFriend && !previousFriend.online && newFriend.online) onlineNotifications.push(newFriend);
        }

        setSettings((previous) => withUpdatedFriendCategories(previous, parser.categories));

        const newValue = [...friendsRef.current];

        const processUpdate = (friend: FriendParser) => {
            const index = newValue.findIndex((existingFriend) => existingFriend.id === friend.id);
            const newFriend = new MessengerFriend();
            newFriend.populate(friend);

            if (index === -1) {
                newValue.unshift(newFriend);
            } else {
                newValue[index] = newFriend;
            }
        };

        for (const friend of parser.addedFriends) processUpdate(friend);

        for (const friend of parser.updatedFriends) processUpdate(friend);

        for (const removedFriendId of parser.removedFriendIds) {
            const index = newValue.findIndex((existingFriend) => existingFriend.id === removedFriendId);

            if (index > -1) newValue.splice(index, 1);
        }
        friendsRef.current = newValue;
        setFriends(newValue);

        for (const friend of onlineNotifications) {
            const text = localizeWithFallback('notifications.friend_online', `${friend.name} is online`, ['name'], [friend.name]);

            showSingleBubble?.(text, NotificationBubbleType.FRIENDONLINE, friend.figure, `friends-messenger/${friend.id}`);
        }
    });

    useMessageEvent<FriendRequestsEvent>(FriendRequestsEvent, (event) => {
        const parser = event.getParser();

        updateRequests(parser.requests.map((request) => {
            const next = new MessengerRequest();
            next.populate(request);
            return next;
        }));
    });

    useMessageEvent<HabboSearchResultEvent>(HabboSearchResultEvent, (event) => {
        const parser = event.getParser();
        setSearchResults({ friends: parser.friends, others: parser.others });
    });

    useMessageEvent<FollowFriendFailedEvent>(FollowFriendFailedEvent, () => {
        simpleAlert(LocalizeText('friendlist.followerror.hotelview'), NotificationAlertType.DEFAULT, null, null, LocalizeText('friendlist.alert.title'));
    });

    const showMessengerError = (errorCode: number, messageId = 0) => {
        const localizeKeys: Record<number, string> = {
            1: 'friendlist.error.friendlistownlimit',
            2: 'friendlist.error.friendlistlimitofrequester',
            3: 'friendlist.error.friend_requests_disabled',
            4: 'friendlist.error.requestnotfound',
            7: 'friendlist.error.blocked_by_them',
            8: 'friendlist.error.blocked_by_you'
        };
        const localizeKey = localizeKeys[errorCode];

        simpleAlert(localizeKey ? LocalizeText(localizeKey) : `Received messenger error: msg: ${messageId}, errorCode: ${errorCode}`,
            NotificationAlertType.DEFAULT, null, null, LocalizeText('friendlist.alert.title'));
    };

    useMessageEvent<AcceptFriendResultEvent>(AcceptFriendResultEvent, (event) => {
        const failures = event.getParser().failures;
        const failedIds = new Set(failures.map((failure) => failure.senderId));
        if (failedIds.size) updateRequests(requestsRef.current.map((request) => {
            if (!failedIds.has(request.requesterUserId)) return request;
            const next = CloneObject(request);
            next.state = MessengerRequest.FAILED;
            return next;
        }));
        for (const failure of failures) showMessengerError(failure.errorCode, failure.senderId);
    });

    useMessageEvent<MessageErrorEvent>(MessageErrorEvent, (event) => {
        const parser = event.getParser();

        const requestedFriendId = lastRequestedFriendIdRef.current;

        if (requestedFriendId > 0) setSentRequests((prevValue) => prevValue.filter((userId) => userId !== requestedFriendId));

        lastRequestedFriendIdRef.current = -1;
        showMessengerError(parser.errorCode, parser.clientMessageId);
    });

    useMessageEvent<NewFriendRequestEvent>(NewFriendRequestEvent, (event) => {
        const parser = event.getParser();
        const request = parser.request;

        const newRequests = [...requestsRef.current];

        const index = newRequests.findIndex((existing) => existing.requesterUserId === request.requesterUserId);

        if (index === -1) {
            const newRequest = new MessengerRequest();
            newRequest.populate(request);

            newRequests.push(newRequest);
        }
        updateRequests(newRequests);
    });

    useEffect(() => {
        if (!offlineMessagesReady) return;

        SendMessageComposer(new RequestOfflineMessagesComposer());
        setOfflineMessagesReady(false);
    }, [offlineMessagesReady]);

    useEffect(() => {
        SendMessageComposer(new MessengerInitComposer());
        SendMessageComposer(new FriendListUpdateComposer());

        const interval = setInterval(() => SendMessageComposer(new FriendListUpdateComposer()), 120000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return {
        friends,
        requests: pendingRequests,
        requestRows: requests,
        searchResults,
        searchValue,
        setSearchValue,
        sentRequests,
        dismissedRequestIds,
        setDismissedRequestIds,
        settings,
        onlineFriends,
        offlineFriends,
        getFriend,
        canRequestFriend,
        requestFriend,
        requestResponse,
        clearRequestOutcomes,
        followFriend,
        updateRelationship,
        addCategory,
        renameCategory,
        removeCategory,
        moveFriendToCategory
    };
};

/**
 * Read-only slice of the friends store: the friend list itself
 * (friends, requests, sentRequests, dismissedRequestIds, settings)
 * plus the derived online/offline splits and the lookup helpers
 * (getFriend, canRequestFriend) that don't mutate state.
 *
 * setDismissedRequestIds is exposed here because most consumers that
 * read dismissedRequestIds also need to mutate it (it's UI-local
 * "I've already hidden this banner" state, not server-driven).
 */
export const useFriendsState = () => {
    const {
        friends,
        requests,
        sentRequests,
        dismissedRequestIds,
        setDismissedRequestIds,
        settings,
        onlineFriends,
        offlineFriends,
        getFriend,
        canRequestFriend
    } = useSharedHook(useFriendsStore);

    return {
        friends,
        requests,
        sentRequests,
        dismissedRequestIds,
        setDismissedRequestIds,
        settings,
        onlineFriends,
        offlineFriends,
        getFriend,
        canRequestFriend
    };
};

/**
 * Imperative slice of the friends store: request a new friendship,
 * respond to an incoming request, follow a friend, update an existing
 * relationship.
 */
export const useFriendsActions = () => {
    const { requestFriend, requestResponse, clearRequestOutcomes, followFriend, updateRelationship, addCategory, renameCategory, removeCategory, moveFriendToCategory } =
        useSharedHook(useFriendsStore);

    return {
        requestFriend,
        requestResponse,
        clearRequestOutcomes,
        followFriend,
        updateRelationship,
        addCategory,
        renameCategory,
        removeCategory,
        moveFriendToCategory
    };
};

/**
 * @deprecated Prefer `useFriendsState` (read-only friends list) and
 * `useFriendsActions` (request / follow / update) directly. This shim
 * composes both into the historical `useFriends()` shape so the 16
 * existing consumers keep working unchanged.
 */
export const useFriends = () => useSharedHook(useFriendsStore);

registerSharedHook(useFriendsStore);
