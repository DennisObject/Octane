import { FC, useMemo, useState } from 'react';
import { LocalizeText } from '../../../api';

const MAX_MATCHES = 12;

interface FurniEditorInteractionPickerViewProps {
    id: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
}

// A text field with a filtered list underneath: typing narrows the registered
// types, Enter takes the first match, Escape closes the list (and only the
// list, not the window). The stored value is kept as typed even when nothing
// matches, so an unregistered type stays visible.
export const FurniEditorInteractionPickerView: FC<FurniEditorInteractionPickerViewProps> = ({ id, value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState<string | null>(null);
    const shown = query ?? value;
    const needle = shown.trim().toLowerCase();

    const matches = useMemo(() => (needle ? options.filter((type) => type.toLowerCase().includes(needle)) : options).slice(0, MAX_MATCHES), [options, needle]);

    const pick = (type: string) => {
        onChange(type);
        setQuery(null);
        setIsOpen(false);
    };

    return (
        <div className="volt-furni-editor-picker">
            <input
                aria-autocomplete="list"
                aria-controls={`${id}-list`}
                aria-expanded={isOpen}
                id={id}
                placeholder={LocalizeText('furni.editor.interaction.none')}
                role="combobox"
                spellCheck={false}
                type="text"
                value={shown}
                onBlur={() => {
                    if (query !== null) onChange(query.trim());

                    setQuery(null);
                    setIsOpen(false);
                }}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={(event) => {
                    if (!isOpen) return;

                    if (event.key === 'Enter' && matches.length) {
                        event.preventDefault();
                        pick(matches[0]);
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        setQuery(null);
                        setIsOpen(false);
                    }
                }}
            />
            {isOpen && (
                <ul className="volt-staff-list volt-furni-editor-picker-list" id={`${id}-list`} role="listbox">
                    {!needle && (
                        <li
                            aria-selected={value === ''}
                            className={`volt-staff-list-row is-interactive volt-staff-muted ${value === '' ? 'is-selected' : ''}`}
                            role="option"
                            onClick={() => pick('')}
                            onMouseDown={(event) => event.preventDefault()}
                        >
                            {LocalizeText('furni.editor.interaction.none_default')}
                        </li>
                    )}
                    {matches.map((type) => (
                        <li
                            key={type}
                            aria-selected={type === value}
                            className={`volt-staff-list-row is-interactive ${type === value ? 'is-selected' : ''}`}
                            role="option"
                            onClick={() => pick(type)}
                            onMouseDown={(event) => event.preventDefault()}
                        >
                            {type}
                        </li>
                    ))}
                    {needle && matches.length === 0 && (
                        <li className="volt-staff-list-row volt-furni-editor-warning">{LocalizeText('furni.editor.interaction.no_match')}</li>
                    )}
                </ul>
            )}
        </div>
    );
};
