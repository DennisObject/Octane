import { FC } from 'react';
import { EMAIL_MAX_LENGTH, loginText, PASSWORD_MAX_LENGTH } from '../../../api';
import { Registration } from '../../../hooks/login';
import { LoginInputField } from '../LoginInputField';

interface RegistrationAccountViewProps {
    registration: Registration;
}

// "Create your Habbo account". The official flow asks for an email only and
// mails a login code; this hotel signs in with a password, so the password
// and confirmation fields are additions in the same field style.
export const RegistrationAccountView: FC<RegistrationAccountViewProps> = ({ registration }) => (
    <>
        <LoginInputField
            name="email"
            type="email"
            caption={loginText('login.create_account.email.title', 'Email')}
            prompt={loginText('connection.login.email', 'Email')}
            value={registration.email}
            onChange={registration.setEmail}
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            autoFocus
        />
        <LoginInputField
            name="new-password"
            type="password"
            caption={loginText('generic.password', 'Password')}
            prompt={loginText('connection.login.password', 'Password')}
            value={registration.password}
            onChange={registration.setPassword}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
        />
        <LoginInputField
            name="confirm-password"
            type="password"
            prompt={loginText('login.create_account.password_confirm', 'Repeat password')}
            value={registration.confirmation}
            onChange={registration.setConfirmation}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
        />
    </>
);
