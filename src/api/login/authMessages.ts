import { AuthFailure, BanDetails } from '../auth/authApi';
import { loginText } from './loginText';

export type AuthContext = 'login' | 'register' | 'forgot';

// Login failures stay generic: the copy never says whether the name or the
// password was wrong. Registration may echo the server's validation text,
// which only describes the user's own input.
export const describeAuthFailure = (failure: AuthFailure, context: AuthContext): string =>
{
    switch (failure.kind)
    {
        case 'invalid-credentials':
            return loginText('connection.login.error.-3.desc', 'Wrong name or password');
        case 'banned':
            return loginText('connection.login.error.banned.desc', 'The account has been banned.');
        case 'maintenance':
            return failure.message || loginText('login.maintenance.notice', 'The hotel is closed for maintenance. Only staff can log in right now.');
        case 'rate-limited':
            return loginText('login.banned.temporary_blocked', 'Your login has been temporarily blocked. Please try again later.');
        case 'security-check':
            return loginText('connection.login.environment.captcha', 'Captcha required');
        case 'conflict':
            return (context !== 'login' && failure.message) || loginText('login.create_avatar.choose_name.name_already_in_use', 'Sorry, the name you picked is already in use.');
        case 'rejected':
            if (context === 'login') return loginText('generic.error', 'Something went wrong.');

            return failure.message || loginText('generic.error', 'Something went wrong.');
        case 'unreachable':
            return loginText('connection.login.error.-400.desc', 'Connecting to the server failed');
    }
};

const formatRemaining = (expiresAt: number): string =>
{
    const seconds = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;

    return `${Math.max(1, minutes)}m`;
};

export const describeBanExpiry = (ban: BanDetails): string =>
{
    if (ban.permanent || !ban.expiresAt) return loginText('login.ban.permanent', 'This ban does not expire.');

    return loginText('login.ban.expires', 'Ends in %time%', { time: formatRemaining(ban.expiresAt) });
};
