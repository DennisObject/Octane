import { GetRoomEngine, IRoomSession, RoomControllerLevel } from '@octane/renderer';
import { HasPermission, Permission } from '../../permissions';
import { IsOwnerOfFurniture } from './IsOwnerOfFurniture';

export function CanManipulateFurniture(roomSession: IRoomSession, objectId: number, category: number): boolean {
    if (!roomSession) return false;

    return (
        roomSession.isRoomOwner ||
        roomSession.controllerLevel >= RoomControllerLevel.GUEST ||
        HasPermission(Permission.RoomOwnerAny) ||
        IsOwnerOfFurniture(GetRoomEngine().getRoomObject(roomSession.roomId, objectId, category))
    );
}
