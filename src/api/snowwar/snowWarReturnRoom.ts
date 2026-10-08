// SnowStorm leaves the player's room when the arena opens (EnterArena -> VisitDesktop). The room is
// remembered then, as a fallback for RejoinPreviousRoom's roomBeforeGame when the player goes back.
let previousRoomId: number | null = null;

export const setSnowWarReturnRoom = (roomId: number | null): void =>
{
    previousRoomId = (typeof roomId === 'number' && roomId > 0) ? roomId : null;
};

export const consumeSnowWarReturnRoom = (): number | null =>
{
    const roomId = previousRoomId;
    previousRoomId = null;
    return roomId;
};
