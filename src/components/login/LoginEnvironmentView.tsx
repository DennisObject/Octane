import { FC } from 'react';
import { loginText } from '../../api';
import { LOGIN_LOCALES, LoginLocale } from '../../hooks/login';
import { LoginFlowButton } from './LoginFlowButton';

interface LoginEnvironmentViewProps {
    locale: LoginLocale;
    applying: boolean;
    failed: boolean;
    onSelect: (locale: LoginLocale) => void;
    onStart: () => void;
    onRegister: () => void;
    onForgotPassword: () => void;
}

// EnvironmentView: the official "Select your country!" flag grid. Here the
// country picks the client language rather than a separate hotel.
export const LoginEnvironmentView: FC<LoginEnvironmentViewProps> = ({ locale, applying, failed, onSelect, onStart, onRegister, onForgotPassword }) => (
    <section className="login-flow-screen login-environment-view" aria-labelledby="login-environment-title">
        <h1 id="login-environment-title" className="login-flow-title">
            {loginText('connection.login.environment.choose', 'Select your country!')}
        </h1>
        <div className="login-environment-flags" role="radiogroup" aria-label={loginText('connection.login.environment.choose', 'Select your country!')}>
            {LOGIN_LOCALES.map((candidate) => (
                <button
                    key={candidate.code}
                    type="button"
                    role="radio"
                    aria-checked={candidate.code === locale.code}
                    aria-label={candidate.label}
                    className={`login-environment-flag${candidate.code === locale.code ? ' is-selected' : ''}`}
                    disabled={applying}
                    onClick={() => onSelect(candidate)}
                >
                    <img src={candidate.flag} alt="" draggable={false} />
                </button>
            ))}
        </div>
        {failed && <div className="login-flow-hint">{loginText('generic.error', 'Something went wrong.')}</div>}
        <div className="login-flow-actions">
            <div className="login-environment-name">{applying ? loginText('generic.loading', 'Loading...') : locale.label}</div>
            <LoginFlowButton colour="green" disabled={applying} onClick={onStart}>
                {loginText('connection.login.environment.start', 'Let\'s get started!')}
            </LoginFlowButton>
        </div>
        <div className="login-flow-links">
            <button type="button" className="login-flow-link" onClick={onRegister}>
                {loginText('login.environment.create.account', 'Join here!')}
            </button>
            <button type="button" className="login-flow-link" onClick={onForgotPassword}>
                {loginText('login.environment.forgot.password', 'I Forgot my password')}
            </button>
        </div>
    </section>
);
