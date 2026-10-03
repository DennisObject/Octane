// "Remember me" has to survive a closed browser, so its rotating server token is
// the one credential kept in localStorage. Passwords and SSO tickets never are.
export interface RememberLoginData {
    token: string;
    expiresAt: number;
    username?: string;
}

export interface RememberGrant {
    rememberToken?: string;
    rememberExpiresAt?: number;
}

const REMEMBER_LOGIN_KEY = 'nitro.auth.remember';
const LEGACY_REMEMBER_LOGIN_KEY = 'nitro.remember.token';
const DEFAULT_REMEMBER_SECONDS = 30 * 24 * 60 * 60;

export const GetRememberLogin = (): RememberLoginData | null =>
{
    try
    {
        const data = JSON.parse(window.localStorage.getItem(REMEMBER_LOGIN_KEY) || 'null') as Partial<RememberLoginData> | null;

        if (!data || typeof data.token !== 'string' || !data.token.length) return null;

        const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : 0;

        if (expiresAt && expiresAt * 1000 <= Date.now())
        {
            ClearRememberLogin();
            return null;
        }

        return { token: data.token, expiresAt, username: typeof data.username === 'string' ? data.username : undefined };
    }
    catch
    {
        return null;
    }
};

export const SetRememberLogin = (data: RememberLoginData): void =>
{
    if (!data.token.length) return;

    try
    {
        window.localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify({ token: data.token, expiresAt: data.expiresAt, username: data.username }));
    }
    catch
    {}
};

export const ClearRememberLogin = (): void =>
{
    try
    {
        window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
        window.localStorage.removeItem(LEGACY_REMEMBER_LOGIN_KEY);
    }
    catch
    {}
};

export const StoreRememberGrant = (grant: RememberGrant, username?: string): void =>
{
    if (!grant.rememberToken) return;

    const expiresAt = grant.rememberExpiresAt && grant.rememberExpiresAt > 0 ? grant.rememberExpiresAt : Math.floor(Date.now() / 1000) + DEFAULT_REMEMBER_SECONDS;

    SetRememberLogin({ token: grant.rememberToken, expiresAt, username });
};
