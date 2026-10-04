import { AccessTokenGrant, clearAccessToken, getAccessTokenExpiresAt, isAccessTokenBoundTo, persistAccessToken } from './accessToken';
import { exchangeSsoTicket } from './authApi';

const EXPIRY_SLACK_SECONDS = 60;

interface PendingExchange {
    ssoTicket: string;
    promise: Promise<void>;
}

let pending: PendingExchange | null = null;

// The server exchanges a ticket only once, so each ticket is tried at most
// once per page, whatever the outcome, and remounts or retries reuse it.
let lastExchangedTicket = '';

const hasUsableAccessTokenFor = (ssoTicket: string): boolean =>
{
    if (!isAccessTokenBoundTo(ssoTicket)) return false;

    const expiresAt = getAccessTokenExpiresAt();

    return !expiresAt || (expiresAt - EXPIRY_SLACK_SECONDS) > Math.floor(Date.now() / 1000);
};

// Swaps the session's SSO ticket for an HTTP access token, unless the session
// already got one with its ticket. A different ticket drops the old token at
// once, and an answer that arrives after a newer ticket took over is ignored.
export const exchangeSsoTicketForAccessToken = (ssoTicket: string): Promise<void> =>
{
    if (!ssoTicket || hasUsableAccessTokenFor(ssoTicket)) return Promise.resolve();
    if (pending?.ssoTicket === ssoTicket) return pending.promise;
    if (lastExchangedTicket === ssoTicket) return Promise.resolve();

    clearAccessToken();
    lastExchangedTicket = ssoTicket;

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

// Stores a token the server handed out together with the session's ticket
// (login, register, remember), so that ticket is never exchanged again.
export const adoptAccessToken = (grant: AccessTokenGrant, ssoTicket: string): void =>
{
    forgetAccessToken();

    // Servers that hand out no token with the ticket still get one exchange.
    if (!grant.accessToken) return;

    lastExchangedTicket = ssoTicket;
    persistAccessToken(grant, ssoTicket);
};
