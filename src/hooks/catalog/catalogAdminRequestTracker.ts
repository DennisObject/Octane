/**
 * Every catalog admin request on the wire that is not a save, in the order it was sent. Saves are
 * not here: they are matched by the operation id of their Smart Save acknowledgement.
 *
 * The server answers in the order it received the requests. Two kinds of answer arrive:
 * - a request's own packet (session, history, page or offer details). It settles the oldest entry
 *   of its kind, and of its entity id when it carries one, together with every identical read
 *   queued after it (reads are idempotent). Entries ahead of the first match were answered
 *   before it or never will be, so they leave the queue too, as unanswered.
 * - a bare CatalogAdminResult (success + message, no id). It belongs to the head of the queue,
 *   and only if the head's kind accepts it: a structural change accepts any, a read only a
 *   refusal. Otherwise it is credited to nothing. The queue is never reordered.
 *
 * A request without an answer after its timeout is reported as unanswered and stays in place as
 * "expired": if it reaches the head, it absorbs the next bare answer its kind accepts (its late
 * answer); a later own-packet answer drops it with everything else ahead of that answer, or
 * settles it together with its retry when it is the same read.
 *
 * Nothing here sends: requests are only made while the connection reports `authenticated` (the
 * renderer sets it on AuthenticationOK), and a close or reconnect resets the queue.
 */
export type CatalogAdminRequestKind = 'session' | 'history' | 'pageDetails' | 'offerDetails' | 'structural';

/** Why a request never got its answer: it timed out, a later answer passed it, or tracking was reset. */
export type CatalogAdminUnansweredReason = 'timeout' | 'skipped' | 'reset';

export interface CatalogAdminRequestHandlers {
    /** For details reads: the page or offer id the answer names. */
    entityId?: number;
    timeoutMs?: number;
    /** A bare CatalogAdminResult answered this request. */
    onBare?: (success: boolean, message: string) => void;
    onUnanswered?: (reason: CatalogAdminUnansweredReason) => void;
}

interface CatalogAdminRequestEntry {
    id: number;
    kind: CatalogAdminRequestKind;
    entityId: number | null;
    expired: boolean;
    handlers: CatalogAdminRequestHandlers | null;
    timer: ReturnType<typeof setTimeout> | null;
}

export interface CatalogAdminBareAnswer {
    kind: CatalogAdminRequestKind;
    /** The request had already timed out: this is its late answer. */
    expired: boolean;
    /** Null when the request timed out or its owner is gone. */
    onBare: CatalogAdminRequestHandlers['onBare'] | null;
}

export interface CatalogAdminRequestTracker {
    /** A request of this kind is on its way and has not timed out. */
    isWaiting: (kind: CatalogAdminRequestKind) => boolean;
    /** Call right before sending; returns the entry id. */
    begin: (kind: CatalogAdminRequestKind, handlers?: CatalogAdminRequestHandlers) => number;
    /** The owner (e.g. a closed editor) is gone: the entry keeps its place but answers go nowhere. */
    detach: (id: number) => void;
    /** A request's own answer packet arrived; true when it matched an entry. */
    takeReply: (kind: CatalogAdminRequestKind, entityId?: number) => boolean;
    /** A bare CatalogAdminResult arrived: the head that accepts it, or null when none does. */
    takeBare: (success: boolean) => CatalogAdminBareAnswer | null;
    /** Connection change or close: forget everything; waiting owners hear "reset". */
    reset: () => void;
}

const acceptsBare = (kind: CatalogAdminRequestKind, success: boolean) => kind === 'structural' || !success;

export const createCatalogAdminRequestTracker = (): CatalogAdminRequestTracker => {
    let queue: CatalogAdminRequestEntry[] = [];
    let sequence = 0;

    const stopTimer = (entry: CatalogAdminRequestEntry) => {
        if (entry.timer) clearTimeout(entry.timer);
        entry.timer = null;
    };

    /** Removes entries for good; the ones still waiting are told why. */
    const drop = (entries: CatalogAdminRequestEntry[], reason: CatalogAdminUnansweredReason) => {
        for (const entry of entries) {
            stopTimer(entry);
            if (!entry.expired) entry.handlers?.onUnanswered?.(reason);
        }
    };

    return {
        isWaiting: (kind) => queue.some((entry) => entry.kind === kind && !entry.expired),
        begin: (kind, handlers = {}) => {
            const entry: CatalogAdminRequestEntry = { id: ++sequence, kind, entityId: handlers.entityId ?? null, expired: false, handlers, timer: null };

            if (handlers.timeoutMs) {
                entry.timer = setTimeout(() => {
                    entry.timer = null;
                    entry.expired = true;
                    entry.handlers?.onUnanswered?.('timeout');
                }, handlers.timeoutMs);
            }

            queue.push(entry);
            return entry.id;
        },
        detach: (id) => {
            const entry = queue.find((candidate) => candidate.id === id);
            if (entry) entry.handlers = null;
        },
        takeReply: (kind, entityId) => {
            const matches = (entry: CatalogAdminRequestEntry) => entry.kind === kind && (entityId === undefined || entry.entityId === entityId);
            const index = queue.findIndex(matches);
            if (index < 0) return false;

            // Reads are idempotent: the answer serves every identical read still queued (an expired one and
            // its retry alike), so a retry is not left waiting for a reply the expired read already took.
            // Only entries ahead of the first match were passed; the ones between keep their places.
            const passed = queue.slice(0, index);
            const answered = queue.filter((entry, position) => position >= index && matches(entry));
            answered.forEach(stopTimer);
            queue = queue.filter((entry, position) => position > index && !matches(entry));
            drop(passed, 'skipped');
            return true;
        },
        takeBare: (success) => {
            const head = queue[0];
            if (!head || !acceptsBare(head.kind, success)) return null;

            queue = queue.slice(1);
            stopTimer(head);
            return { kind: head.kind, expired: head.expired, onBare: head.expired ? null : (head.handlers?.onBare ?? null) };
        },
        reset: () => {
            const entries = queue;
            queue = [];
            drop(entries, 'reset');
        }
    };
};
