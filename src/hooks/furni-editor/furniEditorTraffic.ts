import {
    FurniEditorBySpriteComposer,
    FurniEditorDetailComposer,
    FurniEditorImportTextComposer,
    FurniEditorInteractionsComposer,
    FurniEditorSearchComposer,
    IMessageComposer
} from '@octane/renderer';
import type { FurniSearchCriteria } from './furniEditorData';

/** How long a request may stay unanswered before the editor says the server is not answering. */
export const FURNI_EDITOR_REQUEST_TIMEOUT_MS = 15_000;

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
export type FurniWireReply =
    | { type: 'search' | 'import' | 'interactions' }
    /** The furniture id the detail answer describes. */
    | { type: 'detail'; id: number; spriteId: number }
    | { type: 'result'; success: boolean; id: number; message: string };

/** Who a reply belongs to: the outstanding request, the blocked write (its terminal answer), or nobody (null). */
export type FurniReplyRoute = { to: 'request'; request: FurniWireRequest } | { to: 'blocked'; write: FurniWriteRequest } | null;

export type FurniTrafficState =
    | { tag: 'idle' }
    | { tag: 'inflight'; kind: FurniWireKind; key: string }
    /** The outstanding read timed out: nothing else goes out until its answer arrives or the socket resets. */
    | { tag: 'stalled'; kind: FurniWireKind; key: string }
    /** The socket closed or reopened and is not authenticated yet: requests queue, nothing goes out. */
    | { tag: 'offline' };

/**
 * A write whose outcome the client cannot know yet. It keeps its own kind and
 * entity id; only a result carrying that id (or a reconnect) releases it.
 */
export interface FurniWriteBlock {
    write: FurniWriteRequest;
    since: number;
    /** Set after FURNI_EDITOR_BLOCK_HINT_MS: the UI adds a hint to reconnect. */
    stale: boolean;
    /** The refusal that made it ambiguous, if any ('' after a timeout). */
    reason: string;
}

/** After this long, a blocked write gets a reconnect hint. */
export const FURNI_EDITOR_BLOCK_HINT_MS = 30_000;

export interface FurniTrafficListener {
    onStateChange: (state: FurniTrafficState) => void;
    onBlockChange: (block: FurniWriteBlock | null) => void;
    /** A write left the transport by any path (answered, blocked, or dropped at a socket reset). */
    onWriteReleased: (write: FurniWriteRequest) => void;
}

