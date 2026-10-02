export interface ChatCollisionBubble {
    id: number;
    left: number;
    top: number;
    width: number;
    height: number;
}

export const CHAT_COLLISION_MIN_WIDTH = 240;

const span = (width: number): number => (width > CHAT_COLLISION_MIN_WIDTH ? width : CHAT_COLLISION_MIN_WIDTH);

const horizontallyOverlaps = (chat: ChatCollisionBubble, other: ChatCollisionBubble): boolean => {
    const chatSpan = span(chat.width);
    const otherSpan = span(other.width);
    const chatPad = (chatSpan - chat.width) * 0.5;
    const otherPad = (otherSpan - other.width) * 0.5;
    const chatLeft = chat.left - chatPad;
    const chatRight = chat.left + chat.width + chatPad;
    const otherLeft = other.left - otherPad;
    const otherRight = other.left + other.width + otherPad;

    return chatLeft < otherRight && chatRight > otherLeft;
};

// Newest bubbles are already final. Each older bubble walks the newer bubbles that
// share its 240-wide collider, lowest on screen first, and sits flush on each one
// it still overlaps. Moving up cannot create a new overlap with a bubble already passed.
export const separateOverlappingChats = (chats: ChatCollisionBubble[]): void => {
    const count = chats.length;

    if (count < 2) return;

    const order = new Array<number>(count);

    for (let index = 0; index < count; index++) order[index] = index;

    order.sort((left, right) => chats[left].id - chats[right].id);

    const blockers: ChatCollisionBubble[] = [];

    for (let newerStart = count - 1; newerStart >= 0; newerStart--) {
        const chat = chats[order[newerStart]];

        blockers.length = 0;

        for (let newerIndex = newerStart + 1; newerIndex < count; newerIndex++) {
            const other = chats[order[newerIndex]];

            if (horizontallyOverlaps(chat, other)) blockers.push(other);
        }

        blockers.sort((left, right) => right.top - left.top);

        for (let blockerIndex = 0; blockerIndex < blockers.length; blockerIndex++) {
            const other = blockers[blockerIndex];
            const chatBottom = chat.top + chat.height;

            if (chat.top >= other.top + other.height || chatBottom <= other.top) continue;

            chat.top = other.top - chat.height;
        }
    }
};
