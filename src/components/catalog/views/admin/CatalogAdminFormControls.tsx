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

export const CatalogAdminTextField: FC<FieldProps<string> & { placeholder?: string; inputRef?: Ref<HTMLInputElement> }> = (props) => {
    const { label, value, onChange, disabled = false, error = '', className = '', placeholder = '', inputRef = null } = props;

    return (
        <StaffField className={className} label={label}>
            <input
                ref={inputRef}
                aria-invalid={!!error}
                disabled={disabled}
                placeholder={placeholder}
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <FieldError error={error} />
        </StaffField>
    );
};

export const CatalogAdminNumberField: FC<FieldProps<number> & { min?: number; fallback?: number; readOnly?: boolean }> = (props) => {
    const { label, value, onChange, disabled = false, error = '', className = '', min, fallback = 0, readOnly = false } = props;

    return (
        <StaffField className={className} label={label}>
            <input
                aria-invalid={!!error}
                disabled={disabled}
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
    const { label, value, onChange, disabled = false, className = '', rows = 3 } = props;

    return (
        <StaffField className={className} label={label}>
            <textarea disabled={disabled} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
        </StaffField>
    );
};

export const CatalogAdminSelectField: FC<FieldProps<string> & { options: { value: string; label: string }[] }> = (props) => {
    const { label, value, onChange, disabled = false, className = '', options } = props;

    return (
        <StaffField className={className} label={label}>
            <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </StaffField>
    );
};

export const CatalogAdminCheckbox: FC<FieldProps<boolean>> = ({ label, value, onChange, disabled = false }) => (
    <label className="octane-staff-row octane-catalog-admin-checkbox">
        <input checked={value} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
    </label>
);
