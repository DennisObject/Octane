import { useCallback } from 'react';
import {
    GetRoomSession,
    HK_MAX_ALERT_LENGTH,
    HousekeepingApi,
    HousekeepingErrorKey,
    IHousekeepingActionResult,
    IHousekeepingRoom,
    IHousekeepingUser,
    LocalizeText,
    NotificationBubbleType,
    validateAmount,
    validateHours,
    validateMinutes,
    validatePositiveId,
    validateRank,
    validateText
} from '../../api';
import { useNotification } from '../notification';
import { useHousekeepingStore } from './useHousekeepingStore';

const SUCCESS_KEY = 'housekeeping.action.success';
const ERROR_KEY = 'housekeeping.action.error';

/** Server messages may be localisation keys or plain text. */
export const localizeHousekeepingMessage = (message: string | null): string => {
    if (!message) return '';
    if (!message.includes('.')) return message;

    return LocalizeText(message);
};

const isOk = (result: IHousekeepingActionResult | null) => !!result && result.ok !== false;

/**
 * Every housekeeping action: validate, claim the single action slot (a second click
 * while one is waiting for its ack is ignored), send, report. The server re-checks
 * permissions and limits on every one of these.
 */
export const useHousekeepingActions = () => {
    const { selectedUser, selectedRoom, setSelectedUser, setSelectedRoom, beginAction, endAction, reportStatus, revealPassword } = useHousekeepingStore();
    const { showSingleBubble } = useNotification();

    const firstError = useCallback(
        (...checks: HousekeepingErrorKey[]): boolean => {
            const failed = checks.find((check) => check !== HousekeepingErrorKey.NONE);

            if (!failed) return false;

            reportStatus(`housekeeping.validation.${failed}`);

            return true;
        },
        [reportStatus]
    );

    const run = useCallback(
        async (send: () => Promise<IHousekeepingActionResult>): Promise<IHousekeepingActionResult | null> => {
            if (!beginAction()) return null;

            try {
                const result = await send();

                if (!isOk(result)) {
                    endAction(result?.message || ERROR_KEY, null);

                    return result;
                }

                const successKey = result.message || SUCCESS_KEY;

                endAction(null, successKey);
                showSingleBubble(localizeHousekeepingMessage(successKey), NotificationBubbleType.INFO);

                return result;
            } catch {
                endAction(ERROR_KEY, null);

                return null;
            }
        },
        [beginAction, endAction, showSingleBubble]
    );

    const patchSelectedUser = useCallback(
        (userId: number, patch: Partial<IHousekeepingUser>) => {
            if (selectedUser && selectedUser.id === userId) setSelectedUser({ ...selectedUser, ...patch });
        },
        [selectedUser, setSelectedUser]
    );

    const patchSelectedRoom = useCallback(
        (roomId: number, patch: Partial<IHousekeepingRoom>) => {
            if (selectedRoom && selectedRoom.id === roomId) setSelectedRoom({ ...selectedRoom, ...patch });
        },
        [selectedRoom, setSelectedRoom]
    );

    // -- user ------------------------------------------------------------------------
    const banUser = useCallback(
        async (userId: number, reason: string, hours: number) => {
            if (firstError(validatePositiveId(userId, 'user'), validateText(reason), validateHours(hours))) return null;

            const result = await run(() => HousekeepingApi.banUser(userId, reason.trim(), hours));

            if (isOk(result)) patchSelectedUser(userId, { isBanned: true });

            return result;
        },
        [firstError, run, patchSelectedUser]
    );

    const unbanUser = useCallback(
        async (userId: number) => {
            if (firstError(validatePositiveId(userId, 'user'))) return null;

            const result = await run(() => HousekeepingApi.unbanUser(userId));

            if (isOk(result)) patchSelectedUser(userId, { isBanned: false });

            return result;
        },
        [firstError, run, patchSelectedUser]
    );

    const muteUser = useCallback(
        async (userId: number, reason: string, minutes: number) => {
            if (firstError(validatePositiveId(userId, 'user'), validateText(reason), validateMinutes(minutes))) return null;

            const result = await run(() => HousekeepingApi.muteUser(userId, reason.trim(), minutes));

            if (isOk(result)) patchSelectedUser(userId, { isMuted: true });

            return result;
        },
        [firstError, run, patchSelectedUser]
    );

    const kickUser = useCallback(
        (userId: number, reason: string) => {
            if (firstError(validatePositiveId(userId, 'user'), validateText(reason))) return null;

            return run(() => HousekeepingApi.kickUser(userId, reason.trim()));
        },
        [firstError, run]
    );

    const forceDisconnectUser = useCallback(
        async (userId: number, reason: string) => {
            if (firstError(validatePositiveId(userId, 'user'), validateText(reason))) return null;

            const result = await run(() => HousekeepingApi.forceDisconnectUser(userId, reason.trim()));

            if (isOk(result)) patchSelectedUser(userId, { online: false });

            return result;
        },
        [firstError, run, patchSelectedUser]
    );

    const tradeLockUser = useCallback(
        async (userId: number, hours: number, reason: string) => {
            if (firstError(validatePositiveId(userId, 'user'), validateText(reason), validateHours(hours))) return null;

            const result = await run(() => HousekeepingApi.tradeLockUser(userId, hours, reason.trim()));

            if (isOk(result)) patchSelectedUser(userId, { isTradeLocked: true });

            return result;
        },
        [firstError, run, patchSelectedUser]
    );

    const setUserRank = useCallback(
        async (userId: number, rank: number) => {
            if (firstError(validatePositiveId(userId, 'user'), validateRank(rank))) return null;

            const result = await run(() => HousekeepingApi.setUserRank(userId, rank));

            if (isOk(result)) patchSelectedUser(userId, { rank });

            return result;
        },
        [firstError, run, patchSelectedUser]
    );

    // The new password comes back in `message`; it goes to the reveal card only, never
    // through `run`'s banner and toast. An empty message (e.g. a mailed reset) shows nothing.
    const resetUserPassword = useCallback(
        async (userId: number) => {
            if (firstError(validatePositiveId(userId, 'user'))) return null;
            if (!beginAction()) return null;

            const username = selectedUser?.id === userId ? selectedUser.username : '';

            try {
                const result = await HousekeepingApi.resetUserPassword(userId);

                if (!isOk(result)) {
                    endAction(result?.message || ERROR_KEY, null);

                    return result;
                }

                revealPassword(userId, username, result.message ?? '');
                endAction(null, 'housekeeping.action.reset_password.done');

                return result;
            } catch {
                endAction(ERROR_KEY, null);

                return null;
            }
        },
        [firstError, beginAction, endAction, selectedUser, revealPassword]
    );

    // -- room ------------------------------------------------------------------------
    const setRoomOpen = useCallback(
        async (roomId: number, open: boolean) => {
            if (firstError(validatePositiveId(roomId, 'room'))) return null;

            const result = await run(() => (open ? HousekeepingApi.openRoom(roomId) : HousekeepingApi.closeRoom(roomId)));

            if (isOk(result)) patchSelectedRoom(roomId, { isLocked: !open });

            return result;
        },
        [firstError, run, patchSelectedRoom]
    );

    // PlusEMU room mutes are an on/off switch: any positive minutes mutes, 0 unmutes.
    const setRoomMuted = useCallback(
        async (roomId: number, muted: boolean) => {
            if (firstError(validatePositiveId(roomId, 'room'))) return null;

            const result = await run(() => HousekeepingApi.muteRoom(roomId, muted ? 1 : 0));

            if (isOk(result)) patchSelectedRoom(roomId, { isMuted: muted });

            return result;
        },
        [firstError, run, patchSelectedRoom]
    );

    const kickAllFromRoom = useCallback(
        async (roomId: number) => {
            if (firstError(validatePositiveId(roomId, 'room'))) return null;

            const result = await run(() => HousekeepingApi.kickAllFromRoom(roomId));

            if (isOk(result)) patchSelectedRoom(roomId, { userCount: 0 });

            return result;
        },
        [firstError, run, patchSelectedRoom]
    );

    const transferRoomOwnership = useCallback(
        async (roomId: number, newOwnerId: number) => {
            if (firstError(validatePositiveId(roomId, 'room'), validatePositiveId(newOwnerId, 'user'))) return null;

            const result = await run(() => HousekeepingApi.transferRoomOwnership(roomId, newOwnerId));

            if (isOk(result)) patchSelectedRoom(roomId, { ownerId: newOwnerId, ownerName: '' });

            return result;
        },
        [firstError, run, patchSelectedRoom]
    );

    const deleteRoom = useCallback(
        async (roomId: number) => {
            if (firstError(validatePositiveId(roomId, 'room'))) return null;

            const result = await run(() => HousekeepingApi.deleteRoom(roomId));

            if (isOk(result) && selectedRoom?.id === roomId) setSelectedRoom(null);

            return result;
        },
        [firstError, run, selectedRoom, setSelectedRoom]
    );

    // -- economy & hotel -------------------------------------------------------------
    const giveCurrency = useCallback(
        (userId: number, amount: number, send: (userId: number, amount: number) => Promise<IHousekeepingActionResult>) => {
            if (firstError(validatePositiveId(userId, 'user'), validateAmount(amount))) return null;

            return run(() => send(userId, amount));
        },
        [firstError, run]
    );

    const giveCredits = useCallback((userId: number, amount: number) => giveCurrency(userId, amount, HousekeepingApi.giveCredits), [giveCurrency]);
    const giveDuckets = useCallback((userId: number, amount: number) => giveCurrency(userId, amount, HousekeepingApi.giveDuckets), [giveCurrency]);
    const giveDiamonds = useCallback((userId: number, amount: number) => giveCurrency(userId, amount, HousekeepingApi.giveDiamonds), [giveCurrency]);
    const setHcSubscription = useCallback((userId: number, days: number) => giveCurrency(userId, days, HousekeepingApi.setHcSubscription), [giveCurrency]);

    const grantItem = useCallback(
        (userId: number, itemId: number, quantity: number) => {
            if (firstError(validatePositiveId(userId, 'user'), validatePositiveId(itemId, 'item'), validateAmount(quantity))) return null;

            return run(() => HousekeepingApi.grantItem(userId, itemId, quantity));
        },
        [firstError, run]
    );

    const sendHotelAlert = useCallback(
        (message: string) => {
            if (firstError(validateText(message, HK_MAX_ALERT_LENGTH))) return null;

            return run(() => HousekeepingApi.sendHotelAlert(message.trim()));
        },
        [firstError, run]
    );

    // -- in the current room -----------------------------------------------------------
    // Uses the same room packets as the avatar menu; the server checks room rights.
    const inCurrentRoom = useCallback(
        (send: (session: ReturnType<typeof GetRoomSession>) => void, successKey: string) => {
            const session = GetRoomSession();

            if (!session) {
                reportStatus('housekeeping.live.no_room');

                return false;
            }

            send(session);
            reportStatus(null, successKey);
            showSingleBubble(LocalizeText(successKey), NotificationBubbleType.INFO);

            return true;
        },
        [reportStatus, showSingleBubble]
    );

    const kickFromCurrentRoom = useCallback(
        (userId: number) => inCurrentRoom((session) => session.sendKickMessage(userId), 'housekeeping.live.kicked'),
        [inCurrentRoom]
    );

    const muteInCurrentRoom = useCallback(
        (userId: number, minutes: number) => inCurrentRoom((session) => session.sendMuteMessage(userId, minutes), 'housekeeping.live.muted'),
        [inCurrentRoom]
    );

    const banFromCurrentRoom = useCallback(
        (userId: number, severity: 'hour' | 'day') =>
            inCurrentRoom((session) => session.sendBanMessage(userId, severity === 'day' ? 'RWUAM_BAN_USER_DAY' : 'RWUAM_BAN_USER_HOUR'), 'housekeeping.live.banned'),
        [inCurrentRoom]
    );

    // -- bulk ------------------------------------------------------------------------
    // Sequential on purpose: acks are matched by action key only, so parallel requests of
    // the same kind could resolve against each other's replies.
    const runBulk = useCallback(
        async (userIds: ReadonlyArray<number>, send: (userId: number) => Promise<IHousekeepingActionResult>) => {
            if (!userIds.length || !beginAction()) return null;

            let ok = 0;

            for (const userId of userIds) {
                try {
                    if (isOk(await send(userId))) ok++;
                } catch {
                    // Counted as failed below.
                }
            }

            const failed = userIds.length - ok;

            endAction(failed && !ok ? 'housekeeping.bulk.failed' : null, failed ? null : 'housekeeping.bulk.success');
            showSingleBubble(LocalizeText('housekeeping.bulk.done', ['ok', 'count'], [String(ok), String(userIds.length)]), NotificationBubbleType.INFO);

            return { ok, failed };
        },
        [beginAction, endAction, showSingleBubble]
    );

    const banUsersBulk = useCallback(
        (userIds: ReadonlyArray<number>, reason: string, hours: number) => {
            if (firstError(validateText(reason), validateHours(hours))) return null;

            return runBulk(userIds, (id) => HousekeepingApi.banUser(id, reason.trim(), hours));
        },
        [firstError, runBulk]
    );

    const kickUsersBulk = useCallback(
        (userIds: ReadonlyArray<number>, reason: string) => {
            if (firstError(validateText(reason))) return null;

            return runBulk(userIds, (id) => HousekeepingApi.kickUser(id, reason.trim()));
        },
        [firstError, runBulk]
    );

    const muteUsersBulk = useCallback(
        (userIds: ReadonlyArray<number>, reason: string, minutes: number) => {
            if (firstError(validateText(reason), validateMinutes(minutes))) return null;

            return runBulk(userIds, (id) => HousekeepingApi.muteUser(id, reason.trim(), minutes));
        },
        [firstError, runBulk]
    );

    return {
        banUser,
        unbanUser,
        muteUser,
        kickUser,
        forceDisconnectUser,
        resetUserPassword,
        setUserRank,
        tradeLockUser,
        setRoomOpen,
        setRoomMuted,
        kickAllFromRoom,
        transferRoomOwnership,
        deleteRoom,
        giveCredits,
        giveDuckets,
        giveDiamonds,
        grantItem,
        setHcSubscription,
        sendHotelAlert,
        kickFromCurrentRoom,
        banFromCurrentRoom,
        muteInCurrentRoom,
        banUsersBulk,
        kickUsersBulk,
        muteUsersBulk
    };
};
