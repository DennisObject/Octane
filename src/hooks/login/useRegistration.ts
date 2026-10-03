import { useCallback, useEffect, useState } from 'react';
import {
    AuthFailure,
    checkEmailAvailable,
    checkServerReachable,
    checkUsernameAvailable,
    clearRegistrationDraft,
    describeAuthFailure,
    fetchRoomTemplates,
    getNameProblem,
    getPasswordProblem,
    isValidEmail,
    loadRegistrationDraft,
    loginText,
    loginWithCredentials,
    NAME_MAX_LENGTH,
    NAME_MIN_LENGTH,
    registerAccount,
    RegistrationStep,
    RoomTemplate,
    saveRegistrationDraft,
    storeLoginSession
} from '../../api';
import { useRegistrationFigure } from './useRegistrationFigure';
import { useTimedNotice } from './useTimedNotice';
import { TurnstileState } from './useTurnstile';

interface UseRegistrationOptions {
    turnstile: TurnstileState;
    onAuthenticated: (ssoTicket: string) => void;
    onRegisteredWithoutLogin: (username: string, message: string) => void;
}

const nameProblemText = (name: string): string | null =>
{
    switch (getNameProblem(name))
    {
        case 'too-short':
            return loginText('login.create_avatar.choose_name.name_too_short', 'Sorry, the name you picked is too short.');
        case 'too-long':
            return loginText('login.create_avatar.choose_name.name_too_long', 'Sorry, the name you picked is too long.');
        case 'invalid':
            return loginText('login.create_avatar.choose_name.invalid_name', 'Sorry, the name you picked cannot be used.');
        default:
            return null;
    }
};

const passwordProblemText = (password: string, confirmation: string): string | null =>
{
    switch (getPasswordProblem(password, confirmation))
    {
        case 'too-short':
            return loginText('login.create_account.password.too_short', 'Your password must be at least 8 characters.');
        case 'mismatch':
            return loginText('login.create_account.password.mismatch', 'The passwords do not match.');
        default:
            return null;
    }
};

// The new-user flow: account (email + password), avatar (look + name) and the
// first room. The password stays in memory only; the draft keeps the rest.
export const useRegistration = ({ turnstile, onAuthenticated, onRegisteredWithoutLogin }: UseRegistrationOptions) =>
{
    const [draft] = useState(loadRegistrationDraft);
    const [step, setStep] = useState<RegistrationStep>('account');
    const [email, setEmail] = useState(draft?.email ?? '');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [username, setUsername] = useState(draft?.username ?? '');
    const [templateId, setTemplateId] = useState<number | null>(draft?.templateId ?? null);
    const [templates, setTemplates] = useState<RoomTemplate[] | null>(null);
    const [busy, setBusy] = useState(false);
    const figure = useRegistrationFigure(draft?.gender ?? 'F', draft?.selection ?? {}, step === 'avatar');
    const { notice, noticeId, show: showNotice, clear: clearNotice } = useTimedNotice();

    useEffect(() =>
    {
        saveRegistrationDraft({ email: email.trim(), username: username.trim(), gender: figure.gender, selection: figure.selection, templateId });
    }, [email, username, figure.gender, figure.selection, templateId]);

    useEffect(() =>
    {
        if (step !== 'room' || templates) return;

        let cancelled = false;

        void fetchRoomTemplates().then((result) => !cancelled && setTemplates(result.ok ? result.data : []));

        return () =>
        {
            cancelled = true;
        };
    }, [step, templates]);

    const goTo = useCallback(
        (next: RegistrationStep) =>
        {
            clearNotice();
            setStep(next);
        },
        [clearNotice]
    );

    const failWith = (failure: AuthFailure) => showNotice(describeAuthFailure(failure, 'register'));

    const runChecked = async (work: () => Promise<void>) =>
    {
        if (busy) return;

        setBusy(true);

        try
        {
            if (!(await checkServerReachable()))
            {
                showNotice(loginText('connection.login.error.-400.desc', 'Connecting to the server failed'));
                return;
            }

            await work();
        }
        finally
        {
            setBusy(false);
        }
    };

    const submitAccount = () =>
    {
        const address = email.trim();

        if (!isValidEmail(address)) return showNotice(loginText('connection.password.missing_email', 'Please enter a valid email address.'));

        const passwordProblem = passwordProblemText(password, confirmation);

        if (passwordProblem) return showNotice(passwordProblem);

        void runChecked(async () =>
        {
            const result = await checkEmailAvailable(address);

            if (!result.ok) return failWith(result.failure);
            if (!result.data.available) return showNotice(result.data.message || loginText('login.create_account.email.in_use', 'This email is already in use.'));

            goTo('avatar');
        });
    };

    const submitAvatar = () =>
    {
        const name = username.trim();
        const nameProblem = nameProblemText(name);

        if (nameProblem) return showNotice(nameProblem);

        void runChecked(async () =>
        {
            const result = await checkUsernameAvailable(name);

            if (!result.ok) return failWith(result.failure);
            if (!result.data.available) return showNotice(loginText('login.create_avatar.choose_name.name_already_in_use', 'Sorry, the name you picked is already in use.'));

            goTo('room');
        });
    };

    const signIn = async (name: string) =>
    {
        const result = await loginWithCredentials({ username: name, password, remember: false });

        return result.ok ? result.data : null;
    };

    const submitRoom = () =>
    {
        if (!turnstile.ready) return showNotice(loginText('connection.login.environment.captcha', 'Captcha required'));

        const name = username.trim();

        void runChecked(async () =>
        {
            const created = await registerAccount({
                username: name,
                email: email.trim(),
                password,
                figure: figure.figure,
                gender: figure.gender,
                templateId: templateId ?? undefined,
                turnstileToken: turnstile.enabled ? turnstile.token : undefined
            });

            turnstile.reset();

            if (!created.ok) return failWith(created.failure);

            clearRegistrationDraft();

            // Straight into the hotel. Turnstile tokens are single use, so with a
            // captcha configured the player signs in once more instead.
            const session = created.data.session ?? (turnstile.enabled ? null : await signIn(name));

            setPassword('');
            setConfirmation('');

            if (session)
            {
                storeLoginSession(session, false);
                onAuthenticated(session.ssoTicket);
                return;
            }

            onRegisteredWithoutLogin(name, loginText('login.create_account.done', 'Your Habbo is ready! Sign in to start playing.'));
        });
    };

    return {
        step,
        goTo,
        email,
        setEmail,
        password,
        setPassword,
        confirmation,
        setConfirmation,
        username,
        setUsername,
        templateId,
        setTemplateId,
        templates,
        figure,
        busy,
        notice,
        noticeId,
        submitAccount,
        submitAvatar,
        submitRoom,
        nameRules: { min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH }
    };
};

export type Registration = ReturnType<typeof useRegistration>;
