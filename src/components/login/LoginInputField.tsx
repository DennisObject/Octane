import { FC, HTMLInputAutoCompleteAttribute } from 'react';

interface LoginInputFieldProps {
    name: string;
    prompt: string;
    caption?: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'password' | 'email';
    autoComplete: HTMLInputAutoCompleteAttribute;
    maxLength: number;
    disabled?: boolean;
    autoFocus?: boolean;
}

// The official onboarding InputField: an optional light-blue caption above a
// 31px "hitch" field whose prompt text sits inside it until typing starts.
export const LoginInputField: FC<LoginInputFieldProps> = ({ name, prompt, caption, value, onChange, type = 'text', autoComplete, maxLength, disabled, autoFocus }) => (
    <label className="login-flow-field">
        {caption && <span className="login-flow-field-caption">{caption}</span>}
        <input
            className="login-flow-input"
            name={name}
            type={type}
            placeholder={prompt}
            aria-label={prompt}
            value={value}
            autoComplete={autoComplete}
            maxLength={maxLength}
            spellCheck={false}
            autoCapitalize="off"
            disabled={disabled}
            autoFocus={autoFocus}
            onChange={(event) => onChange(event.target.value)}
        />
    </label>
);
