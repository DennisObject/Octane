import { GetRoomSessionManager, IRoomSession } from '@volt/renderer';

export function StartRoomSession(session: IRoomSession): void {
    GetRoomSessionManager().startSession(session);
}
