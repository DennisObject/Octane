import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button } from '../../../../common';
import { useTranslationActions, useTranslationState } from '../../../../hooks';

interface CatalogAdminTranslateViewProps {
    text: string;
    onTranslated: (text: string) => void;
}

/** Translates the page text through the hotel translation service. */
export const CatalogAdminTranslateView: FC<CatalogAdminTranslateViewProps> = ({ text, onTranslated }) => {
    const { supportedLanguages = [], languagesLoading = false } = useTranslationState();
    const { translateText, ensureSupportedLanguagesLoaded } = useTranslationActions();
    const [isOpen, setIsOpen] = useState(false);
    const [language, setLanguage] = useState('en');
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestRef = useRef(0);
    const hasText = text.trim().length > 0;

    // A translation that answers after the editor closed must not write into it.
    useEffect(
        () => () => {
            requestRef.current += 1;
        },
        []
    );

    const toggle = () => {
        setIsOpen(!isOpen);
        setError(null);
        if (!isOpen) ensureSupportedLanguagesLoaded();
    };

    const translate = async () => {
        if (!hasText || !language || isTranslating) return;

        const request = ++requestRef.current;
        setIsTranslating(true);
        setError(null);

        try {
            const result = await translateText(text, language);
            if (request !== requestRef.current) return;

            onTranslated(result?.translatedText || text);
            setIsOpen(false);
        } catch {
            if (request === requestRef.current) setError(LocalizeText('catalog.admin.translate.failed'));
        } finally {
            if (request === requestRef.current) setIsTranslating(false);
        }
    };

    return (
        <div className="volt-catalog-admin-translate">
            <Button disabled={!hasText || isTranslating} variant="secondary" onClick={() => hasText && toggle()}>
                {LocalizeText('catalog.admin.translate.action')}
            </Button>
            {isOpen && (
                <div className="volt-staff-row">
                    <select disabled={isTranslating || languagesLoading} value={language} onChange={(event) => setLanguage(event.target.value)}>
                        {languagesLoading && !supportedLanguages.length && (
                            <option value="">{LocalizeText('catalog.admin.translate.loading.languages')}</option>
                        )}
                        {supportedLanguages.map((entry) => (
                            <option key={entry.code} value={entry.code}>
                                {entry.name} ({entry.code})
                            </option>
                        ))}
                    </select>
                    <Button disabled={isTranslating || !language || !hasText} variant="primary" onClick={() => void translate()}>
                        {LocalizeText(isTranslating ? 'catalog.admin.translate.busy' : 'catalog.admin.translate.apply')}
                    </Button>
                    <Button disabled={isTranslating} variant="secondary" onClick={() => !isTranslating && toggle()}>
                        {LocalizeText('generic.cancel')}
                    </Button>
                </div>
            )}
            {error && <span className="volt-staff-error-text">{error}</span>}
        </div>
    );
};
