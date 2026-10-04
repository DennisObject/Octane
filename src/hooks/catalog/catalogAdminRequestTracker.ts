/**
 * Catalog admin requests that are not saves go out one at a time: session, history, page details,
 * offer details and structural changes (delete, move, show/hide, reorder). Their answers carry no
 * request id, and a refusal of any of them is a bare CatalogAdminResult, so only one may be on the
 * wire for an answer to be attributed safely. Saves are matched by their operation id and do not
 * pass through here.
 *
 * States:
 * - idle: nothing on the wire. The next queued request is sent, but only while sending is allowed
 *   (`setCanSend`: the studio is open on an authenticated connection).
 * - in flight: one request is on the wire. Its own answer packet (same kind, and same entity id for
 *   details) or a bare CatalogAdminResult its kind accepts (a structural change accepts any, a read
 *   only a refusal) settles it -> idle. Any other answer is stray and changes nothing.
 * - resyncing: the request timed out. Nothing new is sent until the expired request absorbs one
 *   answer its kind accepts (its late answer) -> idle, or the socket reconnects (`reset`) -> idle.
 *   Answers it does not accept are stray and change nothing. There is no time-based exit: a reply
 *   that is merely slow must never be credited to the next request.
 *
 * Closing the studio or an editor only drops the requests still queued (`clearQueue`); a request
 * on the wire, or an expired one, keeps the transport state until its answer or a reconnect.
 */
export type CatalogAdminRequestKind = 'session' | 'history' | 'pageDetails' | 'offerDetails' | 'structural';

/** Why a request got no answer: it timed out, it could not be sent, or it was dropped (close or reconnect). */
export type CatalogAdminUnansweredReason = 'timeout' | 'cancelled' | 'reset';

/** idle, a request waits for its turn, or the queue is resyncing after a timeout. */
export type CatalogAdminRequestState = 'idle' | 'waiting' | 'resync';

export interface CatalogAdminRequest {
    kind: CatalogAdminRequestKind;
    /** For details reads: the page or offer id the answer names. */
    entityId?: number;
    timeoutMs: number;
    /** Sends the request when its turn comes, from the state current then; false when it cannot be sent. */
    send: () => boolean;
    /** The request went on the wire (it may have waited in the queue before). */
    onSent?: () => void;
    /** A bare CatalogAdminResult answered it. */
    onBare?: (success: boolean, message: string) => void;
    onUnanswered?: (reason: CatalogAdminUnansweredReason) => void;
    /** Its answer arrived only after it had timed out. */
    onLate?: () => void;
}

/** What a bare CatalogAdminResult settled: the request on the wire, or the late answer of an expired one. */
export interface CatalogAdminBareAnswer {
    kind: CatalogAdminRequestKind;
    late: boolean;
}

export interface CatalogAdminRequestTracker {
    /** Queues a request; returns its id. */
    enqueue: (request: CatalogAdminRequest) => number;
    /** The owner is gone: a queued request is dropped, one on the wire stays but its callbacks are not called. */
    detach: (id: number) => void;
    /** A request of this kind waits in the queue and has not been sent yet. */
    isQueued: (kind: CatalogAdminRequestKind) => boolean;
    /** A request's own answer packet arrived. */
    takeReply: (kind: CatalogAdminRequestKind, entityId?: number) => void;
    /** A bare CatalogAdminResult arrived; null when it settled nothing. */
    takeBare: (success: boolean, message: string) => CatalogAdminBareAnswer | null;
    /** Whether requests may go out now; allowing it sends what waits. */
    setCanSend: (canSend: boolean) => void;
    /** The studio closed: drops the requests not sent yet; their owners hear "reset". The wire state stays. */
    clearQueue: () => void;
    /** The socket reconnected: answers to earlier requests will never come, so everything is dropped. */
    reset: () => void;
    /** For useSyncExternalStore. */
    subscribe: (listener: () => void) => () => void;
    getState: () => CatalogAdminRequestState;
}

interface Entry extends CatalogAdminRequest {
    id: number;
    detached: boolean;
}

const acceptsBare = (kind: CatalogAdminRequestKind, success: boolean) => kind === 'structural' || !success;

const matchesReply = (entry: Entry, kind: CatalogAdminRequestKind, entityId: number | undefined) =>
    entry.kind === kind && (entityId === undefined || entry.entityId === entityId);

export const createCatalogAdminRequestTracker = (): CatalogAdminRequestTracker => {
    let canSend = false;
    let queue: Entry[] = [];
    let inFlight: Entry | null = null;
    let expired: Entry | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let sequence = 0;
    const listeners = new Set<() => void>();

    const notify = () => listeners.forEach((listener) => listener());

    const owner = (entry: Entry) => (entry.detached ? null : entry);

    const clearTimer = () => {
        if (timer) clearTimeout(timer);
        timer = null;
    };

    /** Sends the next queued request when nothing is on the wire and the queue is not resyncing. */
    const pump = () => {
        while (!inFlight && !expired && queue.length && canSend) {
            const entry = queue.shift();

            if (!entry.send()) {
                owner(entry)?.onUnanswered?.('cancelled');
                continue;
            }

            inFlight = entry;
            owner(entry)?.onSent?.();
            timer = setTimeout(() => {
                timer = null;
                expired = inFlight;
                inFlight = null;
                owner(expired)?.onUnanswered?.('timeout');
                notify();
            }, entry.timeoutMs);
        }

        notify();
    };

    const settle = () => {
        inFlight = null;
        clearTimer();
        pump();
    };

    /** The expired request took its late answer: the wire is in step again. */
    const absorbLate = () => {
        const late = expired;
        expired = null;
        owner(late)?.onLate?.();
        pump();
        return late;
    };

    const dropQueued = () => {
        const dropped = queue;
        queue = [];
        dropped.forEach((entry) => owner(entry)?.onUnanswered?.('reset'));
    };

    return {
        enqueue: (request) => {
            const entry: Entry = { ...request, id: ++sequence, detached: false };
            queue.push(entry);
            pump();
            return entry.id;
        },
        detach: (id) => {
            const queued = queue.find((entry) => entry.id === id);
            if (queued) {
                queue = queue.filter((entry) => entry !== queued);
                notify();
                return;
            }

            if (inFlight?.id === id) inFlight.detached = true;
            if (expired?.id === id) expired.detached = true;
        },
        isQueued: (kind) => queue.some((entry) => entry.kind === kind),
        takeReply: (kind, entityId) => {
            if (inFlight && matchesReply(inFlight, kind, entityId)) {
                settle();
                return;
            }

            if (expired && matchesReply(expired, kind, entityId)) absorbLate();
        },
        takeBare: (success, message) => {
            if (inFlight && acceptsBare(inFlight.kind, success)) {
                const answered = inFlight;
                inFlight = null;
                clearTimer();
                owner(answered)?.onBare?.(success, message);
                pump();
                return { kind: answered.kind, late: false };
            }

            if (expired && acceptsBare(expired.kind, success)) return { kind: absorbLate().kind, late: true };

            return null;
        },
        setCanSend: (value) => {
            canSend = value;
            pump();
        },
        clearQueue: () => {
            dropQueued();
            notify();
        },
        reset: () => {
            const unanswered = inFlight;
            inFlight = null;
            expired = null;
            clearTimer();
            if (unanswered) owner(unanswered)?.onUnanswered?.('reset');
            dropQueued();
            notify();
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getState: () => (expired ? 'resync' : queue.length ? 'waiting' : 'idle')
    };
};
