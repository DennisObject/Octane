import { FC } from 'react';
import { localizeWithFallback, LocalizeText, WiredNativeVariableScope } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Button, Text } from '../../../../common';
import { useWired } from '../../../../hooks';

const SCOPE_ICONS: Record<WiredNativeVariableScope, string> = {
    user: userVariableIcon,
    furni: furniVariableIcon,
    global: globalVariableIcon,
    context: contextVariableIcon
};

/** The scope's buttons, in the order given; the active one is highlighted. */
export const VariableScopeButtons: FC<{ scopes: WiredNativeVariableScope[]; value: WiredNativeVariableScope; onChange: (scope: WiredNativeVariableScope) => void }> = ({
    scopes,
    value,
    onChange
}) => (
    <div className="octane-wired__give-var-targets">
        {scopes.map((scope) => (
            <button
                key={scope}
                type="button"
                className={`octane-wired__give-var-target octane-wired__give-var-target--${scope} ${value === scope ? 'is-active' : ''}`}
                onClick={() => onChange(scope)}
            >
                <img src={SCOPE_ICONS[scope]} alt={scope} />
            </button>
        ))}
    </div>
);

/** Quantifier radios of the variable conditions: all or any of the holders. */
export const VariableQuantifierRadios: FC<{ name: string; value: number; onChange: (value: number) => void }> = ({ name, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
        {[0, 1].map((option) => (
            <label key={option} className="flex items-center gap-1">
                <input checked={value === option} className="form-check-input" name={name} type="radio" onChange={() => onChange(option)} />
                <Text>{LocalizeText(`wiredfurni.params.quantifier.variables.${option}`)}</Text>
            </label>
        ))}
    </div>
);

/** Primary and secondary pick buttons for the furni slots a card reads from; the active slot receives the next picks. */
export const FurniPickSlotButtons: FC<{ slots: Array<{ slot: 0 | 1; count: number }> }> = ({ slots }) => {
    const { activePickSlot = 0, setActivePickSlot = null } = useWired();

    if (!slots.length) return null;

    return (
        <div className="flex gap-2">
            {slots.map(({ slot, count }) => (
                <Button key={slot} disabled={activePickSlot === slot} onClick={() => setActivePickSlot(slot)}>
                    {slot === 0
                        ? localizeWithFallback('wiredfurni.params.picks.primary', 'Primary picks ({count})', ['count'], [String(count)])
                        : localizeWithFallback('wiredfurni.params.picks.secondary', 'Secondary picks ({count})', ['count'], [String(count)])}
                </Button>
            ))}
        </div>
    );
};
