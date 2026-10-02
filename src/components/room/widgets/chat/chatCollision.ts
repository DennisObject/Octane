export interface ChatCollisionBubble {
    id: number;
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface CollisionCursor {
    iteration: number;
    i: number;
    j: number;
    movedThisIteration: boolean;
    finished: boolean;
}

export const CHAT_COLLISION_ITERATIONS = 20;
export const CHAT_COLLISION_MIN_WIDTH = 240;

// One pass over 250 bubbles is about 31k pair tests. Stay near one pass per frame.
export const CHAT_COLLISION_COMPARISONS_PER_FRAME = 40000;

export const createCollisionCursor = (): CollisionCursor => ({
    iteration: 0,
    i: 0,
    j: 1,
    movedThisIteration: false,
    finished: false
});

// Same separation as the previous nested loops: the older bubble moves up until its
// bottom touches the newer bubble's top. A cursor slices that work across frames.
export const separateOverlappingChats = (chats: ChatCollisionBubble[], cursor: CollisionCursor, maxComparisons: number): void => {
    if (cursor.finished || maxComparisons <= 0) return;

    const count = chats.length;

    if (count < 2) {
        cursor.finished = true;

        return;
    }

    let comparisons = 0;

    while (comparisons < maxComparisons && cursor.iteration < CHAT_COLLISION_ITERATIONS) {
        if (cursor.i >= count) {
            if (!cursor.movedThisIteration) {
                cursor.finished = true;

                return;
            }

            cursor.iteration++;
            cursor.i = 0;
            cursor.j = 1;
            cursor.movedThisIteration = false;
            continue;
        }

        if (cursor.j >= count) {
            cursor.i++;
            cursor.j = cursor.i + 1;
            continue;
        }

        const first = chats[cursor.i];
        const second = chats[cursor.j];

        cursor.j++;
        comparisons++;

        const firstSpan = first.width > CHAT_COLLISION_MIN_WIDTH ? first.width : CHAT_COLLISION_MIN_WIDTH;
        const secondSpan = second.width > CHAT_COLLISION_MIN_WIDTH ? second.width : CHAT_COLLISION_MIN_WIDTH;
        const firstPad = (firstSpan - first.width) * 0.5;
        const secondPad = (secondSpan - second.width) * 0.5;
        const firstLeft = first.left - firstPad;
        const firstRight = first.left + first.width + firstPad;
        const secondLeft = second.left - secondPad;
        const secondRight = second.left + second.width + secondPad;

        if (firstLeft >= secondRight || firstRight <= secondLeft) continue;

        const firstTop = first.top;
        const firstBottom = firstTop + first.height;
        const secondTop = second.top;
        const secondBottom = secondTop + second.height;

        if (firstTop >= secondBottom || firstBottom <= secondTop) continue;

        const olderIsFirst = first.id < second.id;
        const older = olderIsFirst ? first : second;
        const amount = (olderIsFirst ? firstBottom : secondBottom) - (olderIsFirst ? secondTop : firstTop);

        if (amount <= 0) continue;

        older.top -= amount;
        cursor.movedThisIteration = true;
    }

    if (cursor.iteration >= CHAT_COLLISION_ITERATIONS) cursor.finished = true;
};
