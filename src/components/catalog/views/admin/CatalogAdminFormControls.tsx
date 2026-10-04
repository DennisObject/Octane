import { FC, Ref } from 'react';
import { StaffField } from '../../../../common';

interface FieldProps<T> {
    label: string;
    value: T;
    onChange: (value: T) => void;
    disabled?: boolean;
    error?: string;
    className?: string;
}

const FieldError: FC<{ error?: string }> = ({ error = '' }) => (error ? <span className="octane-staff-error-text">{error}</span> : null);

type TextFieldProps = Omit<FieldProps<string>, 'onChange'> & {
    placeholder?: string;
    inputRef?: Ref<HTMLInputElement>;
} & ({ readOnly: true; onChange?: never } | { readOnly?: false; onChange: (value: string) => void });

/** A text input; `readOnly` shows a value the hotel decides, such as the catalog a page belongs to. */
export const CatalogAdminTextField: FC<TextFieldProps> = (props) => {
    const { label, value, onChange, disabled = false, error = '', className = '', placeholder = '', inputRef = null, readOnly = false } = props;

    return (
        <StaffField className={className} label={label}>
            <input
                ref={inputRef}
                aria-invalid={!!error}
                disabled={disabled}
                placeholder={placeholder}
                readOnly={readOnly}
                type="text"
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
            />
            <FieldError error={error} />
        </StaffField>
    );
};

export const CatalogAdminNumberField: FC<FieldProps<number> & { min?: number; max?: number; fallback?: number; readOnly?: boolean }> = (props) => {
    const { label, value, onChange, disabled = false, error = '', className = '', min, max, fallback = 0, readOnly = false } = props;

    return (
        <StaffField className={className} label={label}>
            <input
                aria-invalid={!!error}
                disabled={disabled}
                max={max}
                min={min}
                readOnly={readOnly}
                type="number"
                value={value}
                onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    onChange(Number.isNaN(parsed) ? fallback : parsed);
                }}
            />
            <FieldError error={error} />
        </StaffField>
    );
};

export const CatalogAdminTextAreaField: FC<FieldProps<string> & { rows?: number }> = (props) => {
    const { label, value, onChange, disabled = false, error = '', className = '', rows = 3 } = props;

    return (
        <StaffField className={className} label={label}>
            <textarea aria-invalid={!!error} disabled={disabled} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
            <FieldError error={error} />
        </StaffField>
    );
};

export const CatalogAdminSelectField: FC<FieldProps<string> & { options: { value: string; label: string }[] }> = (props) => {
    const { label, value, onChange, disabled = false, error = '', className = '', options } = props;

    return (
        <StaffField className={className} label={label}>
            <select aria-invalid={!!error} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <FieldError error={error} />
        </StaffField>
    );
};

export const CatalogAdminCheckbox: FC<FieldProps<boolean>> = ({ label, value, onChange, disabled = false }) => (
    <label className="octane-staff-row octane-catalog-admin-checkbox">
        <input checked={value} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
    </label>
);
