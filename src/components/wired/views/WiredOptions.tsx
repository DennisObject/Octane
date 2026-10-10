import { FC, ReactNode } from 'react';
import { LocalizeText } from '../../../api';
import { Text } from '../../../common';
import { useWiredNative } from './WiredNativeContext';
import { WiredSection } from './WiredSection';
import { WiredText } from './WiredText';

const optionLabel = (label: ReactNode) => (typeof label === 'string' ? <WiredText wrap={true} text={label} /> : <span className="octane-wired__text">{label}</span>);

export interface WiredRadioOption {
    id: number;
    label: ReactNode;
    disabled?: boolean;
    /** Forces the option onto its own row, spanning the remaining columns. */
    newLine?: boolean;
    /** RadioButtonParam's attached preset, drawn under the option (optionExtraUnderSpacing/LeftMargin). */
    extra?: ReactNode;
}

export interface WiredRadioGroupProps {
    name: string;
    options: WiredRadioOption[];
    value: number;
    onChange: (id: number) => void;
    columns?: number;
}

/** RadioGroupPreset: 11x12 radio bitmaps with a 3px gap to the label, rows 4px apart (20px high, the last 16px). */
export const WiredRadioGroup: FC<WiredRadioGroupProps> = ({ name, options, value, onChange, columns = 1 }) =>
{
    // The Illumina bitmaps belong to the Illumina frame; the other frames keep their own plain radio rows.
    if (!useWiredNative())
    {
        return (
            <div className="flex flex-col gap-1">
                {options.map((option) => (
                    <div key={option.id} className="flex flex-col gap-1">
                        <label className="flex gap-1">
                            <input checked={value === option.id} className="form-check-input" disabled={option.disabled} name={name} type="radio" onChange={() => onChange(option.id)} />
                            <Text>{option.label}</Text>
                        </label>
                        {option.extra}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="octane-wired__options octane-wired__options--radio" style={{ gridTemplateColumns: `repeat(${columns}, round(down, calc((100% - ${(columns - 1) * 5}px) / ${columns}), 1px))` }}>
            {options.map((option, index) => (
                <div key={option.id} className="octane-wired__option-cell" style={option.newLine ? { gridColumn: '1 / -1' } : undefined}>
                    <label className={`octane-wired__option ${index === options.length - 1 ? 'is-last' : ''} ${option.disabled ? 'is-disabled' : ''}`}>
                        <input checked={value === option.id} disabled={option.disabled} name={name} type="radio" onChange={() => onChange(option.id)} />
                        {optionLabel(option.label)}
                    </label>
                    {option.extra && <div className="octane-wired__option-extra">{option.extra}</div>}
                </div>
            ))}
        </div>
    );
};

export interface WiredCheckboxOptionProps {
    label: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    last?: boolean;
}

/** CheckboxOptionPreset: 19x20 checkbox bitmap, label 2px lower, 4px of spacing below unless last. */
export const WiredCheckboxOption: FC<WiredCheckboxOptionProps> = ({ label, checked, onChange, disabled = false, last = false }) =>
{
    if (!useWiredNative())
    {
        return (
            <label className="flex gap-1">
                <input checked={checked} className="form-check-input" disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
                <Text>{label}</Text>
            </label>
        );
    }

    return (
        <label className={`octane-wired__option octane-wired__option--checkbox ${last ? 'is-last' : ''} ${disabled ? 'is-disabled' : ''}`}>
            <input checked={checked} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
            {optionLabel(label)}
        </label>
    );
};

export const WiredCheckboxGroup: FC<{ children: ReactNode }> = ({ children }) => (useWiredNative() ? <div className="octane-wired__options octane-wired__options--checkbox">{children}</div> : <div className="flex flex-col gap-1">{children}</div>);

export interface WiredQuantifierSectionProps {
    name: string;
    /** class_2908 quantifier type: users for the actor conditions, furni for the furni conditions. */
    kind: 'users' | 'furni';
    negative?: boolean;
    value: number;
    onChange: (id: number) => void;
}

/** The advanced quantifier section (createAdvancedSections): "wiredfurni.params.quantifier.<kind>[.neg].<id>" options. */
export const WiredQuantifierSection: FC<WiredQuantifierSectionProps> = ({ name, kind, negative = false, value, onChange }) => (
    <WiredSection title={LocalizeText('wiredfurni.params.quantifier_selection')}>
        <WiredRadioGroup
            name={name}
            options={[0, 1].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.quantifier.${kind}${negative ? '.neg' : ''}.${id}`) }))}
            value={value}
            onChange={onChange}
        />
    </WiredSection>
);
