import { FC, useState } from 'react';
import { getLandingBackdrop, HabboOwner, loginText } from '../../api';
import habboLogo from '../../assets/images/login/habbo_logo.png';
import { useHotelStatus, useLoginLocale } from '../../hooks/login';
import { LandingBackdropView } from '../hotel-view/LandingBackdropView';
import { LoginInfoPanel } from './LoginBalloonView';
import { LoginCredentialsView } from './LoginCredentialsView';
import { LoginEnvironmentView } from './LoginEnvironmentView';
import { LoginFlowBackgroundView } from './LoginFlowBackgroundView';
import { LoginFlowButton } from './LoginFlowButton';
import { LoginForgotPasswordView } from './LoginForgotPasswordView';
import { LoginNewsView } from './LoginNewsView';
import { RegistrationView } from './registration/RegistrationView';

export interface LoginViewProps {
    onAuthenticated: (ssoTicket: string, owner: HabboOwner) => void;
    isEntering?: boolean;
}

type LoginScreen = 'environment' | 'login' | 'register' | 'forgot';

// login.LoginFlow as AIR draws it: its gradient stage with the landing images,
// the Habbo logo at 40,40 and one centred 640px column at y=100 holding the
// current screen. The hotel view's scenery sits underneath; while entering the
// hotel the AIR stage fades out onto it, so the hotel opens on the same scene.
export const LoginView: FC<LoginViewProps> = ({ onAuthenticated, isEntering = false }) =>
{
    const [backdrop] = useState(getLandingBackdrop);
    const localeState = useLoginLocale();
    const status = useHotelStatus();
    const [screen, setScreen] = useState<LoginScreen>(() => (localeState.hasStoredChoice ? 'login' : 'environment'));
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [prefillUsername, setPrefillUsername] = useState('');

    const show = (next: LoginScreen) =>
    {
        setInfoMessage(null);
        setScreen(next);
    };

    const returnToLogin = (message: string, username = '') =>
    {
        setPrefillUsername(username);
        setScreen('login');
        setInfoMessage(message);
    };

    return (
        <div className={`octane-login-view login-flow${isEntering ? ' is-entering' : ''}`} lang={localeState.locale.code}>
            <LandingBackdropView backdrop={backdrop} />
            <LoginFlowBackgroundView leftUrl={backdrop.leftUrl} rightUrl={backdrop.rightUrl} />
            <img className="login-flow-logo" src={habboLogo} alt="Habbo" draggable={false} />
            <main className="login-flow-main">
                {screen === 'environment' && (
                    <LoginEnvironmentView
                        locale={localeState.locale}
                        applying={localeState.applying}
                        failed={localeState.failed}
                        onSelect={(locale) => void localeState.selectLocale(locale)}
                        onStart={() =>
                        {
                            localeState.confirmLocale();
                            show('login');
                        }}
                        onRegister={() => show('register')}
                        onForgotPassword={() => show('forgot')}
                    />
                )}
                {screen === 'login' && (
                    <LoginCredentialsView
                        key={prefillUsername}
                        isEntering={isEntering}
                        infoMessage={infoMessage}
                        initialUsername={prefillUsername}
                        onAuthenticated={onAuthenticated}
                        onMaintenance={status.reportMaintenance}
                        onCancel={() => show('environment')}
                        onRegister={() => show('register')}
                        onForgotPassword={() => show('forgot')}
                    />
                )}
                {screen === 'register' && (
                    <RegistrationView isEntering={isEntering} onAuthenticated={onAuthenticated} onRegisteredWithoutLogin={(username, message) => returnToLogin(message, username)} onCancel={() => show('login')} />
                )}
                {screen === 'forgot' && <LoginForgotPasswordView onDone={(message) => returnToLogin(message)} onCancel={() => show('login')} />}
                {status.maintenance?.enabled && (
                    <LoginInfoPanel title={loginText('disconnect.maintenance.title', 'Maintenance break')}>
                        {status.maintenance.message || loginText('login.maintenance.notice', 'The hotel is closed for maintenance. Only staff can log in right now.')}
                    </LoginInfoPanel>
                )}
                {status.serverReachable === false && (
                    <LoginInfoPanel
                        title={loginText('connection.login.error.-400.desc', 'Connecting to the server failed')}
                        action={
                            <LoginFlowButton colour="green" disabled={status.checking} onClick={() => void status.recheckServer()}>
                                {loginText('generic.reconnect', 'Reconnect')}
                            </LoginFlowButton>
                        }
                    />
                )}
                {(screen === 'login' || screen === 'environment') && <LoginNewsView />}
            </main>
        </div>
    );
};
