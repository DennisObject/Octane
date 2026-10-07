import { getAccessToken } from './accessToken';
import { LoginSession, renewSsoTicket } from './authApi';
import { AuthSession, beginAuthSession, getAuthSession, isSameOwner } from './authSession';
import { hasRememberGrant, redeemRememberGrant } from './rememberStore';
import { adoptAccessToken } from './ssoTokenExchange';

const adoptTicket = (session: LoginSession, previous: AuthSession): string =>
{
    beginAuthSession(session.ssoTicket, previous.source, previous.owner);
    adoptAccessToken(session, session.ssoTicket);

    return session.ssoTicket;
};

// A dropped connection logs in again, but the server spent the ticket this session started with.
// A new one comes from the remember grant of the same Habbo, otherwise from the session's access
// token (which the server replaces); '' when neither works, so the player logs in again.
export const fetchReconnectTicket = async (): Promise<string> =>
{
    const current = getAuthSession();

    if (current.owner && hasRememberGrant())
    {
        const redeemed = await redeemRememberGrant();

        if (redeemed)
        {
            // The socket is already open and sends the ticket at once, so no other tab can replace it first.
            redeemed.release();

            const { session } = redeemed;

            if (isSameOwner({ userId: session.userId, name: session.username }, current.owner)) return adoptTicket(session, current);
        }
    }

    const accessToken = getAccessToken();

    if (!accessToken) return '';

    const renewed = await renewSsoTicket(accessToken);

    // Logged out or switched Habbo while the request ran.
    if (!renewed.ok || getAuthSession().generation !== current.generation) return '';

    return adoptTicket(renewed.data, current);
};
