import { LoginSession } from '../auth/authApi';
import { adoptAccessToken } from '../auth/ssoTokenExchange';
import { ClearRememberLogin, StoreRememberGrant } from '../utils/RememberLogin';

// Keeps what a successful login grants: the access token for this tab (bound
// to the session's SSO ticket), and the remember token only when the player
// asked to stay signed in.
export const storeLoginSession = (session: LoginSession, remember: boolean): void =>
{
    adoptAccessToken(session, session.ssoTicket);

    if (remember) StoreRememberGrant(session, session.username);
    else ClearRememberLogin();
};
