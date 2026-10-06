import { FC, ReactNode } from 'react';

export interface WiredRadioOption {
    id: number;
    label: ReactNode;
    disabled?: boolean;
    /** Forces the option onto its own row, spanning the remaining columns. */
    newLine?: boolean;
}

export interface WiredRadioGroupProps {
    name: string;
    options: WiredRadioOption[];
    value: number;
    onChange: (id: number) => void;
    columns?: number;
}

/** RadioGroupPreset: 11x12 radio bitmaps with a 3px gap to the label, rows 4px apart (20px high, the last 16px). */
export const WiredRadioGroup: FC<WiredRadioGroupProps> = ({ name, options, value, onChange, columns = 1 }) => (
    <div className="octane-wired__options octane-wired__options--radio" style={{ gridTemplateColumns: `repeat(${columns}, round(down, calc((100% - ${(columns - 1) * 5}px) / ${columns}), 1px))` }}>
        {options.map((option, index) => (
            <label key={option.id} className={`octane-wired__option ${index === options.length - 1 ? 'is-last' : ''} ${option.disabled ? 'is-disabled' : ''}`} style={option.newLine ? { gridColumn: '1 / -1' } : undefined}>
                <input checked={value === option.id} disabled={option.disabled} name={name} type="radio" onChange={() => onChange(option.id)} />
                <span className="octane-wired__text">{option.label}</span>
            </label>
        ))}
    </div>
);

export interface WiredCheckboxOptionProps {
    label: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    last?: boolean;
}

/** CheckboxOptionPreset: 19x20 checkbox bitmap, label 2px lower, 4px of spacing below unless last. */
export const WiredCheckboxOption: FC<WiredCheckboxOptionProps> = ({ label, checked, onChange, disabled = false, last = false }) => (
    <label className={`octane-wired__option octane-wired__option--checkbox ${last ? 'is-last' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <input checked={checked} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        <span className="octane-wired__text">{label}</span>
    </label>
);

export const WiredCheckboxGroup: FC<{ children: ReactNode }> = ({ children }) => <div className="octane-wired__options octane-wired__options--checkbox">{children}</div>;
