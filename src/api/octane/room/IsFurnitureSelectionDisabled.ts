import { GetRoomEngine, RoomEngineObjectEvent, RoomObjectVariable } from '@octane/renderer';
import { HasPermission, Permission } from '../../permissions';

export function IsFurnitureSelectionDisabled(event: RoomEngineObjectEvent): boolean {
    let result = false;

    const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

    if (roomObject) {
        const selectionDisabled = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_SELECTION_DISABLED) === 1;

        if (selectionDisabled) {
            result = true;

            if (HasPermission(Permission.RoomOwnerAny)) result = false;
        }
    }

    return result;
}
