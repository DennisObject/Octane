import { IncomingHeader, IWiredVariableDiffEntry } from '@octane/renderer';

export interface WiredCatalogState {
    rows: ReadonlyMap<string, IWiredVariableDiffEntry>;
    hash: number | null;
    available: boolean;
}

type Listener = (state: WiredCatalogState) => void;

const immutableRows = (entries: Iterable<[string, IWiredVariableDiffEntry]>): ReadonlyMap<string, IWiredVariableDiffEntry> => {
    const rows = new Map(entries);
    const view: ReadonlyMap<string, IWiredVariableDiffEntry> = Object.freeze({
        size: rows.size, get: (id: string) => rows.get(id), has: (id: string) => rows.has(id),
        entries: () => rows.entries(), keys: () => rows.keys(), values: () => rows.values(),
        [Symbol.iterator]: () => rows[Symbol.iterator](),
        forEach: (callback: (value: IWiredVariableDiffEntry, key: string, map: ReadonlyMap<string, IWiredVariableDiffEntry>) => void, thisArg?: unknown) => {
            for(const [id, value] of rows) callback.call(thisArg, value, id, view);
        }
    });
    return view;
};

/** One room/actual-connection catalog stream. Hashes are equality hints, never sequence numbers. */
export class WiredCatalogProvider {
    private room: object | null = null;
    private connection: object | null = null;
    private allowed = false;
    private phase: 'IDLE' | 'HASH' | 'DIFF' = 'IDLE';
    private committed: WiredCatalogState = Object.freeze({ rows: immutableRows([]), hash: null, available: false });
    private staging: Map<string, IWiredVariableDiffEntry> | null = null;
    private streamHash: number | null = null;
    private seen = new Set<string>();
    private timer: ReturnType<typeof setTimeout> | null = null;
    private listeners = new Set<Listener>();

    constructor(private readonly sendHash: () => boolean, private readonly sendDiff: (entries: [string, number][]) => boolean,
        private readonly timeout = 5000) {}

    public bind(room: object | null, connection: object | null, allowed: boolean): void {
        if(this.room !== room || this.connection !== connection) {
            this.cancel();
            this.committed = Object.freeze({ rows: immutableRows([]), hash: null, available: false });
            this.room = room;
            this.connection = connection;
            this.notify();
        }
        this.allowed = !!room && !!connection && allowed;
        if(!this.allowed) this.fail();
    }

    public subscribe(listener: Listener, hint?: number): () => void {
        this.listeners.add(listener);
        listener(this.committed);
        this.refresh(hint);
        return () => {
            this.listeners.delete(listener);
            if(!this.listeners.size) this.cancel();
        };
    }

    public refresh(hint?: number): void {
        if(!this.allowed || !this.listeners.size || this.phase !== 'IDLE') return;
        if(hint !== undefined && hint !== 0) {
            if(this.committed.available && this.committed.hash === hint) return;
            this.requestDiff();
            return;
        }
        this.phase = 'HASH';
        this.arm();
        try { if(this.sendHash() === false) this.fail(); }
        catch { this.fail(); }
    }

    public receiveHash(hash: number, room: object, connection: object): void {
        if(!this.matches(room, connection) || this.phase !== 'HASH') return;
        if(this.committed.available && this.committed.hash === hash) {
            this.cancel();
            return;
        }
        this.requestDiff();
    }

    public receiveDiff(hash: number, last: boolean, removed: readonly string[], changed: readonly IWiredVariableDiffEntry[],
        room: object, connection: object): void {
        if(!this.matches(room, connection) || this.phase !== 'DIFF') return;
        if(this.streamHash !== null && this.streamHash !== hash) { this.fail(); return; }
        this.streamHash = hash;
        const staging = this.staging;
        if(!staging || removed.length > 4096 || changed.length > 100) { this.fail(); return; }
        for(const id of removed) {
            if(this.seen.has(id)) { this.fail(); return; }
            this.seen.add(id);
            staging.delete(id);
        }
        for(const entry of changed) {
            const id = entry.variable.variableId;
            if(this.seen.has(id)) { this.fail(); return; }
            this.seen.add(id);
            const connector = entry.variable.textConnector;
            const variable = Object.freeze({ ...entry.variable,
                textConnector: connector === null ? null : Object.freeze(connector.map(pair => Object.freeze({ ...pair }))) as unknown as { key: number; value: string }[] });
            staging.set(id, Object.freeze({ hash: entry.hash, variable }));
        }
        if(staging.size > 143360 || this.seen.size > 147456) { this.fail(); return; }
        if(!last) return;
        this.committed = Object.freeze({ rows: immutableRows(staging), hash, available: true });
        this.cancel();
        this.notify();
    }

    public rejectCatalogFrame(header: number, room: object | null, connection: object | null): void {
        if(header !== IncomingHeader.WIRED_ALL_VARIABLES_HASH && header !== IncomingHeader.WIRED_ALL_VARIABLES_DIFF) return;
        if(!room || !connection || !this.matches(room, connection) || this.phase === 'IDLE') return;
        this.fail();
    }

    public endRoom(room: object): void {
        if(this.room === room) this.invalidate();
    }

    public disposeRoom(roomId: number): void {
        if((this.room as { roomId?: number } | null)?.roomId === roomId) this.invalidate();
    }

    public invalidate(): void { this.bind(null, null, false); }
    public get state(): WiredCatalogState { return this.committed; }

    private matches(room: object, connection: object): boolean {
        return this.allowed && this.room === room && this.connection === connection && this.listeners.size > 0;
    }

    private requestDiff(): void {
        this.cancel();
        // Preserve the existing server's bounded known-hash admission; excess cannot become a false empty cache.
        if(this.committed.rows.size > 4096) { this.fail(); return; }
        this.phase = 'DIFF';
        this.staging = new Map(this.committed.rows);
        this.arm();
        const hashes = Array.from(this.committed.rows, ([id, entry]): [string, number] => [id, entry.hash]);
        try { if(this.sendDiff(hashes) === false) this.fail(); }
        catch { this.fail(); }
    }

    private arm(): void {
        if(this.timer !== null) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.fail(), this.timeout);
    }

    private cancel(): void {
        if(this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
        this.phase = 'IDLE';
        this.staging = null;
        this.streamHash = null;
        this.seen.clear();
    }

    private fail(): void {
        this.cancel();
        if(this.committed.available) {
            this.committed = Object.freeze({ ...this.committed, available: false });
            this.notify();
        }
    }

    private notify(): void {
        for(const listener of Array.from(this.listeners)) listener(this.committed);
    }
}
