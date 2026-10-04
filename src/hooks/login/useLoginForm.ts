import { useActionState, useState } from 'react';
import { BanDetails, describeAuthFailure, getRememberedName, HabboOwner, hasRememberGrant, isRememberSupported, loginText, loginWithCredentials, storeLoginSession } from '../../api';
import { useAbortableFlow } from './useAbortableFlow';
import { useCooldown } from './useCooldown';
import { TurnstileState } from './useTurnstile';
import { useTimedNotice } from './useTimedNotice';

interface UseLoginFormOptions {
    turnstile: TurnstileState;
    onAuthenticated: (ssoTicket: string, owner: HabboOwner) => void;
    onMaintenance: (message: string) => void;
    initialUsername?: string;
}

// Name/password sign-in. The password only lives in this form's state and is
// cleared once the request has been answered.
export const useLoginForm = ({ turnstile, onAuthenticated, onMaintenance, initialUsername }: UseLoginFormOptions) =>
{
    const [username, setUsername] = useState(() => initialUsername || getRememberedName());
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(() => hasRememberGrant());
    const [ban, setBan] = useState<BanDetails | null>(null);
    const cooldown = useCooldown('login');
    const startFlow = useAbortableFlow();
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

        const signal = startFlow();
        const result = await loginWithCredentials({ username: name, password, remember: remember && isRememberSupported(), turnstileToken: turnstile.enabled ? turnstile.token : undefined }, { signal });

        if (signal.aborted) return null;

        setPassword('');
        turnstile.reset();

        if (result.ok)
        {
            storeLoginSession(result.data, remember);
            onAuthenticated(result.data.ssoTicket, { userId: result.data.userId, name: result.data.username });
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
