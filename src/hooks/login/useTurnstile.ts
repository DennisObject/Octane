import { useCallback, useState } from 'react';
import { GetConfigurationValue } from '../../api';

const isEnabledFlag = (value: unknown): boolean => value === true || value === 'true' || value === 1 || value === '1';

// Cloudflare Turnstile state for one form. Tokens are single use, so callers
// reset the widget after every submit.
export const useTurnstile = () =>
{
    const siteKey = GetConfigurationValue<string>('login.turnstile.sitekey', '');
    const enabled = isEnabledFlag(GetConfigurationValue<unknown>('login.turnstile.enabled', false)) && !!siteKey;
    const [token, setToken] = useState('');
    const [resetSignal, setResetSignal] = useState(0);

    const reset = useCallback(() =>
    {
        setToken('');
        setResetSignal((signal) => signal + 1);
    }, []);

    const clearToken = useCallback(() => setToken(''), []);

    return { enabled, siteKey, token, ready: !enabled || !!token, resetSignal, setToken, clearToken, reset };
};

export type TurnstileState = ReturnType<typeof useTurnstile>;
