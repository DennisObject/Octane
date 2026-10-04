import { AccessTokenGrant, clearAccessToken, getAccessTokenExpiresAt, isAccessTokenBoundTo, persistAccessToken } from './accessToken';
import { exchangeSsoTicket } from './authApi';

const EXPIRY_SLACK_SECONDS = 60;

const hasUsableAccessTokenFor = (ssoTicket: string): boolean =>
{
    if (!isAccessTokenBoundTo(ssoTicket)) return false;

    const expiresAt = getAccessTokenExpiresAt();

    return !expiresAt || (expiresAt - EXPIRY_SLACK_SECONDS) > Math.floor(Date.now() / 1000);
};

interface PendingExchange {
    ssoTicket: string;
    promise: Promise<void>;
}

let pending: PendingExchange | null = null;

// Swaps the session's SSO ticket for an HTTP access token. A different ticket
// (another Habbo in the same tab) drops the old token at once, and an answer
// that arrives after a newer ticket took over is thrown away.
export const exchangeSsoTicketForAccessToken = (ssoTicket: string): Promise<void> =>
{
    if (!ssoTicket || hasUsableAccessTokenFor(ssoTicket)) return Promise.resolve();
    if (pending?.ssoTicket === ssoTicket) return pending.promise;

    clearAccessToken();

    const exchange: PendingExchange = { ssoTicket, promise: null };

    // A failed exchange leaves the client working; only the token-gated HTTP
    // features stay unavailable.
    exchange.promise = exchangeSsoTicket(ssoTicket)
        .then((result) =>
        {
            if (result.ok && pending === exchange) persistAccessToken(result.data, ssoTicket);
        })
        .finally(() =>
        {
            if (pending === exchange) pending = null;
        });

    pending = exchange;

    return exchange.promise;
};

// Called when the session ends or switches: forget the token and ignore any
// exchange still in flight.
export const forgetAccessToken = (): void =>
{
    pending = null;
    clearAccessToken();
};

// Stores a token the server handed out directly (login, register, remember),
// replacing whatever an older exchange might still deliver.
export const adoptAccessToken = (grant: AccessTokenGrant, ssoTicket: string): void =>
{
    forgetAccessToken();
    persistAccessToken(grant, ssoTicket);
};
