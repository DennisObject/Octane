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
    NAME_MAX_LENGTH,
    NAME_MIN_LENGTH,
    registerAccount,
    RegistrationStep,
    RoomTemplate,
    saveRegistrationDraft,
    storeLoginSession
} from '../../api';
import { useAbortableFlow } from './useAbortableFlow';
import { useCooldown } from './useCooldown';
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
    const cooldown = useCooldown('register');
    const startFlow = useAbortableFlow();

    useEffect(() =>
    {
        saveRegistrationDraft({ email: email.trim(), username: username.trim(), gender: figure.gender, selection: figure.selection, templateId });
    }, [email, username, figure.gender, figure.selection, templateId]);

    useEffect(() =>
    {
        if (step !== 'room' || templates) return;

        const controller = new AbortController();

        void fetchRoomTemplates({ signal: controller.signal }).then((result) => !controller.signal.aborted && setTemplates(result.ok ? result.data : []));

        return () => controller.abort();
    }, [step, templates]);

    const goTo = useCallback(
        (next: RegistrationStep) =>
        {
            clearNotice();
            setStep(next);
        },
        [clearNotice]
    );

    const failWith = (failure: AuthFailure) =>
    {
        if (failure.kind === 'rate-limited') cooldown.start(failure.retryAfterSeconds);
        else showNotice(describeAuthFailure(failure, 'register'));
    };

    // Runs one step's server work. Leaving the sign-up (or starting another
    // step) aborts it, and `work` must stop once its signal is aborted.
    const runChecked = async (work: (signal: AbortSignal) => Promise<void>) =>
    {
        if (busy || cooldown.active) return;

        const signal = startFlow();

        setBusy(true);

        try
        {
            const reachable = await checkServerReachable();

            if (signal.aborted) return;

            if (!reachable)
            {
                showNotice(loginText('connection.login.error.-400.desc', 'Connecting to the server failed'));
                return;
            }

            await work(signal);
        }
        finally
        {
            if (!signal.aborted) setBusy(false);
        }
    };

    const submitAccount = () =>
    {
        const address = email.trim();

        if (!isValidEmail(address)) return showNotice(loginText('connection.password.missing_email', 'Please enter a valid email address.'));

        const passwordProblem = passwordProblemText(password, confirmation);

        if (passwordProblem) return showNotice(passwordProblem);

        void runChecked(async (signal) =>
        {
            const result = await checkEmailAvailable(address, { signal });

            if (signal.aborted) return;
            if (!result.ok) return failWith(result.failure);
            if (result.data.available === false) return showNotice(result.data.message || loginText('login.create_account.email.in_use', 'This email is already in use.'));

            goTo('avatar');
        });
    };

    const submitAvatar = () =>
    {
        const name = username.trim();
        const nameProblem = nameProblemText(name);

        if (nameProblem) return showNotice(nameProblem);

        void runChecked(async (signal) =>
        {
            const result = await checkUsernameAvailable(name, { signal });

            if (signal.aborted) return;
            if (!result.ok) return failWith(result.failure);
            if (result.data.available === false) return showNotice(loginText('login.create_avatar.choose_name.name_already_in_use', 'Sorry, the name you picked is already in use.'));

            goTo('room');
        });
    };

    const submitRoom = () =>
    {
        if (!turnstile.ready) return showNotice(loginText('connection.login.environment.captcha', 'Captcha required'));

        const name = username.trim();

        void runChecked(async (signal) =>
        {
            const created = await registerAccount({
                username: name,
                email: email.trim(),
                password,
                figure: figure.figure,
                gender: figure.gender,
                templateId: templateId ?? undefined,
                turnstileToken: turnstile.enabled ? turnstile.token : undefined
            }, { signal });

            if (signal.aborted) return;

            turnstile.reset();

            if (!created.ok) return failWith(created.failure);

            clearRegistrationDraft();

            // Straight into the hotel with the ticket /register hands out. A server
            // that returns none sends the player to Sign In with the name filled in.
            const session = created.data.session;

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
        cooldown,
        notice,
        noticeId,
        submitAccount,
        submitAvatar,
        submitRoom,
        nameRules: { min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH }
    };
};

export type Registration = ReturnType<typeof useRegistration>;
