import { useHousekeepingActions } from './useHousekeepingActions';
import { useHousekeepingStore } from './useHousekeepingStore';

/** Store state plus actions, for the panel views that need both. */
export const useHousekeeping = () => ({ ...useHousekeepingStore(), ...useHousekeepingActions() });
