import { describe, expect, it } from 'vitest';
import { createChatLineQueue, reserveChatLine, resetChatLineQueue, settleChatLine, takeReadyChatLines } from './chatLineQueue';

describe('chat line queue', () => {
    it('flushes a contiguous prefix in arrival order and holds a gap', () => {
        const queue = createChatLineQueue<string>();
        const first = reserveChatLine(queue);
        const second = reserveChatLine(queue);
        const third = reserveChatLine(queue);

        settleChatLine(queue, third, 'c');
        settleChatLine(queue, first, 'a');

        expect(takeReadyChatLines(queue)).toEqual(['a']);

        settleChatLine(queue, second, null);

        expect(takeReadyChatLines(queue)).toEqual(['c']);
        expect(queue.pending.size).toBe(0);
    });

    it('drops settled lines from before a room reset', () => {
        const queue = createChatLineQueue<string>();
        const stale = reserveChatLine(queue);

        resetChatLineQueue(queue);
        settleChatLine(queue, stale, 'old');

        const fresh = reserveChatLine(queue);

        settleChatLine(queue, fresh, 'new');

        expect(takeReadyChatLines(queue)).toEqual(['new']);
    });
});
