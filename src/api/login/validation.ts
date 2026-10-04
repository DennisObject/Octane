// Client-side checks mirror the server's RegistrationValidator (PlusEMU) so
// obvious mistakes are caught before a request; the server stays authoritative,
// including its reserved-name and word-filter rules.
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 15;
export const NAME_ALLOWED_CHARACTERS = '. , _ - ; : ? !';
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[A-Za-z0-9.,_\-;:?!]+$/;

export type NameProblem = 'too-short' | 'too-long' | 'invalid' | null;
export type PasswordProblem = 'too-short' | 'mismatch' | null;

export const isValidEmail = (email: string): boolean => email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email);

export const getNameProblem = (name: string): NameProblem =>
{
    if (name.length < NAME_MIN_LENGTH) return 'too-short';
    if (name.length > NAME_MAX_LENGTH) return 'too-long';
    if (!NAME_PATTERN.test(name)) return 'invalid';

    return null;
};

export const getPasswordProblem = (password: string, confirmation: string): PasswordProblem =>
{
    if (password.length < PASSWORD_MIN_LENGTH) return 'too-short';
    if (password !== confirmation) return 'mismatch';

    return null;
};
