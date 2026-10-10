import { GetRoomSessionManager, VoltLogger } from '@volt/renderer';
import { GetRoomSession } from './GetRoomSession';
import { GoToDesktop } from './GoToDesktop';

export const VisitDesktop = () => {
    if (!GetRoomSession()) return;

    VoltLogger.log('[VisitDesktop] Called (isReconnecting=' + GetRoomSessionManager().isReconnecting + ')');

    GoToDesktop();
    GetRoomSessionManager().removeSession(-1);
};
