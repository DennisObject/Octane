import { describe, expect, it } from 'vitest';
import { CHAT_COLLISION_MIN_WIDTH, type ChatCollisionBubble, separateOverlappingChats } from './chatCollision';

const separateOriginal = (input: readonly ChatCollisionBubble[], maxIterations: number): ChatCollisionBubble[] => {
    const chats = input.map((chat) => ({ ...chat }));

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let moved = false;

        for (let firstIndex = 0; firstIndex < chats.length; firstIndex++) {
            for (let secondIndex = firstIndex + 1; secondIndex < chats.length; secondIndex++) {
                const first = chats[firstIndex];
                const second = chats[secondIndex];
                const firstSpan = Math.max(first.width, CHAT_COLLISION_MIN_WIDTH);
                const secondSpan = Math.max(second.width, CHAT_COLLISION_MIN_WIDTH);
                const firstPad = Math.max(0, (firstSpan - first.width) / 2);
                const secondPad = Math.max(0, (secondSpan - second.width) / 2);
                const firstRect = {
                    left: first.left - firstPad,
                    right: first.left + first.width + firstPad,
                    top: first.top,
                    bottom: first.top + first.height
                };
                const secondRect = {
                    left: second.left - secondPad,
                    right: second.left + second.width + secondPad,
                    top: second.top,
                    bottom: second.top + second.height
                };
                const overlaps =
                    firstRect.left < secondRect.right &&
                    firstRect.right > secondRect.left &&
                    firstRect.top < secondRect.bottom &&
                    firstRect.bottom > secondRect.top;

                if (!overlaps) continue;

                const older = first.id < second.id ? first : second;
                const olderRect = older === first ? firstRect : secondRect;
                const newerRect = older === first ? secondRect : firstRect;
                const amount = olderRect.bottom - newerRect.top;

                if (amount <= 0) continue;

                older.top -= amount;
                moved = true;
            }
        }

        if (!moved) break;
    }

    return chats;
};

const bottomsUp = (input: readonly ChatCollisionBubble[]): ChatCollisionBubble[] => {
    const chats = input.map((chat) => ({ ...chat }));

    separateOverlappingChats(chats);

    return chats;
};

const tops = (chats: readonly ChatCollisionBubble[]) => chats.map((chat) => chat.top);

const randomScene = (count: number, seed: number): ChatCollisionBubble[] => {
    let state = seed;
    const next = () => {
        state = (state * 1664525 + 1013904223) >>> 0;

        return state / 4294967296;
    };

    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        left: Math.floor(next() * 900),
        top: Math.floor(next() * 700),
        width: 70 + Math.floor(next() * 220),
        height: 18 + Math.floor(next() * 46)
    }));
};

const stackedScene = (count: number): ChatCollisionBubble[] =>
    Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        left: 420,
        top: 480,
        width: 180,
        height: 28
    }));

const colliderEdges = (chat: ChatCollisionBubble) => {
    const width = Math.max(chat.width, CHAT_COLLISION_MIN_WIDTH);
    const pad = (width - chat.width) / 2;

    return { left: chat.left - pad, right: chat.left + chat.width + pad };
};

const sharesCollider = (chat: ChatCollisionBubble, other: ChatCollisionBubble) => {
    const first = colliderEdges(chat);
    const second = colliderEdges(other);

    return first.left < second.right && first.right > second.left;
};

const remainingOverlaps = (chats: readonly ChatCollisionBubble[]) => {
    let count = 0;

    for (let firstIndex = 0; firstIndex < chats.length; firstIndex++) {
        for (let secondIndex = firstIndex + 1; secondIndex < chats.length; secondIndex++) {
            const first = chats[firstIndex];
            const second = chats[secondIndex];

            if (!sharesCollider(first, second)) continue;

            if (first.top < second.top + second.height && first.top + first.height > second.top) count += 1;
        }
    }

    return count;
};

