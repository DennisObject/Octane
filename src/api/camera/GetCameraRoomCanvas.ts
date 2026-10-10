import { GetRoomEngine, GetRoomSessionManager } from '@volt/renderer';

// The mouse-selected canvas can still be unset when the camera opens from the toolbar.
export const GetCameraRoomCanvas = () => {
    const session = GetRoomSessionManager().getSession(-1);
    return session ? GetRoomEngine().getRoomInstanceRenderingCanvas(session.roomId, 1) : null;
};
