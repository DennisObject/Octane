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
export type FurniWireReply =
    | { type: 'search' | 'import' | 'interactions' }
    /** The furniture id the detail answer describes. */
    | { type: 'detail'; id: number }
    | { type: 'result'; success: boolean; id: number; message: string };

/** Who a reply belongs to: the request on the wire, the blocked write (its terminal answer), or nobody (null). */
export type FurniReplyRoute = { to: 'request'; request: FurniWireRequest } | { to: 'blocked'; write: FurniWriteRequest } | null;

export type FurniTrafficState =
    | { tag: 'idle' }
    | { tag: 'inflight'; kind: FurniWireKind; key: string }
    | { tag: 'resyncing'; quietUntil: number }
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
    /** A write left the transport by any path (answered, blocked, or dropped at a socket reset). */
    onWriteReleased: (write: FurniWriteRequest) => void;
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

/** The furniture a request names (0 when the server cannot echo it back). */
const entityOf = (request: FurniWireRequest): number => {
    switch (request.kind) {
        case 'write':
            return request.write.itemId;
        case 'import':
            return request.itemId;
        case 'detail':
            return request.detail.by === 'id' ? request.detail.value : 0;
        default:
            return 0;
    }
};

/** Read replies other than detail: the packet type of the read on the wire. */
const readAccepts = (kind: FurniWireKind, type: 'search' | 'import' | 'interactions'): boolean =>
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
 *   inflight(read) --timeout | read reply that is not its own--> resyncing (the read is retried once)
 *   inflight(write) --timeout | ambiguous refusal--> resyncing, and the write moves to the block
 *   resyncing --any unowned reply--> resyncing(quietUntil = now + quiet), reply discarded
 *   resyncing --quiet window over--> idle (queue resumes)
 *   idle --any unowned reply--> resyncing (the wire is out of step)
 *   any --socket closed | reopened (unauthenticated)--> offline: the wire is reset, nothing is sent
 *   offline --session authenticated--> idle (queue resumes; a read that was on the wire goes first)
 *   offline --any reply--> offline, reply discarded (it belongs to the old socket)
 *
 * Entities: detail-by-id, import and write requests name one furniture (X).
 * A read for X that times out (or is pushed off the wire by a foreign reply)
 * leaves an UNRESOLVED read for X: its answer may still come. It is absorbed
 * when a reply that can only be its answer arrives (a detail for X, or a
 * refusal for X while no write for X is on the wire or blocked); a socket
 * reset forgets them all.
 *
 * Which reply belongs to what, following PlusEMU E3 @53e6bfe2 (FurniEditorResult =
 * success, message, entity id; refusals name the furniture the request named;
 * sprite lookups, searches and the interaction list refuse with id 0):
 *   - a detail answer belongs to the detail on the wire for that id (or the
 *     sprite lookup on the wire); else it absorbs an unresolved read for its id;
 *   - other read answers belong to the read on the wire of their packet type;
 *   - a result with id X > 0:
 *       for the request on the wire for X: a success settles a write; a refusal
 *       settles a read, or a write when no read for X is unresolved (with one
 *       unresolved, the refusal is ambiguous and the write moves to the block);
 *       else for the blocked write for X: settles it, only when no read for X
 *       is unresolved (then the block waits for a reconnect);
 *       else a refusal absorbs an unresolved read for X; anything else is ignored;
 *   - a result with id 0 and success = false settles a read on the wire; for
 *     a write it is ambiguous and the write moves to the block;
 *   - a result with id 0 and success = true is never sent by E3 and is ignored.
 *
 * Write block for X (orthogonal): open --write timeout | ambiguous refusal--> blocked(write X)
 *   blocked --id-matched result while no read for X is unresolved--> open (the write's terminal answer)
 *   blocked --socket reset--> open (no answer can come any more)
 * While blocked, no write and no read for X goes out (nor a sprite lookup,
 * whose furniture is unknown); they wait in the queue. Other reads keep
 * working. A read for X that was already unresolved when the block started
 * means only a reconnect can clear it. The quiet window is only a read heuristic.
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
    /** Reads per furniture whose answer may still arrive. */
    private readonly unresolved = new Map<number, number>();
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
        if (this.state.tag === 'offline') return null;

        if (reply.type === 'result') return this.result(reply.success, reply.id, reply.message);

        const onWire = this.state.tag === 'inflight' ? this.inflight : null;

        if (reply.type === 'detail') {
            const request = onWire?.request;

            if (onWire && request?.kind === 'detail' && (request.detail.by === 'sprite' || request.detail.value === reply.id)) return this.settle(onWire);
            if (this.absorb(reply.id)) return null;
        } else if (onWire && readAccepts(onWire.request.kind, reply.type)) {
            return this.settle(onWire);
        }

        if (onWire) this.lose(onWire);
        else this.resync();

        return null;
    }

    /**
     * Socket boundary (closed, or reopened and not authenticated yet): replies
     * of the old connection can no longer arrive, so the wire is reset and
     * held until resume(). Returns the write that was on the wire or blocked,
     * whose outcome stays unknown; a read that was on the wire is queued again.
     */
    public disconnect(): FurniWriteRequest | null {
        window.clearTimeout(this.timer);

        const slot = this.inflight;
        let released = this.block?.write ?? null;

        this.inflight = null;

        if (slot?.request.kind === 'write') released = slot.request.write;
        else if (slot && !slot.discarded && !this.queue.some((entry) => entry.request.kind === slot.request.kind))
            this.queue.unshift({ ...slot, retried: false });

        this.unresolved.clear();
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
        const onWire = this.state.tag === 'inflight' ? this.inflight : null;

        if (id > 0) {
            if (onWire && entityOf(onWire.request) === id) {
                if (onWire.request.kind !== 'write') return success ? null : this.settle(onWire);
                if (success || !this.unresolved.has(id)) return this.settle(onWire);

                // The refusal may be the late answer of an unresolved read for this furniture.
                this.blockWrite(onWire.request.write, message);

                return null;
            }

            const blocked = this.block?.write;

            if (blocked && blocked.itemId === id) {
                if (this.unresolved.has(id)) return null;

                this.setBlock(null);
                this.listener.onWriteReleased(blocked);
                this.pump();

                return { to: 'blocked', write: blocked };
            }

            if (!success) this.absorb(id);

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

    /** Takes one unresolved read for this furniture off the books; false when there was none. */
    private absorb(entity: number): boolean {
        const count = this.unresolved.get(entity) ?? 0;

        if (count <= 0) return false;

        if (count === 1) this.unresolved.delete(entity);
        else this.unresolved.set(entity, count - 1);

        return true;
    }

    /** Requests that may not go out while a write is blocked. */
    private isHeld(request: FurniWireRequest): boolean {
        if (!this.block) return false;
        if (request.kind === 'write' || (request.kind === 'detail' && request.detail.by === 'sprite')) return true;

        return entityOf(request) === this.block.write.itemId;
    }

    private settle(slot: Slot): FurniReplyRoute {
        window.clearTimeout(this.timer);
        this.inflight = null;
        this.setState({ tag: 'idle' });

        if (slot.request.kind === 'write') this.listener.onWriteReleased(slot.request.write);

        this.pump();

        return slot.discarded ? null : { to: 'request', request: slot.request };
    }

    private pump(): void {
        if (this.state.tag !== 'idle') return;

        const index = this.queue.findIndex((entry) => !this.isHeld(entry.request));
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

        const entity = slot.request.kind === 'write' ? 0 : entityOf(slot.request);

        if (entity > 0) this.unresolved.set(entity, (this.unresolved.get(entity) ?? 0) + 1);

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
        this.listener.onWriteReleased(write);
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
