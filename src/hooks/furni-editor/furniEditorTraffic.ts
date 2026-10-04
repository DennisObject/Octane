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
export type FurniWireReply = { type: 'search' | 'detail' | 'import' | 'interactions' } | { type: 'result'; success: boolean; id: number; message: string };

/** Who a reply belongs to: the request on the wire, the blocked write (its terminal answer), or nobody (null). */
export type FurniReplyRoute = { to: 'request'; request: FurniWireRequest } | { to: 'blocked'; write: FurniWriteRequest } | null;

export type FurniTrafficState = { tag: 'idle' } | { tag: 'inflight'; kind: FurniWireKind; key: string } | { tag: 'resyncing'; quietUntil: number };

/**
 * A write whose outcome the client cannot know yet. It keeps its own kind and
 * entity id; only a result carrying that id (or a reconnect) releases it.
 */
export interface FurniWriteBlock {
    write: FurniWriteRequest;
    since: number;
    /** Set after FURNI_EDITOR_BLOCK_HINT_MS: the UI adds a hint to reconnect. */
    stale: boolean;
    /** The id 0 refusal that made it ambiguous, if any ('' after a timeout). */
    reason: string;
}

/** After this long, a blocked write gets a reconnect hint. */
export const FURNI_EDITOR_BLOCK_HINT_MS = 30_000;

/** A read went unanswered (timeout or a reply of the wrong kind); retrying = it is sent once more after the resync. */
export type FurniLostHandler = (request: FurniWireRequest, retrying: boolean) => void;

export interface FurniTrafficListener {
    onStateChange: (state: FurniTrafficState) => void;
    onBlockChange: (block: FurniWriteBlock | null) => void;
}

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

/** Read replies: the packet type of the read on the wire. */
const readAccepts = (kind: FurniWireKind, type: 'search' | 'detail' | 'import' | 'interactions'): boolean =>
    type === 'search' ? kind === 'list' || kind === 'probe' : kind === type;

/** Reads where only the newest request matters. */
const LATEST_WINS: ReadonlySet<FurniWireKind> = new Set<FurniWireKind>(['list', 'probe', 'detail', 'interactions']);

/**
 * The furni editor's wire channel. Replies carry no request id, so exactly
 * ONE request (read or write) is on the wire at a time.
 *
 * Wire states:
 *   idle --request--> inflight(kind, key)
 *   inflight --reply that belongs to it--> idle (next queued request goes out)
 *   inflight(read) --timeout | read reply of another kind--> resyncing (the read is retried once)
 *   inflight(write) --timeout | result with id 0--> resyncing, and the write moves to the block
 *   resyncing --any reply--> resyncing(quietUntil = now + quiet), reply discarded
 *   resyncing --quiet window over--> idle (queue resumes)
 *   idle --any reply but a blocked write's ack--> resyncing (the wire is out of step)
 *   any --socket reconnect--> idle (a read on the wire is sent again)
 *
 * Which reply belongs to what, following PlusEMU E3 (FurniEditorResult = success, message, entity id):
 *   - a read reply belongs to the read on the wire of its packet type;
 *   - a result with id > 0 belongs only to the write with that entity id:
 *     the one on the wire, or the blocked one; otherwise it is ignored;
 *   - a result with id 0 and success = false (a generic refusal or a read
 *     failure) settles a read on the wire; for a write it is ambiguous;
 *   - a result with id 0 and success = true is never sent by E3 and is ignored.
 *
 * Write block (orthogonal): open --write timeout | id 0 result for the write--> blocked(write)
 *   blocked --result whose id is the blocked write's entity--> open (that is its terminal answer)
 *   blocked --socket reconnect--> open (no answer can come any more)
 * While blocked no write is accepted; reads keep working, and a re-read never
 * releases the block (E3 answers furnidata writes from background tasks, so a
 * re-read can overtake them). The quiet window is only a read heuristic.
 *
 * The queue is FIFO; a newer list/probe/detail/interactions request replaces
 * a queued one of its kind and discards the answer of one in flight (latest
 * wins). Discarding never frees the slot. Only one write and one import may
 * be queued or in flight.
 */
export class FurniEditorTraffic {
    private state: FurniTrafficState = { tag: 'idle' };
    private inflight: Slot | null = null;
    private queue: Slot[] = [];
    private block: FurniWriteBlock | null = null;
    private timer = 0;
    private blockTimer = 0;
    private onLost: FurniLostHandler = () => undefined;

