import { FC } from 'react';
import { describeBanExpiry, loginText, PASSWORD_MAX_LENGTH } from '../../api';
import { useLoginForm, useTurnstile } from '../../hooks/login';
import { LoginErrorBalloon, LoginInfoPanel } from './LoginBalloonView';
import { LoginCooldownPanel } from './LoginCooldownPanel';
import { LoginFlowButton } from './LoginFlowButton';
import { LoginInputField } from './LoginInputField';
import { TurnstileWidget } from './TurnstileWidget';

interface LoginCredentialsViewProps {
    isEntering: boolean;
    infoMessage: string | null;
    initialUsername?: string;
    onAuthenticated: (ssoTicket: string) => void;
    onMaintenance: (message: string) => void;
    onCancel: () => void;
    onRegister: () => void;
    onForgotPassword: () => void;
}

// login.LoginView: "Sign In", the two prompt fields and the red Cancel / green
// Play! buttons. Remember me and Turnstile have no AIR counterpart and reuse
// the same chrome.
export const LoginCredentialsView: FC<LoginCredentialsViewProps> = ({
    isEntering,
    infoMessage,
    initialUsername,
    onAuthenticated,
    onMaintenance,
    onCancel,
    onRegister,
    onForgotPassword
}) =>
{
    const turnstile = useTurnstile();
    const form = useLoginForm({ turnstile, onAuthenticated, onMaintenance, initialUsername });
    const busy = form.pending || isEntering;

    return (
        <section className="login-flow-screen login-credentials-view" aria-labelledby="login-credentials-title">
            <h1 id="login-credentials-title" className="login-flow-title">
                {loginText('connection.login.title', 'Sign In')}
            </h1>
            <form className="login-flow-form" action={form.formAction} autoComplete="on" noValidate>
                <LoginInputField
                    name="username"
                    caption={loginText('connection.login.missing_credentials', 'You need to provide both a username and password.')}
                    prompt={loginText('connection.login.name', 'Name')}
                    value={form.username}
                    onChange={form.setUsername}
                    autoComplete="username"
                    maxLength={32}
                    disabled={isEntering}
                    autoFocus={!form.username}
                />
                <LoginInputField
                    name="password"
                    type="password"
                    prompt={loginText('connection.login.password', 'Password')}
                    value={form.password}
                    onChange={form.setPassword}
                    autoComplete="current-password"
                    maxLength={PASSWORD_MAX_LENGTH}
                    disabled={isEntering}
                    autoFocus={!!form.username}
                />
                <label className="login-flow-checkbox">
                    <input type="checkbox" name="remember" checked={form.remember} disabled={isEntering} onChange={(event) => form.setRemember(event.target.checked)} />
                    <span>{loginText('login.remember_me', 'Remember me')}</span>
                </label>
                {turnstile.enabled && (
                    <TurnstileWidget
                        siteKey={turnstile.siteKey}
                        size="compact"
                        onToken={turnstile.setToken}
                        onExpire={turnstile.clearToken}
                        onError={turnstile.clearToken}
                        resetSignal={turnstile.resetSignal}
                    />
                )}
                <LoginErrorBalloon key={form.noticeId} text={form.notice} />
                <div className="login-flow-actions">
                    <div className="login-flow-links">
                        <button type="button" className="login-flow-link" disabled={busy} onClick={onForgotPassword}>
                            {loginText('login.environment.forgot.password', 'I Forgot my password')}
                        </button>
                        <button type="button" className="login-flow-link" disabled={busy} onClick={onRegister}>
                            {loginText('login.environment.create.account', 'Join here!')}
                        </button>
                    </div>
                    <LoginFlowButton colour="red" disabled={busy} onClick={onCancel}>
                        {loginText('generic.cancel', 'Cancel')}
                    </LoginFlowButton>
                    <LoginFlowButton colour="green" type="submit" disabled={busy || form.cooldown.active}>
                        {busy ? loginText('login.loading', 'loading...') : loginText('connection.login.play', 'Play!')}
                    </LoginFlowButton>
                </div>
            </form>
            {infoMessage && <LoginInfoPanel title={infoMessage} />}
            <LoginCooldownPanel cooldown={form.cooldown} />
            {form.ban && (
                <LoginInfoPanel title={loginText('connection.login.error.banned.desc', 'The account has been banned.')}>
                    {form.ban.reason && (
                        <span className="login-flow-panel-row">
                            {loginText('login.select_avatar.ban_reason', 'Ban reason')}: {form.ban.reason}
                        </span>
                    )}
                    <span className="login-flow-panel-row">{describeBanExpiry(form.ban)}</span>
                </LoginInfoPanel>
            )}
        </section>
    );
};
