import { GetRoomEngine } from '@volt/renderer';

export function SetActiveRoomId(roomId: number): void {
    GetRoomEngine().setActiveRoomId(roomId);
}
