import { useCallback, useEffect, useRef, useState } from 'react';
import flagEn from '../../assets/images/flag_icon/flag_icon_en.png';
import flagEs from '../../assets/images/flag_icon/flag_icon_es.png';
import flagFr from '../../assets/images/flag_icon/flag_icon_fr.png';
import flagIt from '../../assets/images/flag_icon/flag_icon_it.png';
import flagNl from '../../assets/images/flag_icon/flag_icon_nl.png';
import { applyTextTranslationLocale } from '../translation/useTranslation';

export interface LoginLocale {
    code: string;
    label: string;
    flag: string;
}

// The official client's country picker, limited to the languages this client ships texts for.
export const LOGIN_LOCALES: LoginLocale[] = [
    { code: 'en', label: 'English', flag: flagEn },
    { code: 'es', label: 'Español', flag: flagEs },
    { code: 'fr', label: 'Français', flag: flagFr },
    { code: 'it', label: 'Italiano', flag: flagIt },
    { code: 'nl', label: 'Nederlands', flag: flagNl }
];

const SETTINGS_KEY = 'chatTranslationSettings';

const findLocale = (value: string): LoginLocale | undefined =>
{
    const base = value.trim().toLowerCase().split(/[-_]/)[0];

    return LOGIN_LOCALES.find((locale) => locale.code === base);
};

const readSettings = (): Record<string, unknown> =>
{
    try
    {
        const settings: unknown = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}');

        return settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {};
    }
    catch
    {
        return {};
    }
};

const readStoredLocale = (): LoginLocale | undefined =>
{
    const stored = readSettings().uiTextLanguage;

    return typeof stored === 'string' ? findLocale(stored) : undefined;
};

const storeLocale = (locale: LoginLocale): void =>
{
    const settings = readSettings();

    try
    {
        window.localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify({
                enabled: false,
                incomingTargetLanguage: locale.code,
                outgoingTargetLanguage: locale.code,
                ...settings,
                uiTextLanguage: locale.code
            })
        );
    }
    catch
    {}
};

export const useLoginLocale = () =>
{
    const [storedLocale] = useState(readStoredLocale);
    const [locale, setLocale] = useState<LoginLocale>(() => storedLocale ?? findLocale(navigator.language || '') ?? LOGIN_LOCALES[0]);
    const [applying, setApplying] = useState(true);
    const [failed, setFailed] = useState(false);
    const initialLocaleRef = useRef(locale);

    useEffect(() =>
    {
        let cancelled = false;

        applyTextTranslationLocale(initialLocaleRef.current.code)
            .catch(() => !cancelled && setFailed(true))
            .finally(() => !cancelled && setApplying(false));

        return () =>
        {
            cancelled = true;
        };
    }, []);

    const selectLocale = useCallback(
        async (next: LoginLocale) =>
        {
            if (applying || next.code === locale.code) return;

            const previous = locale;

            setLocale(next);
            setApplying(true);
            setFailed(false);

            try
            {
                await applyTextTranslationLocale(next.code);
                storeLocale(next);
            }
            catch
            {
                setLocale(previous);
                setFailed(true);
            }
            finally
            {
                setApplying(false);
            }
        },
        [applying, locale]
    );

    const confirmLocale = useCallback(() => storeLocale(locale), [locale]);

    return { locale, applying, failed, hasStoredChoice: !!storedLocale, selectLocale, confirmLocale };
};
