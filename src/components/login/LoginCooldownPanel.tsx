import { FC } from 'react';
import { loginText } from '../../api';
import { Cooldown } from '../../hooks/login';
import { LoginInfoPanel } from './LoginBalloonView';

// Shown while the server's rate limit (HTTP 429) for this action runs.
export const LoginCooldownPanel: FC<{ cooldown: Cooldown }> = ({ cooldown }) =>
    cooldown.active ? (
        <LoginInfoPanel title={loginText('login.banned.temporary_blocked', 'Your login has been temporarily blocked. Please try again later.')}>
            {loginText('login.try_again_in', 'Try again in %seconds% seconds.', { seconds: String(cooldown.remaining) })}
        </LoginInfoPanel>
    ) : null;