describe('separateOverlappingChats', () => {
    it('finishes a column with the same gaps as the old solver and leaves other scenes unoverlapped', () => {
        expect(tops(bottomsUp(stackedScene(40)))).toEqual(tops(separateOriginal(stackedScene(40), 500)));

        const column = bottomsUp(stackedScene(250));

        expect(column[0].top).toBe(480 - 28 * 249);
        expect(column[249].top).toBe(480);
        expect(column[0].top + column[0].height).toBe(column[1].top);
        expect(remainingOverlaps(column)).toBe(0);

        for (let seed = 1; seed <= 8; seed++) {
            const scene = randomScene(40, seed);
            const placed = bottomsUp(scene);

            expect(remainingOverlaps(placed)).toBe(0);

            placed.forEach((chat, index) => {
                expect(chat.top).toBeLessThanOrEqual(scene[index].top);

                if (chat.top === scene[index].top) return;

                const flushWithNewer = placed.some((other) => other.id > chat.id && sharesCollider(chat, other) && chat.top + chat.height === other.top);

                expect(flushWithNewer).toBe(true);
            });
        }
    });

    it('leaves a zero gap and keeps the 240 collider', () => {
        const overlapped = bottomsUp([
            { id: 1, left: 0, top: 100, width: 240, height: 26 },
            { id: 2, left: 0, top: 100, width: 240, height: 26 }
        ]);

        expect(overlapped[0].top + overlapped[0].height).toBe(overlapped[1].top);

        const narrow = [
            { id: 1, left: 0, top: 100, width: 100, height: 26 },
            { id: 2, left: 239, top: 100, width: 100, height: 26 }
        ];
        const separated = bottomsUp(narrow);
        const clear = bottomsUp([
            { id: 1, left: 0, top: 100, width: 100, height: 26 },
            { id: 2, left: 240, top: 100, width: 100, height: 26 }
        ]);

        expect(separated[0].top).toBeLessThan(100);
        expect(clear.map((chat) => chat.top)).toEqual([100, 100]);
        expect(colliderEdges(narrow[0]).right).toBeGreaterThan(colliderEdges(narrow[1]).left);
        expect(colliderEdges(clear[0]).right).toBeLessThanOrEqual(colliderEdges({ ...clear[1], left: 240 }).left);
    });

    it('stacks three chained bubbles newest at the bottom', () => {
        const result = bottomsUp([
            { id: 1, left: 10, top: 200, width: 200, height: 30 },
            { id: 2, left: 10, top: 200, width: 200, height: 30 },
            { id: 3, left: 10, top: 200, width: 200, height: 40 }
        ]);

        expect(result.map((chat) => chat.top)).toEqual([140, 170, 200]);
        expect(tops(result)).toEqual(
            tops(
                separateOriginal(
                    result.map((chat) => ({ ...chat, top: 200 })),
                    20
                )
            )
        );
    });
});

const elapsed = (scene: ChatCollisionBubble[], run: (chats: ChatCollisionBubble[]) => void): number => {
    const sample = () => {
        const copy = scene.map((chat) => ({ ...chat }));
        const start = performance.now();

        run(copy);

        return performance.now() - start;
    };

    sample();

    let total = 0;

    for (let index = 0; index < 20; index++) total += sample();

    return total / 20;
};

describe('chat collision budget', () => {
    it('reports the old 20-pass solver against one bottom-up pass', () => {
        const scene = stackedScene(250);
        const before = elapsed(scene, (chats) => {
            const solved = separateOriginal(chats, 20);

            chats.forEach((chat, index) => {
                chat.top = solved[index].top;
            });
        });
        const after = elapsed(scene, (chats) => separateOverlappingChats(chats));

        console.info(`collision benchmark stacked n=250 before=${before.toFixed(3)}ms after=${after.toFixed(3)}ms`);
        expect(after).toBeLessThan(before);
    });
});
