import { useCallback, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    HousekeepingApi,
    HousekeepingTabId,
    IHousekeepingRoom,
    IHousekeepingUser,
    loadRecentLookups,
    persistRecentLookups,
    pushRecentLookup,
    RecentLookupEntry
} from '../../api';
import { useLocalStorage } from '../useLocalStorage';
import { useHousekeepingOverview } from './useHousekeepingOverview';
import { useHousekeepingSuggestions } from './useHousekeepingSuggestions';

export interface HousekeepingPasswordReveal {
    userId: number;
    username: string;
    password: string;
}

const createSeedUser = (id: number, username: string, figure: string): IHousekeepingUser => ({
    id,
    username,
    motto: '',
    figure,
    rank: 0,
    rankName: '',
    online: true,
    lastOnlineAt: null,
    creditsBalance: 0,
    ducketsBalance: 0,
    diamondsBalance: 0,
    email: '',
    ipLast: '',
    isBanned: false,
    isMuted: false,
    isTradeLocked: false
});

const useHousekeepingStoreInner = () => {
    const [isVisible, setIsVisible] = useState(false);
    // Scoped per user by useLocalStorage; HousekeepingView bounces an unavailable tab.
    const [activeTab, setActiveTab] = useLocalStorage<HousekeepingTabId>('nitro.housekeeping.last_tab', HousekeepingTabId.DASHBOARD);
    const [selectedUser, setSelectedUserState] = useState<IHousekeepingUser | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<IHousekeepingRoom | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [isUserLoading, setIsUserLoading] = useState(false);
    const [isRoomLoading, setIsRoomLoading] = useState(false);
    const [isActionPending, setIsActionPending] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [lastSuccess, setLastSuccess] = useState<string | null>(null);
    const [recentLookups, setRecentLookups] = useState<RecentLookupEntry[]>(() => loadRecentLookups());
    // A reset password is a one-shot secret: memory only, never in the banner or a toast,
    // gone when the panel closes or another user is selected.
    const [passwordReveal, setPasswordReveal] = useState<HousekeepingPasswordReveal | null>(null);
    const actionPendingRef = useRef(false);
    const isVisibleRef = useRef(false);
    const selectedUserIdRef = useRef(0);
    const userTokenRef = useRef(0);
    const roomTokenRef = useRef(0);

    const overview = useHousekeepingOverview(isVisible, activeTab === HousekeepingTabId.DASHBOARD);
    const { suggestions: userSuggestions, request: requestUserSuggestions } = useHousekeepingSuggestions(HousekeepingApi.searchUsers);
    const { suggestions: roomSuggestions, request: requestRoomSuggestions } = useHousekeepingSuggestions(HousekeepingApi.searchRooms);

    const clearStatus = useCallback(() => {
        setLastError(null);
        setLastSuccess(null);
    }, []);

    const setSelectedUser = useCallback((user: IHousekeepingUser | null) => {
        selectedUserIdRef.current = user?.id ?? 0;
        setSelectedUserState(user);
        setPasswordReveal((reveal) => (reveal && reveal.userId === user?.id ? reveal : null));
    }, []);

    // Action acks patch whatever is selected *now*, never the target captured at click time.
    const patchSelectedUser = useCallback((userId: number, patch: Partial<IHousekeepingUser>) => {
        setSelectedUserState((current) => (current?.id === userId ? { ...current, ...patch } : current));
    }, []);

    const patchSelectedRoom = useCallback((roomId: number, patch: Partial<IHousekeepingRoom>) => {
        setSelectedRoom((current) => (current?.id === roomId ? { ...current, ...patch } : current));
    }, []);

    const clearSelectedRoom = useCallback((roomId: number) => setSelectedRoom((current) => (current?.id === roomId ? null : current)), []);

    const rememberLookup = useCallback((entry: RecentLookupEntry) => {
        setRecentLookups((prev) => {
            const next = pushRecentLookup(prev, entry);

            persistRecentLookups(next);

            return next;
        });
    }, []);

    const runUserLookup = useCallback(
        async (request: () => Promise<IHousekeepingUser | null>, keepCurrentOnMiss: boolean) => {
            const token = ++userTokenRef.current;

            setIsUserLoading(true);
            clearStatus();

            try {
                const result = await request();

                if (token !== userTokenRef.current) return null;

                if (result) {
                    setSelectedUser(result);
                    rememberLookup({ kind: 'user', id: result.id, label: result.username, at: Date.now() });
                } else {
                    if (!keepCurrentOnMiss) setSelectedUser(null);

                    setLastError('housekeeping.user.not_found');
                }

                return result;
            } catch {
                if (token === userTokenRef.current) setLastError('housekeeping.action.timeout');

                return null;
            } finally {
                if (token === userTokenRef.current) setIsUserLoading(false);
            }
        },
        [clearStatus, rememberLookup, setSelectedUser]
    );

    const lookupUserByName = useCallback((username: string) => runUserLookup(() => HousekeepingApi.findUserByName(username), false), [runUserLookup]);

    // Keeps an avatar seed visible when the lookup misses, so its actions stay usable.
    const lookupUserById = useCallback((userId: number) => runUserLookup(() => HousekeepingApi.findUserById(userId), true), [runUserLookup]);

    /** Paints what the room already knows about a clicked avatar while the lookup runs. */
    const seedUserFromAvatar = useCallback(
        (userId: number, username: string, figure: string) => {
            if (!Number.isFinite(userId) || userId <= 0) return;

            setSelectedUser(createSeedUser(userId, username || '', figure || ''));
        },
        [setSelectedUser]
    );

    const lookupRoomById = useCallback(
        async (roomId: number) => {
            const token = ++roomTokenRef.current;

            setIsRoomLoading(true);
            clearStatus();

            try {
                const result = await HousekeepingApi.findRoomById(roomId);

                if (token !== roomTokenRef.current) return null;

                setSelectedRoom(result ?? null);

                if (result) rememberLookup({ kind: 'room', id: result.id, label: result.name, at: Date.now() });
                else setLastError('housekeeping.room.not_found');

                return result;
            } catch {
                if (token === roomTokenRef.current) setLastError('housekeeping.action.timeout');

                return null;
            } finally {
                if (token === roomTokenRef.current) setIsRoomLoading(false);
            }
        },
        [clearStatus, rememberLookup]
    );

    /** Claims the single action slot; false while another action is still waiting for its ack. */
    const beginAction = useCallback(() => {
        if (actionPendingRef.current) return false;

        actionPendingRef.current = true;
        setIsActionPending(true);
        setLastError(null);
        setLastSuccess(null);

        return true;
    }, []);

    const endAction = useCallback((errorKey: string | null, successKey: string | null) => {
        actionPendingRef.current = false;
        setIsActionPending(false);
        setLastError(errorKey);
        setLastSuccess(successKey);
    }, []);

    /** Sets the banner without touching the action slot (validation, in-room actions). */
    const reportStatus = useCallback((errorKey: string | null, successKey: string | null = null) => {
        setLastError(errorKey);
        setLastSuccess(successKey);
    }, []);

    // A reply that lands after the panel closed or another user was picked is dropped.
    const revealPassword = useCallback((userId: number, username: string, password: string) => {
        if (password && isVisibleRef.current && selectedUserIdRef.current === userId) setPasswordReveal({ userId, username, password });
    }, []);

    const clearPasswordReveal = useCallback(() => setPasswordReveal(null), []);

    const openPanel = useCallback(() => {
        isVisibleRef.current = true;
        setIsVisible(true);
    }, []);

    const closePanel = useCallback(() => {
        isVisibleRef.current = false;
        setIsVisible(false);
        setPasswordReveal(null);
        clearStatus();
    }, [clearStatus]);

    const togglePanel = useCallback(() => (isVisible ? closePanel() : openPanel()), [isVisible, closePanel, openPanel]);

    const toggleUserSelection = useCallback((userId: number) => {
        setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
    }, []);

    const clearUserSelection = useCallback(() => setSelectedUserIds([]), []);

    return {
        isVisible,
        openPanel,
        closePanel,
        togglePanel,
        activeTab,
        setActiveTab,
        selectedUser,
        setSelectedUser,
        selectedRoom,
        setSelectedRoom,
        patchSelectedUser,
        patchSelectedRoom,
        clearSelectedRoom,
        isUserLoading,
        isRoomLoading,
        lookupUserByName,
        lookupUserById,
        seedUserFromAvatar,
        lookupRoomById,
        userSuggestions,
        requestUserSuggestions,
        roomSuggestions,
        requestRoomSuggestions,
        recentLookups,
        selectedUserIds,
        toggleUserSelection,
        clearUserSelection,
        isActionPending,
        beginAction,
        endAction,
        reportStatus,
        lastError,
        lastSuccess,
        clearStatus,
        passwordReveal,
        revealPassword,
        clearPasswordReveal,
        ...overview
    };
};

/** Singleton behind the housekeeping panel, shared by every tab. */
export const useHousekeepingStore = () => useSharedHook(useHousekeepingStoreInner);

registerSharedHook(useHousekeepingStoreInner);
