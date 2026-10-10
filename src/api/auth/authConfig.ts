import { GetConfigurationValue } from '../volt';

export const AUTH_ENABLED_KEY = 'auth.enabled';

/** Standalone Volt owns account/session HTTP flows unless explicitly disabled. */
export const isVoltAuthEnabled = (): boolean => GetConfigurationValue<boolean>(AUTH_ENABLED_KEY, true) === true;
