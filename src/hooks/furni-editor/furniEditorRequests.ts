import type { FurniSearchCriteria } from './furniEditorData';

/** How long a request may stay unanswered before the editor gives up on it. */
export const FURNI_EDITOR_REQUEST_TIMEOUT_MS = 15_000;

/**
 * One outstanding request of a kind that has no request id on the wire. The
 * answer is matched against what is stored here; a timeout releases the slot
 * so a lost answer never leaves the editor busy for good.
 */
export class PendingRequest<T> {
    private value: T | null = null;
    private timer = 0;

    constructor(
        private readonly onTimeout: (value: T) => void,
        private readonly timeoutMs = FURNI_EDITOR_REQUEST_TIMEOUT_MS
    ) {}

    public get pending(): T | null {
        return this.value;
    }

    public start(value: T): void {
        this.value = value;
        window.clearTimeout(this.timer);
        this.timer = window.setTimeout(() => {
            const lost = this.value;

            this.value = null;

            if (lost !== null) this.onTimeout(lost);
        }, this.timeoutMs);
    }

    public finish(): T | null {
        const value = this.value;

        this.value = null;
        window.clearTimeout(this.timer);

        return value;
    }
}

export type FurniSearchKind = 'list' | 'probe';

export interface FurniSearchRequest extends FurniSearchCriteria {
    kind: FurniSearchKind;
}

interface TokenedSearchRequest extends FurniSearchRequest {
    token: number;
}

/**
 * The Search tab and the line probe of the edit sheet share one result packet
 * that carries neither the query nor a request id. Only one search is put on
 * the wire at a time, so an answer always belongs to the request in flight.
 * A newer request of the same kind replaces a queued one and makes the one in
 * flight stale, so the editor only ever shows the latest answer. A request
 * that timed out may still be answered; that late answer is swallowed instead
 * of being credited to the next search.
 */
export class FurniSearchChannel {
    private inFlight: TokenedSearchRequest | null = null;
    private readonly queued: Partial<Record<FurniSearchKind, TokenedSearchRequest>> = {};
    private readonly tokens: Record<FurniSearchKind, number> = { list: 0, probe: 0 };
    private lateAnswers = 0;
    private timer = 0;

    constructor(
        private readonly send: (request: FurniSearchRequest) => void,
        private readonly onLost: (request: FurniSearchRequest) => void,
        /** Searches wait while this says no (a write is pending). */
        private readonly canSend: () => boolean = () => true,
        private readonly timeoutMs = FURNI_EDITOR_REQUEST_TIMEOUT_MS
    ) {}

    public get isInFlight(): boolean {
        return this.inFlight !== null;
    }

    /** Sends the next queued search once the gate opens again. */
    public resume(): void {
        this.pump();
    }

    public request(request: FurniSearchRequest): void {
        this.queued[request.kind] = { ...request, token: ++this.tokens[request.kind] };
        this.pump();
    }

    /** Drops the queued request of a kind and makes the one in flight stale. */
    public cancel(kind: FurniSearchKind): void {
        this.tokens[kind]++;
        delete this.queued[kind];
    }

    /** Settles the request in flight; returns it only while it is still the latest of its kind. */
    public settle(): FurniSearchRequest | null {
        if (this.lateAnswers > 0) {
            this.lateAnswers--;
            return null;
        }

        const done = this.inFlight;

        this.inFlight = null;
        window.clearTimeout(this.timer);

        const current = done && this.isLatest(done) ? done : null;

        this.pump();

        return current;
    }

    private isLatest(request: TokenedSearchRequest): boolean {
        return request.token === this.tokens[request.kind];
    }

    private pump(): void {
        if (this.inFlight || !this.canSend()) return;

        const next = this.queued.list ?? this.queued.probe;

        if (!next) return;

        delete this.queued[next.kind];
        this.inFlight = next;
        this.send(next);
        this.timer = window.setTimeout(() => {
            const lost = this.inFlight;

            this.inFlight = null;
            this.lateAnswers++;

            if (lost && this.isLatest(lost)) this.onLost(lost);

            this.pump();
        }, this.timeoutMs);
    }
}
