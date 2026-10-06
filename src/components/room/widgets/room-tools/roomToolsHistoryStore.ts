import { createOctaneStore } from '../../../../state/createOctaneStore';

export interface RoomHistoryEntry
{
    roomId: number;
    roomName: string;
}

// RoomHistory (GCe): an in-memory, session-wide browser history of at most 20 rooms.
const MAX_ENTRIES = 20;

interface RoomToolsHistoryState
{
    entries: RoomHistoryEntry[];
    index: number;
    visit: (roomId: number, roomName: string) => void;
    back: () => RoomHistoryEntry | null;
    forward: () => RoomHistoryEntry | null;
}

const clampIndex = (index: number, length: number) =>
{
    if(!length) return -1;
    if(index < 0) return 0;
    if(index >= length) return (length - 1);

    return index;
};

export const visitRoomHistory = (entries: RoomHistoryEntry[], index: number, roomId: number, roomName: string): { entries: RoomHistoryEntry[]; index: number } =>
{
    let next = entries.map(entry => ((entry.roomId === roomId) ? { roomId, roomName } : entry));

    if(!next.length) return { entries: [ { roomId, roomName } ], index: 0 };

    let current = clampIndex(index, next.length);

    if(next[current]?.roomId === roomId) return { entries: next, index: current };

    // The official history reverses the forward part before appending, a quirk kept as is.
    if(current < (next.length - 1)) next = [ ...next.slice(0, current), ...next.slice(current).reverse() ];

    if(next[next.length - 1].roomId === roomId) return { entries: next, index: (next.length - 1) };

    next = [ ...next, { roomId, roomName } ];
    current = (next.length - 1);

    while(next.length > MAX_ENTRIES)
    {
        next = next.slice(1);
        current--;
    }

    return { entries: next, index: clampIndex(current, next.length) };
};

// The history popup lists each room once, at its latest position, oldest first.
export const getRoomHistoryList = (entries: RoomHistoryEntry[]): RoomHistoryEntry[] =>
{
    const list: RoomHistoryEntry[] = [];
    const seen = new Set<number>();

    for(let i = (entries.length - 1); i >= 0; i--)
    {
        if(seen.has(entries[i].roomId)) continue;

        seen.add(entries[i].roomId);
        list.unshift(entries[i]);
    }

    return list;
};

export const clearRoomToolsHistory = () => useRoomToolsHistoryStore.setState({ entries: [], index: -1 });

export const useRoomToolsHistoryStore = createOctaneStore<RoomToolsHistoryState>()((set, get) => ({
    entries: [],
    index: -1,
    visit: (roomId, roomName) => set(state => visitRoomHistory(state.entries, state.index, roomId, roomName)),
    back: () =>
    {
        const { entries, index } = get();

        if(index <= 0 || !entries.length) return null;

        set({ index: (index - 1) });

        return entries[index - 1];
    },
    forward: () =>
    {
        const { entries, index } = get();

        if(index < 0 || index >= (entries.length - 1)) return null;

        set({ index: (index + 1) });

        return entries[index + 1];
    }
}));