interface Slot {
    request: FurniWireRequest;
    key: string;
    /** The UI no longer wants the answer; the slot still waits for it. */
    discarded: boolean;
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

/** The furniture a request names; 0 for none, -1 for a sprite lookup (the server resolves it). */
const entityOf = (request: FurniWireRequest): number => {
    switch (request.kind) {
        case 'write':
            return request.write.itemId;
        case 'import':
            return request.itemId;
        case 'detail':
            return request.detail.by === 'id' ? request.detail.value : -1;
        default:
            return 0;
    }
};

/** Read packets other than detail: the packet type of the outstanding read. */
const readAccepts = (kind: FurniWireKind, type: 'search' | 'import' | 'interactions'): boolean =>
    type === 'search' ? kind === 'list' || kind === 'probe' : kind === type;

/** Reads where only the newest request matters. */
const LATEST_WINS: ReadonlySet<FurniWireKind> = new Set<FurniWireKind>(['list', 'probe', 'detail', 'interactions']);

/**
 * The furni editor's wire channel. Replies carry no request id, so at most
 * ONE request is outstanding (plus, at most, one blocked write), and nothing
 * is ever resent or given up on short of a socket reset.
 *
 * Wire states:
 *   idle --request--> inflight(kind, key)
 *   inflight --its answer--> idle (next queued request goes out)
 *   inflight(read) --timeout--> stalled: nothing else goes out; the UI says the server is not answering
 *   stalled --its answer--> idle (the answer is delivered as usual)
 *   inflight(write) --timeout | ambiguous refusal--> idle, and the write moves to the block
 *   any --socket closed | reopened (unauthenticated)--> offline: everything outstanding is dropped
 *   offline --session authenticated--> idle (queue resumes; the dropped read goes first)
 *   replies that belong to nothing are ignored; offline, every reply is ignored.
 *
 * Owners, following PlusEMU E3 @53e6bfe2 (FurniEditorResult = success,
 * message, entity id; refusals name the furniture the request named, sprite
 * lookups, searches and the interaction list refuse with id 0):
 *   - a read packet belongs to the outstanding read of its type (a detail:
 *     the detail for that id, or a sprite lookup);
 *   - a result with id 0: a refusal settles an outstanding read that is not a
 *     stalled sprite lookup; for an outstanding write it is ambiguous (block);
 *   - a result with id X > 0: settles the outstanding request for X (a write,
 *     or a read on refusal); else, a refusal settles an outstanding sprite
 *     lookup that is not stalled; else it settles the blocked write for X;
 *     else it is ignored. Successes only ever settle writes.
 *
 * Unknown unresolved: a stalled sprite lookup may still be answered with any
 * furniture's id. While it is outstanding nothing else goes out, so no write
 * starts, and no result settles any write block; only the lookup's own detail
 * packet, or a reconnect, ends it.
 *
 * Write block for X (orthogonal): open --write timeout | ambiguous refusal--> blocked(write X)
 *   blocked --result with id X (see above)--> open (the write's terminal answer)
 *   blocked --socket reset--> open (no answer can come any more)
 * While blocked, no write, no read for X and no sprite lookup goes out; they
 * wait in the queue. Other reads keep working, one at a time.
 *
 * The queue is FIFO; a newer list/probe/detail/interactions request replaces
 * a queued one of its kind and discards the answer of the outstanding one
 * (latest wins). Discarding never frees the slot. Only one write and one
 * import may be queued or outstanding.
 */
export class FurniEditorTraffic {
    private state: FurniTrafficState = { tag: 'idle' };
    private outstanding: Slot | null = null;
    private queue: Slot[] = [];
    private block: FurniWriteBlock | null = null;
    private timer = 0;
    private blockTimer = 0;

    constructor(
        private readonly send: (composer: IMessageComposer<unknown[]>) => void,
        private readonly listener: FurniTrafficListener,
        private readonly timeoutMs = FURNI_EDITOR_REQUEST_TIMEOUT_MS,
        private readonly now: () => number = () => Date.now()
    ) {}

    public get current(): FurniTrafficState {
        return this.state;
    }

