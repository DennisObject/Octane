import { FC, FormEvent } from 'react';
import { loginText, RegistrationStep } from '../../../api';
import { useRegistration, useTurnstile } from '../../../hooks/login';
import { LoginErrorBalloon } from '../LoginBalloonView';
import { LoginCooldownPanel } from '../LoginCooldownPanel';
import { LoginFlowButton } from '../LoginFlowButton';
import { TurnstileWidget } from '../TurnstileWidget';
import { RegistrationAccountView } from './RegistrationAccountView';
import { RegistrationAvatarView } from './RegistrationAvatarView';
import { RegistrationRoomView } from './RegistrationRoomView';

interface RegistrationViewProps {
    isEntering: boolean;
    onAuthenticated: (ssoTicket: string) => void;
    onRegisteredWithoutLogin: (username: string, message: string) => void;
    onCancel: () => void;
}

const TITLES: Record<RegistrationStep, { key: string; fallback: string }> = {
    account: { key: 'login.create_account.title', fallback: 'Create your Habbo account' },
    avatar: { key: 'login.create_avatar.title', fallback: 'Choose your Habbo avatar' },
    room: { key: 'login.select_first_room.title', fallback: 'Choose a room for your Habbo' }
};

const PREVIOUS: Record<RegistrationStep, RegistrationStep | null> = { account: null, avatar: 'account', room: 'avatar' };

// The new-user flow, using the official create-account, create-avatar and
// first-room texts on the same onboarding chrome as Sign In.
export const RegistrationView: FC<RegistrationViewProps> = ({ isEntering, onAuthenticated, onRegisteredWithoutLogin, onCancel }) =>
{
    const turnstile = useTurnstile();
    const registration = useRegistration({ turnstile, onAuthenticated, onRegisteredWithoutLogin });
    const { step } = registration;
    const previous = PREVIOUS[step];
    const busy = registration.busy || isEntering;

    const submit = (event: FormEvent<HTMLFormElement>) =>
    {
        event.preventDefault();

        if (step === 'account') registration.submitAccount();
        else if (step === 'avatar') registration.submitAvatar();
        else registration.submitRoom();
    };

    return (
        <section className={`login-flow-screen registration-view registration-step-${step}`} aria-labelledby="registration-title">
            <h1 id="registration-title" className="login-flow-title">
                {loginText(TITLES[step].key, TITLES[step].fallback)}
            </h1>
            <form className="login-flow-form" onSubmit={submit} autoComplete="on" noValidate>
                {step === 'account' && <RegistrationAccountView registration={registration} />}
                {step === 'avatar' && <RegistrationAvatarView registration={registration} />}
                {step === 'room' && <RegistrationRoomView registration={registration} />}
                {step === 'room' && turnstile.enabled && (
                    <TurnstileWidget siteKey={turnstile.siteKey} size="compact" onToken={turnstile.setToken} onExpire={turnstile.clearToken} onError={turnstile.clearToken} resetSignal={turnstile.resetSignal} />
                )}
                <LoginErrorBalloon key={registration.noticeId} text={registration.notice} />
                <div className="login-flow-actions">
                    <span className="login-flow-step">{['account', 'avatar', 'room'].indexOf(step) + 1}/3</span>
                    <LoginFlowButton colour="red" disabled={busy} onClick={previous ? () => registration.goTo(previous) : onCancel}>
                        {previous ? loginText('generic.back', 'Back') : loginText('generic.cancel', 'Cancel')}
                    </LoginFlowButton>
                    <LoginFlowButton colour="green" type="submit" disabled={busy || registration.cooldown.active}>
                        {busy ? loginText('login.loading', 'loading...') : step === 'room' ? loginText('connection.login.play', 'Play!') : loginText('generic.continue', 'Continue')}
                    </LoginFlowButton>
                </div>
            </form>
            <LoginCooldownPanel cooldown={registration.cooldown} />
        </section>
    );
};
