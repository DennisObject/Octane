import { FC, useActionState, useState } from 'react';
import { describeAuthFailure, EMAIL_MAX_LENGTH, isValidEmail, loginText, requestPasswordReset } from '../../api';
import { useAbortableFlow, useCooldown, useTimedNotice, useTurnstile } from '../../hooks/login';
import { LoginErrorBalloon, LoginInfoPanel } from './LoginBalloonView';
import { LoginCooldownPanel } from './LoginCooldownPanel';
import { LoginFlowButton } from './LoginFlowButton';
import { LoginInputField } from './LoginInputField';
import { TurnstileWidget } from './TurnstileWidget';

interface LoginForgotPasswordViewProps {
    onDone: (message: string) => void;
    onCancel: () => void;
}

// The official password reminder ("Reset password" / Send) in onboarding chrome.
export const LoginForgotPasswordView: FC<LoginForgotPasswordViewProps> = ({ onDone, onCancel }) =>
{
    const [email, setEmail] = useState('');
    const [unavailable, setUnavailable] = useState(false);
    const turnstile = useTurnstile();
    const { notice, noticeId, show } = useTimedNotice();
    const cooldown = useCooldown('forgot');
    const startFlow = useAbortableFlow();

    const submit = async (): Promise<null> =>
    {
        const address = email.trim();

        if (cooldown.active) return null;

        if (!isValidEmail(address))
        {
            show(loginText('connection.password.missing_email', 'Please enter a valid email address.'));
            return null;
        }

        if (!turnstile.ready)
        {
            show(loginText('connection.login.environment.captcha', 'Captcha required'));
            return null;
        }

        const signal = startFlow();
        const result = await requestPasswordReset(address, turnstile.enabled ? turnstile.token : undefined, { signal });

        if (signal.aborted) return null;

        turnstile.reset();

        if (!result.ok)
        {
            if (result.failure.kind === 'rate-limited') cooldown.start(result.failure.retryAfterSeconds);
            else if (result.failure.kind === 'not-implemented') setUnavailable(true);
            else show(describeAuthFailure(result.failure, 'forgot'));

            return null;
        }

        // The same answer whether or not the address has an account.
        onDone(loginText('connection.password.reminder.sent', 'If an account uses that address, a reset link is on its way.'));
        return null;
    };

    const [, formAction, pending] = useActionState<null, FormData>(submit, null);

    return (
        <section className="login-flow-screen login-forgot-view" aria-labelledby="login-forgot-title">
            <h1 id="login-forgot-title" className="login-flow-title">
                {loginText('connection.password.reminder.title', 'Reset password')}
            </h1>
            <form className="login-flow-form" action={formAction} noValidate>
                <LoginInputField
                    name="email"
                    type="email"
                    caption={loginText('connection.password.reminder.description', 'Fill in your email address and click on send to receive your password reset email.')}
                    prompt={loginText('connection.login.email', 'Email')}
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    maxLength={EMAIL_MAX_LENGTH}
                    autoFocus
                />
                {turnstile.enabled && (
                    <TurnstileWidget siteKey={turnstile.siteKey} size="compact" onToken={turnstile.setToken} onExpire={turnstile.clearToken} onError={turnstile.clearToken} resetSignal={turnstile.resetSignal} />
                )}
                <LoginErrorBalloon key={noticeId} text={notice} />
                <div className="login-flow-actions">
                    <LoginFlowButton colour="red" disabled={pending} onClick={onCancel}>
                        {loginText('generic.cancel', 'Cancel')}
                    </LoginFlowButton>
                    <LoginFlowButton colour="green" type="submit" disabled={pending || unavailable || cooldown.active}>
                        {loginText('connection.password.reminder', 'Send')}
                    </LoginFlowButton>
                </div>
            </form>
            {unavailable && <LoginInfoPanel title={loginText('connection.password.reminder.title', 'Reset password')}>{loginText('login.feature.unavailable', 'This is not available on this hotel.')}</LoginInfoPanel>}
            <LoginCooldownPanel cooldown={cooldown} />
        </section>
    );
};
