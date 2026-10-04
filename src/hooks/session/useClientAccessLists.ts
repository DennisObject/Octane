import { GetEventDispatcher, GetSessionDataManager, OctaneEventType } from '@octane/renderer';
import { useExternalSnapshot } from '../events/useExternalSnapshot';

// SessionDataManager receives these before login completes; windows can mount later.
export const useClientAccessLists = () => useExternalSnapshot(
    (onChange) => GetEventDispatcher().subscribe(OctaneEventType.CLIENT_ACCESS_LISTS_UPDATED, onChange),
    () => GetSessionDataManager().getClientAccessListsSnapshot()
);
