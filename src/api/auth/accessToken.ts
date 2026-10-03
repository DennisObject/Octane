// The access token only authorises HTTP features for the running session, so it
// lives in sessionStorage (dropped when the tab closes) instead of localStorage.
// A new tab gets a fresh one from the SSO-ticket exchange.
const STORAGE_KEY = 'octane.access.token';
const LEGACY_STORAGE_KEYS = ['nitro.access.token', 'nitro.access.token.exp'];

interface StoredAccessToken {
    token: string;
    expiresAt: number;
}

const removeLegacyTokens = (): void =>
{
    try
    {
        for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);
    }
    catch
    {}
};

removeLegacyTokens();

const readStoredToken = (): StoredAccessToken | null =>
{
    try
    {
        const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null') as Partial<StoredAccessToken> | null;

        if (!stored || typeof stored.token !== 'string' || !stored.token.length) return null;

        const expiresAt = typeof stored.expiresAt === 'number' ? stored.expiresAt : 0;

        if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000))
        {
            window.sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }

        return { token: stored.token, expiresAt };
    }
    catch
    {
        return null;
    }
};

export const setAccessToken = (token: string | null | undefined, expiresAt?: number | null): void =>
{
    try
    {
        if (!token)
        {
            window.sessionStorage.removeItem(STORAGE_KEY);
            return;
        }

        const stored: StoredAccessToken = { token, expiresAt: typeof expiresAt === 'number' && expiresAt > 0 ? expiresAt : 0 };

        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    catch
    {}
};

export const getAccessToken = (): string => readStoredToken()?.token ?? '';

export const getAccessTokenExpiresAt = (): number => readStoredToken()?.expiresAt ?? 0;

export const clearAccessToken = (): void => setAccessToken(null);

export interface AccessTokenGrant {
    accessToken?: string;
    accessTokenExpiresAt?: number;
}

export const persistAccessToken = (grant: AccessTokenGrant): void =>
{
    if (grant.accessToken) setAccessToken(grant.accessToken, grant.accessTokenExpiresAt ?? null);
};
