// The access token only authorises HTTP features for the running session, so it
// lives in sessionStorage (dropped when the tab closes) instead of localStorage.
// It is bound to the SSO ticket it was issued with: a session started with a
// different ticket (another Habbo in the same tab) never reuses it.
const STORAGE_KEY = 'octane.access.token';
const LEGACY_STORAGE_KEYS = ['nitro.access.token', 'nitro.access.token.exp'];

interface StoredAccessToken {
    token: string;
    expiresAt: number;
    ticketTag: string;
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

// A one-way 53-bit fingerprint (cyrb53) of the ticket, so the binding can be
// checked without keeping the ticket itself in storage.
export const ssoTicketTag = (ssoTicket: string): string =>
{
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;

    for (let index = 0; index < ssoTicket.length; index++)
    {
        const code = ssoTicket.charCodeAt(index);

        h1 = Math.imul(h1 ^ code, 2654435761);
        h2 = Math.imul(h2 ^ code, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

const readStoredToken = (): StoredAccessToken | null =>
{
    try
    {
        const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null') as Partial<StoredAccessToken> | null;

        if (!stored || typeof stored.token !== 'string' || !stored.token.length || typeof stored.ticketTag !== 'string') return null;

        const expiresAt = typeof stored.expiresAt === 'number' ? stored.expiresAt : 0;

        if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000))
        {
            window.sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }

        return { token: stored.token, expiresAt, ticketTag: stored.ticketTag };
    }
    catch
    {
        return null;
    }
};

export const clearAccessToken = (): void =>
{
    try
    {
        window.sessionStorage.removeItem(STORAGE_KEY);
    }
    catch
    {}
};

export const getAccessToken = (): string => readStoredToken()?.token ?? '';

export const getAccessTokenExpiresAt = (): number => readStoredToken()?.expiresAt ?? 0;

// True when the stored token was issued for this SSO ticket.
export const isAccessTokenBoundTo = (ssoTicket: string): boolean => !!ssoTicket && readStoredToken()?.ticketTag === ssoTicketTag(ssoTicket);

export interface AccessTokenGrant {
    accessToken?: string;
    accessTokenExpiresAt?: number;
}

export const persistAccessToken = (grant: AccessTokenGrant, ssoTicket: string): void =>
{
    if (!grant.accessToken || !ssoTicket) return;

    const stored: StoredAccessToken = {
        token: grant.accessToken,
        expiresAt: grant.accessTokenExpiresAt && grant.accessTokenExpiresAt > 0 ? grant.accessTokenExpiresAt : 0,
        ticketTag: ssoTicketTag(ssoTicket)
    };

    try
    {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    catch
    {}
};
