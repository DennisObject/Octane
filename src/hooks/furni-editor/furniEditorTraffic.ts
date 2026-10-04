import {
    FurniEditorBySpriteComposer,
    FurniEditorDetailComposer,
    FurniEditorImportTextComposer,
    FurniEditorInteractionsComposer,
    FurniEditorSearchComposer,
    IMessageComposer
} from '@octane/renderer';
import type { FurniSearchCriteria } from './furniEditorData';

/** How long a request may stay unanswered before the channel gives up on it. */
export const FURNI_EDITOR_REQUEST_TIMEOUT_MS = 15_000;

/** After a timeout, how long the wire must stay quiet before the queue resumes. */
export const FURNI_EDITOR_QUIET_MS = 1_500;

export type FurniEditorMutationKind = 'update' | 'delete' | 'furnidata' | 'structure' | 'revert' | 'syncName';

export interface FurniDetailRequest {
    by: 'id' | 'sprite';
    value: number;
    /** A request the user made (open a furni) as opposed to a refresh. */
    reveal: boolean;
    /** The write this refresh follows, so the sheet can take the server's normalised values. */
    after: FurniEditorMutationKind | null;
}

export interface FurniWriteRequest {
    kind: FurniEditorMutationKind;
    itemId: number;
    composer: IMessageComposer<unknown[]>;
}

/** Everything the furni editor puts on the wire. */
export type FurniWireRequest =
    | { kind: 'list' | 'probe'; criteria: FurniSearchCriteria }
    | { kind: 'detail'; detail: FurniDetailRequest }
    | { kind: 'import'; itemId: number }
    | { kind: 'interactions' }
    | { kind: 'write'; write: FurniWriteRequest };

export type FurniWireKind = FurniWireRequest['kind'];

/** The packets that can answer a request; 10044 (result) answers writes and every failure. */
export type FurniWireReply = { type: 'search' | 'detail' | 'import' | 'interactions' } | { type: 'result'; success: boolean };

export type FurniTrafficState = { tag: 'idle' } | { tag: 'inflight'; kind: FurniWireKind; key: string } | { tag: 'resyncing'; quietUntil: number };

/**
 * A request went unanswered (timeout, or an answer of the wrong kind). Reads
 * are sent once more after the resync (retrying = true); a write is never
 * resent, since the server may have applied it.
 */
export type FurniLostHandler = (request: FurniWireRequest, retrying: boolean) => void;

interface Slot {
    request: FurniWireRequest;
    key: string;
    /** The UI no longer wants the answer; the slot still waits for it. */
    discarded: boolean;
    retried: boolean;
}

const keyOf = (request: FurniWireRequest): string => {
    switch (request.kind) {
        case 'list':
        case 'probe':
            return JSON.stringify(request.criteria);
        case 'detail':
            return `${request.detail.by}:${request.detail.value}`;
        case 'import':
            return String(request.itemId);
        case 'interactions':
            return '';
        case 'write':
            return `${request.write.kind}:${request.write.itemId}`;
    }
};

const composerOf = (request: FurniWireRequest): IMessageComposer<unknown[]> => {
    switch (request.kind) {
        case 'list':
        case 'probe': {
            const { query, type, page, sortField, sortDir } = request.criteria;

            return new FurniEditorSearchComposer(query, type, page, sortField, sortDir);
        }
        case 'detail':
            return request.detail.by === 'id' ? new FurniEditorDetailComposer(request.detail.value) : new FurniEditorBySpriteComposer(request.detail.value);
        case 'import':
            return new FurniEditorImportTextComposer(request.itemId);
        case 'interactions':
            return new FurniEditorInteractionsComposer();
        case 'write':
            return request.write.composer;
    }
};

const accepts = (kind: FurniWireKind, reply: FurniWireReply): boolean => {
    switch (reply.type) {
        case 'search':
            return kind === 'list' || kind === 'probe';
        case 'result':
            return kind === 'write' || !reply.success;
        default:
            return kind === reply.type;
    }
};

/** Reads where only the newest request matters. */
const LATEST_WINS: ReadonlySet<FurniWireKind> = new Set<FurniWireKind>(['list', 'probe', 'detail', 'interactions']);

/**
 * The furni editor's wire channel. Replies carry no request id, so exactly
 * ONE request (read or write) is on the wire at a time and every reply
 * belongs to it.
 *
 *   idle --request--> inflight(kind, key)
 *   inflight --matching reply--> idle (next queued request goes out)
 *   inflight --timeout | reply of another kind--> resyncing(quietUntil = now + quiet)
 *   resyncing --any reply--> resyncing(quietUntil = now + quiet), reply discarded
 *   resyncing --quiet window over--> idle (queue resumes, a lost read first)
 *   idle --any reply--> resyncing (a stray reply means the wire is out of step)
 *
 * The queue is FIFO; a newer list/probe/detail/interactions request replaces
 * a queued one of its kind and discards the answer of one in flight (latest
 * wins). Discarding never frees the slot: it waits for the reply or the
 * timeout like any other request. Only one write and one import may be
 * queued or in flight.
 */
