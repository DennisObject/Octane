import { describe, expect, it } from 'vitest';
import {
    CHAT_COLLISION_COMPARISONS_PER_FRAME,
    CHAT_COLLISION_ITERATIONS,
    CHAT_COLLISION_MIN_WIDTH,
    type ChatCollisionBubble,
    type CollisionCursor,
    createCollisionCursor,
    separateOverlappingChats
} from './chatCollision';

const separateOriginal = (input: readonly ChatCollisionBubble[]): ChatCollisionBubble[] => {
    const chats = input.map((chat) => ({ ...chat }));

    for (let iteration = 0; iteration < CHAT_COLLISION_ITERATIONS; iteration++) {
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
                const amount = olderRect.bottom - newerRect.top - 0;

                if (amount <= 0) continue;

                older.top -= amount;
                moved = true;
            }
        }

        if (!moved) break;
    }

    return chats;
};

const separateSliced = (input: readonly ChatCollisionBubble[], budget: number): ChatCollisionBubble[] => {
    const chats = input.map((chat) => ({ ...chat }));
    const cursor = createCollisionCursor();

    while (!cursor.finished) separateOverlappingChats(chats, cursor, budget);

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

describe('separateOverlappingChats', () => {
    it('matches the previous 20-pass placement for stacked, spread, and random rooms', () => {
        const scenes = [stackedScene(40), stackedScene(250), randomScene(2, 1), randomScene(1, 2)];

        for (let seed = 1; seed <= 12; seed++) scenes.push(randomScene(80, seed));
        scenes.push(randomScene(250, 99));

        for (const scene of scenes) {
            expect(tops(separateSliced(scene, CHAT_COLLISION_COMPARISONS_PER_FRAME))).toEqual(tops(separateOriginal(scene)));
            expect(tops(separateSliced(scene, 1))).toEqual(tops(separateOriginal(scene)));
            expect(tops(separateSliced(scene, 997))).toEqual(tops(separateOriginal(scene)));
        }
    });

    it('stops without moving bubbles that only share an edge', () => {
        const scene = [
            { id: 1, left: 0, top: 0, width: 240, height: 30 },
            { id: 2, left: 0, top: 30, width: 240, height: 30 }
        ];
        const cursor = createCollisionCursor();

        separateOverlappingChats(
            scene.map((chat) => ({ ...chat })),
            cursor,
            100
        );

        expect(cursor.finished).toBe(true);
        expect(tops(separateSliced(scene, 10))).toEqual([0, 30]);
    });

    it('places the older bubble on top of the newer one it overlaps', () => {
        const scene = [
            { id: 1, left: 0, top: 100, width: 240, height: 26 },
            { id: 2, left: 0, top: 100, width: 240, height: 26 }
        ];

        expect(tops(separateSliced(scene, 50))).toEqual(tops(separateOriginal(scene)));
        expect(tops(separateSliced(scene, 50))[0]).toBeLessThan(100);
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
    it('reports a per-frame slice against a full 20-pass solve', () => {
        const scene = stackedScene(250);
        const full = elapsed(scene, (chats) => {
            const cursor: CollisionCursor = createCollisionCursor();

            separateOverlappingChats(chats, cursor, Number.POSITIVE_INFINITY);
        });
        const slice = elapsed(scene, (chats) => {
            separateOverlappingChats(chats, createCollisionCursor(), CHAT_COLLISION_COMPARISONS_PER_FRAME);
        });

        console.info(`collision benchmark stacked n=250 full=${full.toFixed(3)}ms slice=${slice.toFixed(3)}ms`);
        expect(slice).toBeLessThan(full);
    });
});
