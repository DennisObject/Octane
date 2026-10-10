// The access token only authorises HTTP features for the running session, so
// it is kept in memory, together with the SSO ticket it belongs to. SSO tickets
// are single use, so every page load starts a new session (login, remember-me
// or a website hand-off) that hands out its own token; nothing is stored.
const LEGACY_STORAGE_KEYS = ['nitro.access.token', 'nitro.access.token.exp'];
// Written by the client while it was still called Octane.
const LEGACY_SESSION_KEY = 'octane.access.token';

interface HeldAccessToken {
    token: string;
    expiresAt: number;
    ssoTicket: string;
}

let held: HeldAccessToken | null = null;

const removeStoredTokens = (): void =>
{
    try
    {
        for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);

        window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
    }
    catch
    {}
};

removeStoredTokens();

const readHeldToken = (): HeldAccessToken | null =>
{
    if (held?.expiresAt && held.expiresAt <= Math.floor(Date.now() / 1000)) held = null;

    return held;
};

export const clearAccessToken = (): void =>
{
    held = null;
};

export const getAccessToken = (): string => readHeldToken()?.token ?? '';

export const getAccessTokenExpiresAt = (): number => readHeldToken()?.expiresAt ?? 0;

// True when the held token was issued for this SSO ticket.
export const isAccessTokenBoundTo = (ssoTicket: string): boolean => !!ssoTicket && readHeldToken()?.ssoTicket === ssoTicket;

export interface AccessTokenGrant {
    accessToken?: string;
    accessTokenExpiresAt?: number;
}

export const persistAccessToken = (grant: AccessTokenGrant, ssoTicket: string): void =>
{
    if (!grant.accessToken || !ssoTicket) return;

    held = {
        token: grant.accessToken,
        expiresAt: grant.accessTokenExpiresAt && grant.accessTokenExpiresAt > 0 ? grant.accessTokenExpiresAt : 0,
        ssoTicket
    };
};