export class FurniEditorTraffic {
    private state: FurniTrafficState = { tag: 'idle' };
    private inflight: Slot | null = null;
    private queue: Slot[] = [];
    private timer = 0;
    private onLost: FurniLostHandler = () => undefined;

    constructor(
        private readonly send: (composer: IMessageComposer<unknown[]>) => void,
        private readonly onStateChange: (state: FurniTrafficState) => void,
        private readonly timeoutMs = FURNI_EDITOR_REQUEST_TIMEOUT_MS,
        private readonly quietMs = FURNI_EDITOR_QUIET_MS,
        private readonly now: () => number = () => Date.now()
    ) {}

    public get current(): FurniTrafficState {
        return this.state;
    }

    public setLostHandler(handler: FurniLostHandler): void {
        this.onLost = handler;
    }

    /** Queues a request; false when a write or import is already waiting. */
    public request(request: FurniWireRequest): boolean {
        const slot: Slot = { request, key: keyOf(request), discarded: false, retried: false };

        if (LATEST_WINS.has(request.kind)) {
            if (this.inflight?.request.kind === request.kind) this.inflight.discarded = true;

            const queued = this.queue.findIndex((entry) => entry.request.kind === request.kind);

            if (queued >= 0) this.queue[queued] = slot;
            else this.queue.push(slot);
        } else {
            if (this.isPending(request.kind)) return false;

            this.queue.push(slot);
        }

        this.pump();

        return true;
    }

    /** The UI drops a read: a queued one is removed, the answer of one in flight is ignored. */
    public discard(kind: Exclude<FurniWireKind, 'write'>): void {
        this.queue = this.queue.filter((entry) => entry.request.kind !== kind);

        if (this.inflight?.request.kind === kind) this.inflight.discarded = true;
    }

    /** Whether a request of this kind is queued or in flight and still wanted. */
    public isPending(kind: FurniWireKind): boolean {
        return this.queue.some((entry) => entry.request.kind === kind) || (this.inflight?.request.kind === kind && !this.inflight.discarded);
    }

    /**
     * Feeds a reply in. Returns the request it answers, or null when the reply
     * is discarded (unwanted, or arriving out of step).
     */
    public reply(reply: FurniWireReply): FurniWireRequest | null {
        const slot = this.inflight;

        if (this.state.tag === 'resyncing' || !slot) {
            this.resync();
            return null;
        }

        if (!accepts(slot.request.kind, reply)) {
            this.lose(slot);
            return null;
        }

        window.clearTimeout(this.timer);
        this.inflight = null;
        this.setState({ tag: 'idle' });
        this.pump();

        return slot.discarded ? null : slot.request;
    }

    private pump(): void {
        if (this.state.tag !== 'idle') return;

        const slot = this.queue.shift();

        if (!slot) return;

        this.inflight = slot;
        this.setState({ tag: 'inflight', kind: slot.request.kind, key: slot.key });
        this.send(composerOf(slot.request));
        this.timer = window.setTimeout(() => {
            if (this.inflight === slot) this.lose(slot);
        }, this.timeoutMs);
    }

    // The request in flight is given up on: resync first, then (for a read
    // nobody replaced meanwhile) send it once more.
    private lose(slot: Slot): void {
        this.inflight = null;
        this.resync();

        if (slot.discarded) return;

        const replaced = this.queue.some((entry) => entry.request.kind === slot.request.kind);
        const retrying = slot.request.kind !== 'write' && !slot.retried && !replaced;

        if (retrying) this.queue.unshift({ ...slot, retried: true });

        this.onLost(slot.request, retrying);
    }

    // Opens (or extends) the quiet window; the queue resumes once it passes without a reply.
    private resync(): void {
        window.clearTimeout(this.timer);

        const quietUntil = this.now() + this.quietMs;

        this.setState({ tag: 'resyncing', quietUntil });
        this.timer = window.setTimeout(() => this.endResync(), this.quietMs);
    }

    private endResync(): void {
        if (this.state.tag !== 'resyncing') return;

        const left = this.state.quietUntil - this.now();

        if (left > 0) {
            this.timer = window.setTimeout(() => this.endResync(), left);
            return;
        }

        this.setState({ tag: 'idle' });
        this.pump();
    }

    private setState(state: FurniTrafficState): void {
        this.state = state;
        this.onStateChange(state);
    }
}
