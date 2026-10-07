import { GetSessionDataManager, GroupConfirmMemberRemoveEvent, GroupConfirmRemoveMemberComposer } from '@octane/renderer';
import { useCallback, useEffect, useRef } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * GroupConfirmMemberRemove is answered with only a userId and a furniture count: the reply names neither the group nor the request
 * it belongs to, and the server may not answer at all (the live emulator stays silent for an ordinary member's own leave request).
 * No timing or ordering rule can bind such a reply safely, so the group windows share one outstanding transaction:
 * - while it is unresolved no other consumer may send GroupConfirmRemoveMember;
 * - the first reply for its user resolves it, and only for the consumer that owns it (a closed owner's reply is dropped by the sink);
 * - there is no timeout, a late reply is never rebound to a later request;
 * - an unanswered request therefore blocks further requests until the page reloads or the session user changes.
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

const dropForeignSession = () => {
    if (transaction && transaction.sessionUserId !== currentSessionUserId()) transaction = null;
};

const claim = (owner: number, replyUserId: number): RemovalTransaction => {
    dropForeignSession();

    const request = transaction;

    if (!request || request.userId !== replyUserId) return null;
    if (request.owner !== owner && liveOwners.has(request.owner)) return null;

    transaction = null;

    return request;
};

export interface GroupMemberRemovalActions {
    /** Asks the server what removing userId would cost; false when another request is still unresolved (nothing is sent). */
    request: (groupId: number, userId: number) => boolean;
    /** The transaction this consumer owns when the reply for userId arrives, otherwise null. */
    claimReply: (userId: number) => { groupId: number; userId: number };
}

export const useGroupMemberRemoval = (): GroupMemberRemovalActions => {
    const ownerRef = useRef<number>(0);

    if (!ownerRef.current) ownerRef.current = nextOwner++;

    useEffect(() => {
        const owner = ownerRef.current;

        liveOwners.add(owner);

        return () => {
            liveOwners.delete(owner);
        };
    }, []);

    const request = useCallback((groupId: number, userId: number) => {
        dropForeignSession();

        if (transaction) return false;

        transaction = { owner: ownerRef.current, groupId, userId, sessionUserId: currentSessionUserId() };
        SendMessageComposer(new GroupConfirmRemoveMemberComposer(groupId, userId));

        return true;
    }, []);

    const claimReply = useCallback((userId: number) => claim(ownerRef.current, userId), []);

    return { request, claimReply };
};

/** Mounted once for the whole client: resolves a reply whose owning window has closed, so it can neither block nor leak to another window. */
export const useGroupMemberRemovalSink = () => {
    useMessageEvent<GroupConfirmMemberRemoveEvent>(GroupConfirmMemberRemoveEvent, (event) => {
        claim(0, event.getParser().userId);
    });
};
