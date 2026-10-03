import { localizeWithFallback } from '../utils/localizeWithFallback';

// Login copy uses the official client's localisation keys. The fallback is the
// client's own English text, used until the hotel's texts define the key.
export const loginText = (key: string, fallback: string, params: Record<string, string> = {}): string =>
{
    const names = Object.keys(params);
    let text = fallback;

    try
    {
        text = localizeWithFallback(key, fallback, names, names.map((name) => params[name]));
    }
    catch
    {}

    return names.reduce((output, name) => output.replaceAll(`%${name}%`, params[name]), text);
};
