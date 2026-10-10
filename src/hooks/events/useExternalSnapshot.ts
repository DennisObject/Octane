import { useSyncExternalStore } from 'react';

/**
 * useSyncExternalStore wrapper for the Volt renderer's subscribe + snapshot
 * getter contract.
 *
 * Pair with EventDispatcher.subscribe() (Volt Renderer v2.1.0+) and a
 * referentially-stable snapshot getter such as
 * SessionDataManager.getUserDataSnapshot() or
 * RoomSessionManager.getActiveRoomSessionSnapshot().
 *
 *   const userData = useExternalSnapshot(
 *       cb => GetEventDispatcher().subscribe(VoltEventType.SESSION_DATA_UPDATED, cb),
 *       () => GetSessionDataManager().getUserDataSnapshot()
 *   );
 *
 * Snapshot reference invariance is guaranteed by the renderer: the same
 * object is returned across reads until the corresponding *_UPDATED event
 * dispatches.
 */
export const useExternalSnapshot = <T>(subscribe: (onChange: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T): T =>
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
