import { FC, useEffect, useState } from 'react';
import { LocalizeText } from '../../api';
import { Button, StaffSection } from '../../common';
import { useHousekeepingStore } from '../../hooks';

const COPY_FEEDBACK_MS = 1600;

// Plain-http hotels have no async clipboard; fall back to a hidden textarea.
const copyText = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);

            return true;
        } catch {
            // Try the legacy path below.
        }
    }

    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        textarea.remove();
    }
};

/**
 * Shows a freshly reset password once so staff can pass it on. It lives in memory only
 * (never in the status banner, a toast or storage) and is cleared on dismiss, on closing
 * the panel and when another user is selected.
 */
export const HousekeepingPasswordReveal: FC = () => {
    const { passwordReveal, clearPasswordReveal } = useHousekeepingStore();
    const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');

    useEffect(() => {
        if (copyState === 'idle') return;

        const handle = window.setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);

        return () => window.clearTimeout(handle);
    }, [copyState]);

    if (!passwordReveal) return null;

    const copyLabel = LocalizeText(copyState === 'ok' ? 'housekeeping.password.copied' : copyState === 'fail' ? 'housekeeping.password.copy_failed' : 'housekeeping.password.copy');

    return (
        <StaffSection
            className="volt-housekeeping-password"
            title={LocalizeText('housekeeping.password.title', ['username', 'id'], [passwordReveal.username || '-', String(passwordReveal.userId)])}
        >
            <div className="volt-staff-row">
                <input
                    readOnly
                    aria-label={LocalizeText('housekeeping.password.value_label')}
                    autoComplete="off"
                    className="volt-housekeeping-password-value grow"
                    spellCheck={false}
                    type="text"
                    value={passwordReveal.password}
                    onFocus={(event) => event.currentTarget.select()}
                />
                <Button variant="secondary" onClick={async () => setCopyState((await copyText(passwordReveal.password)) ? 'ok' : 'fail')}>
                    {copyLabel}
                </Button>
                <Button variant="secondary" onClick={clearPasswordReveal}>
                    {LocalizeText('housekeeping.password.dismiss')}
                </Button>
            </div>
            <span className="volt-staff-muted">{LocalizeText('housekeeping.password.hint')}</span>
        </StaffSection>
    );
};
