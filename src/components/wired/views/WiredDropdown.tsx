import { FC } from 'react';
import { useWiredNative } from './WiredNativeContext';
import { WiredSurfaceContext, WiredText } from './WiredText';

export interface WiredDropdownOption {
    id: number;
    label: string;
}

export interface WiredDropdownProps {
    options: WiredDropdownOption[];
    /** -1 shows the caption, like an ExpandableDropdown without a selection. */
    value: number;
    caption?: string;
    disabled?: boolean;
    onChange: (id: number) => void;
}

/** DropdownPreset: the Illumina dropmenu frame (22px) with the selected option or the caption as its text. */
export const WiredDropdown: FC<WiredDropdownProps> = ({ options, value, caption = '', disabled = false, onChange }) =>
{
    const isNative = useWiredNative();
    const selected = options.find((option) => option.id === value) ?? null;

    if (!isNative)
        return (
            <select className="form-select form-select-sm" aria-label={caption} disabled={disabled} value={selected ? value : -1} onChange={(event) => onChange(parseInt(event.target.value))}>
                {!selected && <option value={-1}>{caption}</option>}
                {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
        );

    return (
        <div className={`octane-wired__dropdown ${disabled ? 'is-disabled' : ''}`}>
            <WiredSurfaceContext.Provider value={0xffffff}>
                <WiredText className="octane-wired__dropdown-label" text={selected ? selected.label : caption} />
            </WiredSurfaceContext.Provider>
            <select aria-label={caption} disabled={disabled} value={selected ? value : -1} onChange={(event) => onChange(parseInt(event.target.value))}>
                {!selected && <option value={-1}>{caption}</option>}
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};
