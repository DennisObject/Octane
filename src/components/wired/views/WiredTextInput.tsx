import { ChangeEvent, FC } from 'react';
import { useWiredNative } from './WiredNativeContext';

export interface WiredTextInputProps {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    placeholder?: string;
    /** Field width; the border adds 8px like TextInputParam. Full width when omitted. */
    width?: number;
    disabled?: boolean;
    className?: string;
}

/** TextInputPreset: the Illumina input border around a 16px field, with the character limit warning near the end. */
export const WiredTextInput: FC<WiredTextInputProps> = ({ value, onChange, maxLength = 0, placeholder = '', width = -1, disabled = false, className = '' }) =>
{
    const isNative = useWiredNative();
    const warnWindow = maxLength > 10 ? Math.min(30, Math.max(6, Math.trunc(maxLength / 5))) : 0;
    const warn = warnWindow > 0 && value.length > maxLength - warnWindow;

    // Only the Illumina frame draws the bitmap border; the other frames keep the plain field.
    if (!isNative)
    {
        return (
            <input
                className={`form-control form-control-sm ${className}`}
                disabled={disabled}
                maxLength={maxLength > 0 ? maxLength : undefined}
                placeholder={placeholder}
                spellCheck={false}
                style={width >= 0 ? { width: width + 8 } : undefined}
                type="text"
                value={value}
                onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
            />
        );
    }

    return (
        <div className={`octane-wired__input-box ${className}`} style={width >= 0 ? { width: width + 8 } : { width: '100%' }}>
            <input
                className="octane-wired__input-field octane-wired__input-field--stretch"
                disabled={disabled}
                maxLength={maxLength > 0 ? maxLength : undefined}
                placeholder={placeholder}
                spellCheck={false}
                type="text"
                value={value}
                onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
            />
            {warn && <span className="octane-wired__input-limit">{`${value.length}/${maxLength}`}</span>}
        </div>
    );
};
