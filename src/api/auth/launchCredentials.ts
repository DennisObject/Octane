// Credentials a website hand-off puts in the URL (`?sso=`, `?token=&token_exp=`).
// The loader (or bootstrap.ts in dev) reads them before its first request and removes them from the
// address bar, so they never reach history, Referer headers or logs; the
// values are kept in memory only for session start-up.
export interface LaunchCredentials {
    ssoTicket: string;
    rememberToken: string;
    rememberExpiresAt: number;
}

const URL_CREDENTIAL_KEYS = ['sso', 'token', 'token_exp'];

let captured: LaunchCredentials | null = null;

export const captureLaunchCredentials = (): LaunchCredentials =>
{
    if (captured) return captured;

    // The production loader (configuration/bootstrap.js) has already taken them out of the URL.
    if (window.__octaneLaunchCredentials)
    {
        captured = { ...window.__octaneLaunchCredentials };
        delete window.__octaneLaunchCredentials;

        return captured;
    }

    const url = new URL(window.location.href);
    const expiresAt = Number(url.searchParams.get('token_exp') || 0);

    captured = {
        ssoTicket: url.searchParams.get('sso') || '',
        rememberToken: url.searchParams.get('token') || '',
        rememberExpiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : 0
    };

    if (URL_CREDENTIAL_KEYS.some((key) => url.searchParams.has(key)))
    {
        for (const key of URL_CREDENTIAL_KEYS) url.searchParams.delete(key);

        window.history.replaceState(window.history.state, '', url.toString());
    }

    return captured;
};

// The hand-off remember token is used once: after that the stored grant (or
// its absence, if it was rejected or cleared) is what counts.
export const takeLaunchRememberToken = (): { token: string; expiresAt: number } | null =>
{
    const launch = captureLaunchCredentials();

    if (!launch.rememberToken) return null;

    const grant = { token: launch.rememberToken, expiresAt: launch.rememberExpiresAt };

    captured = { ...launch, rememberToken: '', rememberExpiresAt: 0 };

    return grant;
};
