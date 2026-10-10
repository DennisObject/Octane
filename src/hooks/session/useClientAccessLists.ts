import { GetEventDispatcher, GetSessionDataManager, VoltEventType } from '@volt/renderer';
import { useExternalSnapshot } from '../events/useExternalSnapshot';

// SessionDataManager receives these before login completes; windows can mount later.
export const useClientAccessLists = () => useExternalSnapshot(
    (onChange) => GetEventDispatcher().subscribe(VoltEventType.CLIENT_ACCESS_LISTS_UPDATED, onChange),
    () => GetSessionDataManager().getClientAccessListsSnapshot()
);
