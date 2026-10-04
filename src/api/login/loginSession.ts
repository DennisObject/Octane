import { LoginSession } from '../auth/authApi';
import { storeLoginGrant } from '../auth/rememberStore';
import { adoptAccessToken } from '../auth/ssoTokenExchange';

// Keeps what a successful login grants: the access token for this tab (bound
// to the session's SSO ticket), and the remember grant only when the player
// asked to stay signed in.
export const storeLoginSession = (session: LoginSession, remember: boolean): void =>
{
    adoptAccessToken(session, session.ssoTicket);
    void storeLoginGrant(session, remember);
};
