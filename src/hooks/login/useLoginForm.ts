import { useActionState, useState } from 'react';
import { BanDetails, describeAuthFailure, GetRememberLogin, loginText, loginWithCredentials, storeLoginSession } from '../../api';
import { TurnstileState } from './useTurnstile';
import { useCooldown } from './useCooldown';
import { useTimedNotice } from './useTimedNotice';

interface UseLoginFormOptions {
    turnstile: TurnstileState;
    onAuthenticated: (ssoTicket: string) => void;
    onMaintenance: (message: string) => void;
    initialUsername?: string;
}

// Name/password sign-in. The password only lives in this form's state and is
// cleared once the request has been answered.
export const useLoginForm = ({ turnstile, onAuthenticated, onMaintenance, initialUsername }: UseLoginFormOptions) =>
{
    const [username, setUsername] = useState(() => initialUsername || GetRememberLogin()?.username || '');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(() => !!GetRememberLogin());
    const [ban, setBan] = useState<BanDetails | null>(null);
    const cooldown = useCooldown();
    const { notice, noticeId, show: showNotice, clear: clearNotice } = useTimedNotice();

    const submit = async (): Promise<null> =>
    {
        const name = username.trim();

        if (cooldown.active) return null;

        if (!name || !password)
        {
            showNotice(loginText('connection.login.missing_credentials', 'You need to provide both a username and password.'));
            return null;
        }

        if (!turnstile.ready)
        {
            showNotice(loginText('connection.login.environment.captcha', 'Captcha required'));
            return null;
        }

        clearNotice();
        setBan(null);

        const result = await loginWithCredentials({ username: name, password, remember, turnstileToken: turnstile.enabled ? turnstile.token : undefined });

        setPassword('');
        turnstile.reset();

        if (result.ok)
        {
            storeLoginSession(result.data, remember);
            onAuthenticated(result.data.ssoTicket);
            return null;
        }

        const { failure } = result;

        if (failure.kind === 'banned') setBan(failure.ban);
        else if (failure.kind === 'rate-limited') cooldown.start(failure.retryAfterSeconds);
        else if (failure.kind === 'maintenance') onMaintenance(describeAuthFailure(failure, 'login'));
        else showNotice(describeAuthFailure(failure, 'login'));

        return null;
    };

    const [, formAction, pending] = useActionState<null, FormData>(submit, null);

    return {
        username,
        setUsername,
        password,
        setPassword,
        remember,
        setRemember,
        ban,
        cooldown,
        notice,
        noticeId,
        formAction,
        pending
    };
};