    /** Queues a request; false for a write while one is queued, outstanding or blocked, and for a second import. */
    public request(request: FurniWireRequest): boolean {
        const slot: Slot = { request, key: keyOf(request), discarded: false };

        if (LATEST_WINS.has(request.kind)) {
            if (this.outstanding?.request.kind === request.kind) this.outstanding.discarded = true;

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

    /** The UI drops a read: a queued one is removed, the answer of the outstanding one is ignored. */
    public discard(kind: Exclude<FurniWireKind, 'write'>): void {
        this.queue = this.queue.filter((entry) => entry.request.kind !== kind);

        if (this.outstanding?.request.kind === kind) this.outstanding.discarded = true;
    }

    /** Whether a request of this kind is queued, outstanding (and wanted) or, for writes, blocked. */
    public isPending(kind: FurniWireKind): boolean {
        if (kind === 'write' && this.block) return true;

        return this.queue.some((entry) => entry.request.kind === kind) || (this.outstanding?.request.kind === kind && !this.outstanding.discarded);
    }

    /** Feeds a reply in and says who it belongs to (null: ignored). */
    public reply(reply: FurniWireReply): FurniReplyRoute {
        if (this.state.tag === 'offline') return null;

        if (reply.type === 'result') return this.result(reply.success, reply.id, reply.message);

        const slot = this.outstanding;

        if (!slot) return null;

        const request = slot.request;
        const owns =
            reply.type === 'detail'
                ? request.kind === 'detail' && request.detail.value === (request.detail.by === 'sprite' ? reply.spriteId : reply.id)
                : readAccepts(request.kind, reply.type);

        return owns ? this.settle(slot) : null;
    }

    /**
     * Socket boundary (closed, or reopened and not authenticated yet): replies
     * of the old connection can no longer arrive, so everything outstanding is
     * dropped and the queue is held until resume(). Returns the write that was
     * outstanding or blocked, whose outcome stays unknown; an outstanding read
     * is queued again.
     */
    public disconnect(): FurniWriteRequest | null {
        window.clearTimeout(this.timer);

        const slot = this.outstanding;
        let released = this.block?.write ?? null;

        this.outstanding = null;

        if (slot?.request.kind === 'write') released = slot.request.write;
        else if (slot && !slot.discarded && !this.queue.some((entry) => entry.request.kind === slot.request.kind)) this.queue.unshift(slot);

        this.setBlock(null);
        this.setState({ tag: 'offline' });

        if (released) this.listener.onWriteReleased(released);

        return released;
    }

    /** The session is authenticated again: the queue may go out. */
    public resume(): boolean {
        if (this.state.tag !== 'offline') return false;

        this.setState({ tag: 'idle' });
        this.pump();

        return true;
    }

    private result(success: boolean, id: number, message: string): FurniReplyRoute {
        const slot = this.outstanding;
        const request = slot?.request;
        const entity = request ? entityOf(request) : 0;
        // A stalled sprite lookup may be answered with any furniture's id.
        const unknownUnresolved = this.state.tag === 'stalled' && entity === -1;

        if (slot && request) {
            if (request.kind === 'write') {
                if (id === request.write.itemId) return this.settle(slot);
                if (id <= 0 && !success) {
                    // A generic refusal while a write is outstanding: its outcome stays unknown.
                    this.moveToBlock(request.write, message);
                    return null;
                }
            } else if (!success && !unknownUnresolved && (id === entity || id <= 0 || entity === -1)) {
                return this.settle(slot);
            }
        }

        const blocked = this.block?.write;

        if (id > 0 && blocked && blocked.itemId === id && !unknownUnresolved) {
            this.setBlock(null);
            this.listener.onWriteReleased(blocked);
            this.pump();

            return { to: 'blocked', write: blocked };
        }

        return null;
    }

    private settle(slot: Slot): FurniReplyRoute {
        window.clearTimeout(this.timer);
        this.outstanding = null;
        this.setState({ tag: 'idle' });

        if (slot.request.kind === 'write') this.listener.onWriteReleased(slot.request.write);

        this.pump();

        return slot.discarded ? null : { to: 'request', request: slot.request };
    }

    /** Requests that may not go out while a write is blocked. */
    private isHeld(request: FurniWireRequest): boolean {
        if (!this.block) return false;
        if (request.kind === 'write') return true;

        const entity = entityOf(request);

        return entity === -1 || entity === this.block.write.itemId;
    }

    private pump(): void {
        if (this.state.tag !== 'idle' || this.outstanding) return;

        const index = this.queue.findIndex((entry) => !this.isHeld(entry.request));
        const slot = index >= 0 ? this.queue.splice(index, 1)[0] : undefined;

        if (!slot) return;

        this.outstanding = slot;
        this.setState({ tag: 'inflight', kind: slot.request.kind, key: slot.key });
        this.send(composerOf(slot.request));
        this.timer = window.setTimeout(() => {
            if (this.outstanding !== slot) return;

            if (slot.request.kind === 'write') this.moveToBlock(slot.request.write, '');
            else this.setState({ tag: 'stalled', kind: slot.request.kind, key: slot.key });
        }, this.timeoutMs);
    }

    // The outstanding write becomes ambiguous: it leaves the slot for the block, and reads may go on.
    private moveToBlock(write: FurniWriteRequest, reason: string): void {
        window.clearTimeout(this.timer);
        this.outstanding = null;
        this.setBlock({ write, since: this.now(), stale: false, reason });
        this.listener.onWriteReleased(write);
        this.setState({ tag: 'idle' });
        this.pump();
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

    private setState(state: FurniTrafficState): void {
        this.state = state;
        this.listener.onStateChange(state);
    }
}
