import { GetGuestRoomMessageComposer } from '@volt/renderer';
import { SendMessageComposer } from '../volt';

export function TryVisitRoom(roomId: number): void {
    SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, true));
}
