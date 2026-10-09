import { GetSessionDataManager, GroupConfirmMemberRemoveEvent, GroupConfirmRemoveMemberComposer } from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * GroupConfirmMemberRemove is answered with only a userId and a furniture count: the reply names neither the group nor the request
 * it belongs to, and the server may not answer at all (the live emulator stays silent for an ordinary member's own leave request).
 * No timing or ordering rule can bind such a reply safely, so the group windows share one outstanding transaction:
 * - while it is unresolved no other consumer may send GroupConfirmRemoveMember;
 * - the first reply for its user resolves it, and only for the window that owns it; the reply of a closed window is retired by the sink;
 * - a confirmation captured from a reply is valid only for the group on screen and the signed-in user it was captured for (isCurrentSession);
 * - there is no timeout, a late reply is never rebound to a later request;
 * - an unanswered request therefore blocks further requests until the page reloads or the session user changes. A reconnect of the same
 *   user is not detected: the transaction and its late reply are then indistinguishable from a live one.
 */
interface RemovalTransaction {
    owner: number;
    groupId: number;
    userId: number;
    sessionUserId: number;
}

let transaction: RemovalTransaction = null;
let nextOwner = 1;
const liveOwners = new Set<number>();

const currentSessionUserId = () => GetSessionDataManager().userId;

const dropForeignSession = () =>
{
    if (transaction && transaction.sessionUserId !== currentSessionUserId()) transaction = null;
};

/** The outstanding transaction when the reply is for it and `owner` is the window that asked. */
const claimOwned = (owner: number, replyUserId: number): RemovalTransaction =>
{
    dropForeignSession();

    const request = transaction;

    if (!request || request.owner !== owner || request.userId !== replyUserId) return null;

    transaction = null;

    return request;
};

/** Retires the reply for a transaction whose window is gone. The request is discarded, never handed to another window. */
const retireOrphaned = (replyUserId: number) =>
{
    dropForeignSession();

    if (transaction && transaction.userId === replyUserId && !liveOwners.has(transaction.owner)) transaction = null;
};

export interface GroupMemberRemovalActions {
    /** Asks the server what removing userId would cost; false when another request is still unresolved (nothing is sent). */
    request: (groupId: number, userId: number) => boolean;
    /** The transaction this consumer owns when the reply for userId arrives, otherwise null. */
    claimReply: (userId: number) => GroupMemberRemoval;
    /** Whether a confirmation captured from claimReply still belongs to the signed-in user (a dialog can outlive a login). */
    isCurrentSession: (removal: GroupMemberRemoval) => boolean;
}

export interface GroupMemberRemoval {
    groupId: number;
    userId: number;
    sessionUserId: number;
}

export const useGroupMemberRemoval = (): GroupMemberRemovalActions =>
{
    // One id per window for as long as it is mounted.
    const [owner] = useState<number>(() => nextOwner++);

    useEffect(() =>
    {
        liveOwners.add(owner);

        return () =>
        {
            liveOwners.delete(owner);
        };
    }, [owner]);

    const request = useCallback((groupId: number, userId: number) =>
    {
        dropForeignSession();

        if (transaction) return false;

        transaction = { owner, groupId, userId, sessionUserId: currentSessionUserId() };
        SendMessageComposer(new GroupConfirmRemoveMemberComposer(groupId, userId));

        return true;
    }, [owner]);

    const claimReply = useCallback((userId: number) => claimOwned(owner, userId), [owner]);
    const isCurrentSession = useCallback((removal: GroupMemberRemoval) => removal.sessionUserId === currentSessionUserId(), []);

    return { request, claimReply, isCurrentSession };
};

/** Mounted once for the whole client: resolves a reply whose owning window has closed, so it can neither block nor leak to another window. */
export const useGroupMemberRemovalSink = () =>
{
    useMessageEvent<GroupConfirmMemberRemoveEvent>(GroupConfirmMemberRemoveEvent, (event) =>
    {
        retireOrphaned(event.getParser().userId);
    });
};
