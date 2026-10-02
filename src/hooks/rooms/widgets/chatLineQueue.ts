export interface ChatLineQueue<T> {
    nextSeq: number;
    nextFlush: number;
    pending: Map<number, { line?: T | null }>;
}

export const createChatLineQueue = <T>(): ChatLineQueue<T> => ({
    nextSeq: 0,
    nextFlush: 0,
    pending: new Map()
});

export const reserveChatLine = <T>(queue: ChatLineQueue<T>): number => {
    const seq = queue.nextSeq;

    queue.nextSeq += 1;
    queue.pending.set(seq, {});

    return seq;
};

export const settleChatLine = <T>(queue: ChatLineQueue<T>, seq: number, line: T | null): void => {
    const slot = queue.pending.get(seq);

    if (!slot || 'line' in slot) return;

    slot.line = line;
};

export const takeReadyChatLines = <T>(queue: ChatLineQueue<T>): T[] => {
    const ready: T[] = [];

    while (queue.pending.has(queue.nextFlush)) {
        const slot = queue.pending.get(queue.nextFlush);

        if (!slot || !('line' in slot)) break;

        queue.pending.delete(queue.nextFlush);
        queue.nextFlush += 1;

        if (slot.line) ready.push(slot.line);
    }

    return ready;
};

export const resetChatLineQueue = <T>(queue: ChatLineQueue<T>): void => {
    queue.pending.clear();
    queue.nextFlush = queue.nextSeq;
};
