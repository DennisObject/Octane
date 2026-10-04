import {
    FurniEditorBySpriteComposer,
    FurniEditorDetailComposer,
    FurniEditorImportTextComposer,
    FurniEditorInteractionsComposer,
    FurniEditorSearchComposer,
    IMessageComposer
} from '@octane/renderer';
import { FurniSearchChannel, FurniSearchKind, FurniSearchRequest, PendingRequest } from './furniEditorRequests';

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

export type FurniTimeoutKind = 'detail' | 'write' | 'import' | 'list';

export type FurniReadKind = 'detail' | 'import' | 'interactions' | FurniSearchKind;

/** Who a generic result packet (10044) belongs to. */
export type FurniResultRoute = { to: 'write'; write: FurniWriteRequest } | { to: 'late-success'; itemId: number } | { to: 'read'; read: FurniReadKind | null };

/**
 * Every request of the furni editor, and the rule that makes the generic
 * result packet unambiguous: the server answers any failure with it, often
 * with item id 0, so a write is never on the wire together with a read.
 * A write waits until the reads in flight are answered; reads asked for
 * meanwhile wait until the write is answered. PlusEMU answers furnidata
 * writes and the Habbo import from background tasks, out of order, which
 * this rule makes harmless.
 */
export class FurniEditorTraffic {
    private readonly search: FurniSearchChannel;
    private readonly detail: PendingRequest<FurniDetailRequest>;
    private readonly importText: PendingRequest<number>;
    private readonly interactions: PendingRequest<true>;
    private readonly write: PendingRequest<FurniWriteRequest & { sent: boolean }>;
    private deferredDetail: FurniDetailRequest | null = null;
    private deferredInteractions = false;

    constructor(
        private readonly send: (composer: IMessageComposer<unknown[]>) => void,
        onTimeout: (kind: FurniTimeoutKind) => void
    ) {
        this.search = new FurniSearchChannel(
            (request) => send(new FurniEditorSearchComposer(request.query, request.type, request.page, request.sortField, request.sortDir)),
            (request) => {
                if (request.kind === 'list') onTimeout('list');

                this.flushWrite();
            },
            () => !this.write.pending
        );
        this.detail = new PendingRequest(() => {
            onTimeout('detail');
            this.flushWrite();
        });
        this.importText = new PendingRequest(() => {
            onTimeout('import');
            this.flushWrite();
        });
        this.interactions = new PendingRequest(() => this.flushWrite());
        this.write = new PendingRequest(() => {
            onTimeout('write');
            this.flushReads();
        });
    }

    public get isWritePending(): boolean {
        return this.write.pending !== null;
    }

    public get isDetailPending(): boolean {
        return this.detail.pending !== null || this.deferredDetail !== null;
    }

    public requestSearch(request: FurniSearchRequest): void {
        this.search.request(request);
    }

    public cancelSearch(kind: FurniSearchKind): void {
        this.search.cancel(kind);
    }

    public requestDetail(request: FurniDetailRequest): void {
        if (this.write.pending) {
            this.deferredDetail = request;
            return;
        }

        this.sendDetail(request);
    }

    /** Forgets the detail request; returns whether one was pending. */
    public cancelDetail(): boolean {
        const pending = this.isDetailPending;

        this.deferredDetail = null;
        this.detail.finish();
        this.flushWrite();

        return pending;
    }

    public requestInteractions(): void {
        if (this.write.pending) {
            this.deferredInteractions = true;
            return;
        }

        this.interactions.start(true);
        this.send(new FurniEditorInteractionsComposer());
    }

    /** One import at a time, never during a write. */
    public requestImport(itemId: number): boolean {
        if (this.write.pending || this.importText.pending !== null) return false;

        this.importText.start(itemId);
        this.send(new FurniEditorImportTextComposer(itemId));

        return true;
    }

    /** One write at a time; it goes out once the reads in flight are answered. */
    public requestWrite(write: FurniWriteRequest): boolean {
        if (this.write.pending) return false;

        this.write.start({ ...write, sent: false });
        this.flushWrite();

        return true;
    }

    public answerSearch(): FurniSearchRequest | null {
        const request = this.search.settle();

        this.flushWrite();

        return request;
    }

    /** The pending detail request this answer belongs to, or null for a stale or unsolicited answer. */
    public answerDetail(item: { id: number; spriteId: number }): FurniDetailRequest | null {
        const request = this.detail.pending;

        if (!request || (request.by === 'id' ? item.id : item.spriteId) !== request.value) return null;

        this.detail.finish();
        this.flushWrite();

        return request;
    }

    public answerImport(): number | null {
        const itemId = this.importText.finish();

        this.flushWrite();

        return itemId;
    }

    public answerInteractions(): void {
        this.interactions.finish();
        this.flushWrite();
    }

    public routeResult(success: boolean, itemId: number): FurniResultRoute {
        const write = this.write.pending;

        if (write?.sent && (itemId <= 0 || itemId === write.itemId)) {
            this.write.finish();
            this.flushReads();

            return { to: 'write', write };
        }

        if (success) return { to: 'late-success', itemId };

        let read: FurniReadKind | null = null;

        if (this.detail.pending) {
            this.detail.finish();
            read = 'detail';
        } else if (this.importText.pending !== null) {
            this.importText.finish();
            read = 'import';
        } else if (this.interactions.pending) {
            this.interactions.finish();
            read = 'interactions';
        } else {
            read = this.search.settle()?.kind ?? null;
        }

        this.flushWrite();

        return { to: 'read', read };
    }

    private sendDetail(request: FurniDetailRequest): void {
        this.detail.start(request);
        this.send(request.by === 'id' ? new FurniEditorDetailComposer(request.value) : new FurniEditorBySpriteComposer(request.value));
    }

    private hasReadInFlight(): boolean {
        return this.detail.pending !== null || this.importText.pending !== null || this.interactions.pending !== null || this.search.isInFlight;
    }

    private flushWrite(): void {
        const write = this.write.pending;

        if (!write || write.sent || this.hasReadInFlight()) return;

        write.sent = true;
        this.send(write.composer);
    }

    private flushReads(): void {
        if (this.write.pending) return;

        if (this.deferredDetail) {
            const request = this.deferredDetail;

            this.deferredDetail = null;
            this.sendDetail(request);
        }

        if (this.deferredInteractions) {
            this.deferredInteractions = false;
            this.requestInteractions();
        }

        this.search.resume();
    }
}
