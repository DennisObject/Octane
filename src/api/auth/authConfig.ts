import { GetConfigurationValue } from '../octane';

export const AUTH_ENABLED_KEY = 'auth.enabled';

/** Standalone Octane owns account/session HTTP flows unless explicitly disabled. */
export const isOctaneAuthEnabled = (): boolean => GetConfigurationValue<boolean>(AUTH_ENABLED_KEY, true) === true;
