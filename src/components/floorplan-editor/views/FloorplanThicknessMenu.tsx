import { FC, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { LocalizeText } from '../../../api';
import { THICKNESS_NAMES } from '../state/constants';
import { ThicknessLevel } from '../state/types';


type Props = {
    value: ThicknessLevel;
    onChange: (next: ThicknessLevel) => void;
    testId: string;
    labelKeyPrefix: string;
};

/** AIR dropmenu style 3: its expanded list replaces the closed control at the same point. */
export const FloorplanThicknessMenu: FC<Props> = ({ value, onChange, testId, labelKeyPrefix }) => {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState<ThicknessLevel>(value);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const id = useId();
    const labels = THICKNESS_NAMES.map(name => LocalizeText(`${labelKeyPrefix}.${name}`));

    useEffect(() => {
        if (!open) return;

        const onOutside = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };

        document.addEventListener('pointerdown', onOutside);
        return () => document.removeEventListener('pointerdown', onOutside);
    }, [open]);

    const show = () => {
        setHighlight(value);
        setOpen(true);
    };

    const choose = (next: ThicknessLevel) => {
        onChange(next);
        setOpen(false);
        buttonRef.current?.focus({ preventScroll: true });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Tab') {
            setOpen(false);
            return;
        }

        if (event.key === 'Escape') {
            setOpen(false);
        } else if (event.key === 'Enter' || event.key === ' ') {
            if (open) choose(highlight);
            else show();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!open) show();
            else setHighlight(Math.max(0, Math.min(3, highlight + (event.key === 'ArrowDown' ? 1 : -1))) as ThicknessLevel);
        } else if (event.key === 'Home' || event.key === 'End') {
            setOpen(true);
            setHighlight(event.key === 'Home' ? 0 : 3);
        } else return;

        event.preventDefault();
    };

    return (
        <div ref={rootRef} className={`fp-bc-thickness-menu ${open ? 'is-open' : ''}`} data-menu={testId}>
            <button
                ref={buttonRef}
                type="button"
                className="fp-bc-drop"
                data-testid={testId}
                data-value={value}
                role="combobox"
                aria-label={testId}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={`${id}-list`}
                aria-activedescendant={open ? `${id}-${highlight}` : undefined}
                onPointerDown={event => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    buttonRef.current?.focus({ preventScroll: true });
                    if (open) setOpen(false);
                    else show();
                }}
                onKeyDown={onKeyDown}
            >
                <span>{labels[value]}</span>
            </button>
            {open && (
                <div id={`${id}-list`} role="listbox" aria-label={testId} className="fp-bc-drop-list">
                    {labels.map((label, index) => (
                        <button
                            key={THICKNESS_NAMES[index]}
                            id={`${id}-${index}`}
                            type="button"
                            role="option"
                            aria-selected={index === value}
                            tabIndex={-1}
                            className={`fp-bc-drop-item ${index === highlight ? 'is-highlighted' : ''}`}
                            onPointerEnter={() => setHighlight(index as ThicknessLevel)}
                            onPointerDown={event => {
                                if (event.button !== 0) return;
                                event.preventDefault();
                                choose(index as ThicknessLevel);
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
