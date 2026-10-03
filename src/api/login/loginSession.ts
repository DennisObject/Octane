import { persistAccessToken } from '../auth/accessToken';
import { LoginSession } from '../auth/authApi';
import { ClearRememberLogin, StoreRememberGrant } from '../utils/RememberLogin';

// Keeps what a successful login grants: the access token for this tab, and the
// remember token only when the player asked to stay signed in.
export const storeLoginSession = (session: LoginSession, remember: boolean): void =>
{
    persistAccessToken(session);

    if (remember) StoreRememberGrant(session, session.username);
    else ClearRememberLogin();
};