    constructor(
        private readonly send: (composer: IMessageComposer<unknown[]>) => void,
        private readonly listener: FurniTrafficListener,
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

    /** Queues a request; false for a write while one is queued, on the wire or blocked, and for a second import. */
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

    /** Whether a request of this kind is queued, on the wire (and wanted) or, for writes, blocked. */
    public isPending(kind: FurniWireKind): boolean {
        if (kind === 'write' && this.block) return true;

        return this.queue.some((entry) => entry.request.kind === kind) || (this.inflight?.request.kind === kind && !this.inflight.discarded);
    }

    /** Feeds a reply in and says who it belongs to (null: discarded or ignored). */
    public reply(reply: FurniWireReply): FurniReplyRoute {
        if (reply.type === 'result') return this.result(reply.success, reply.id, reply.message);

        const slot = this.inflight;

        if (this.state.tag !== 'inflight' || !slot) {
            this.resync();
            return null;
        }

        if (!readAccepts(slot.request.kind, reply.type)) {
            this.lose(slot);
            return null;
        }

        return this.settle(slot);
    }

    /**
     * The socket came back: replies of the old connection can no longer
     * arrive. Releases the block and returns the write it held (or the write
     * that was on the wire), whose outcome stays unknown.
     */
    public reconnect(): FurniWriteRequest | null {
        window.clearTimeout(this.timer);

        const slot = this.inflight;
        let released = this.block?.write ?? null;

        this.inflight = null;

        if (slot?.request.kind === 'write') released = slot.request.write;
        else if (slot && !slot.discarded) this.queue.unshift({ ...slot, retried: false });

        this.setBlock(null);
        this.setState({ tag: 'idle' });
        this.pump();

        return released;
    }

    private result(success: boolean, id: number, message: string): FurniReplyRoute {
        const slot = this.inflight;
        const onWire = this.state.tag === 'inflight' ? slot : null;

        if (id > 0) {
            if (onWire?.request.kind === 'write' && onWire.request.write.itemId === id) return this.settle(onWire);

            const blocked = this.block?.write;

            if (blocked && blocked.itemId === id) {
                this.setBlock(null);
                this.pump();

                return { to: 'blocked', write: blocked };
            }

            // Only a write for that entity can own it, and there is none: ignore it.
            return null;
        }

        if (success) return null;

        if (!onWire) {
            this.resync();
            return null;
        }

        if (onWire.request.kind !== 'write') return this.settle(onWire);

        // A generic refusal while a write is on the wire: it may be that write's
        // answer or a stray one; the write's outcome stays unknown.
        this.blockWrite(onWire.request.write, message);

        return null;
    }

    private settle(slot: Slot): FurniReplyRoute {
        window.clearTimeout(this.timer);
        this.inflight = null;
        this.setState({ tag: 'idle' });
        this.pump();

        return slot.discarded ? null : { to: 'request', request: slot.request };
    }

    private pump(): void {
        if (this.state.tag !== 'idle') return;

        const index = this.block ? this.queue.findIndex((entry) => entry.request.kind !== 'write') : 0;
        const slot = index >= 0 ? this.queue.splice(index, 1)[0] : undefined;

        if (!slot) return;

        this.inflight = slot;
        this.setState({ tag: 'inflight', kind: slot.request.kind, key: slot.key });
        this.send(composerOf(slot.request));
        this.timer = window.setTimeout(() => {
            if (this.inflight !== slot) return;

            if (slot.request.kind === 'write') this.blockWrite(slot.request.write, '');
            else this.lose(slot);
        }, this.timeoutMs);
    }

    // A read on the wire is given up on: resync, then send it once more unless a newer one replaced it.
    private lose(slot: Slot): void {
        this.inflight = null;
        this.resync();

        if (slot.discarded) return;

        if (slot.request.kind === 'write') {
            this.blockWrite(slot.request.write, '');
            return;
        }

        const replaced = this.queue.some((entry) => entry.request.kind === slot.request.kind);
        const retrying = !slot.retried && !replaced;

        if (retrying) this.queue.unshift({ ...slot, retried: true });

        this.onLost(slot.request, retrying);
    }

    // The write on the wire becomes ambiguous: it leaves the wire for the block, and reads resync.
    private blockWrite(write: FurniWriteRequest, reason: string): void {
        this.inflight = null;
        this.setBlock({ write, since: this.now(), stale: false, reason });
        this.resync();
    }

    private setBlock(block: FurniWriteBlock | null): void {
        window.clearTimeout(this.blockTimer);
        this.block = block;

        if (block) {
            this.blockTimer = window.setTimeout(() => {
                if (this.block !== block) return;

                this.block = { ...block, stale: true };
                this.listener.onBlockChange(this.block);
            }, FURNI_EDITOR_BLOCK_HINT_MS);
        }

        this.listener.onBlockChange(block);
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
        this.listener.onStateChange(state);
    }
}
