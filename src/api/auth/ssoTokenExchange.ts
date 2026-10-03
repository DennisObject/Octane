import { getAccessToken, getAccessTokenExpiresAt, persistAccessToken } from './accessToken';
import { exchangeSsoTicket } from './authApi';

const EXPIRY_SLACK_SECONDS = 60;

const hasUsableAccessToken = (): boolean =>
{
    if (!getAccessToken()) return false;
    const expiresAt = getAccessTokenExpiresAt();
    if (!expiresAt) return true;
    return (expiresAt - EXPIRY_SLACK_SECONDS) > Math.floor(Date.now() / 1000);
};

let exchangePromise: Promise<void> | null = null;

export const exchangeSsoTicketForAccessToken = (ssoTicket: string): Promise<void> =>
{
    if (!ssoTicket || hasUsableAccessToken()) return Promise.resolve();
    if (exchangePromise) return exchangePromise;

    // A failed exchange leaves the client working; only the token-gated HTTP
    // features stay unavailable.
    exchangePromise = exchangeSsoTicket(ssoTicket)
        .then((result) =>
        {
            if (result.ok) persistAccessToken(result.data);
        })
        .finally(() =>
        {
            exchangePromise = null;
        });

    return exchangePromise;
};
