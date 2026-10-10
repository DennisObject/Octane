import { GetConfiguration } from '@volt/renderer';

export function GetConfigurationValue<T = string>(key: string, value: T = null): T {
    return GetConfiguration().getValue(key, value);
}

export function GetOptionalConfigurationValue<T = string>(key: string, value: T = null): T {
    return GetConfiguration().definitions.has(key) ? GetConfiguration().getValue(key, value) : value;
}
