import { FC } from 'react';

interface HousekeepingNumberInputProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    className?: string;
}

/** Whole-number input with its unit after it; anything that isn't a number reads as 0. */
export const HousekeepingNumberInput: FC<HousekeepingNumberInputProps> = ({ label, value, onChange, min = 1, max = undefined, className = '' }) => (
    <label className={`octane-housekeeping-number ${className}`}>
        <input
            aria-label={label}
            inputMode="numeric"
            max={max}
            min={min}
            step={1}
            type="number"
            value={value || ''}
            onChange={(event) => onChange(Math.trunc(Number(event.target.value)) || 0)}
        />
        <span className="octane-staff-muted">{label}</span>
    </label>
);
