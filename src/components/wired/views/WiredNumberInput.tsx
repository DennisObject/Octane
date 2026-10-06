import { ChangeEvent, FC, useEffect, useRef, useState } from 'react';
import { localizeWithFallback } from '../../../api';

export interface WiredNumberInputProps {
    value: number;
    min: number;
    max: number;
    precision?: number;
    endsWithFive?: boolean;
    /** Width of the text field; the surrounding border adds 8px like NumberInputParam. */
    width?: number;
    disabled?: boolean;
    onChange: (value: number) => void;
}

const MIN_INT = -2147483648;
const MAX_INT = 2147483647;

const displayValue = (value: number, precision: number): string => {
    let text = `${value}`;

    if (precision > 0) {
        const negative = text.startsWith('-');
        if (negative) text = text.slice(1);
        while (text.length < precision + 1) text = `0${text}`;
        text = `${text.slice(0, text.length - precision)}.${text.slice(text.length - precision)}`;
        while (text.endsWith('0')) text = text.slice(0, -1);
        if (text.endsWith('.')) text = text.slice(0, -1);
        if (negative) text = `-${text}`;
    }

    if (precision < 0) text += '0'.repeat(-precision);

    return text;
};

const parseDisplayValue = (text: string, precision: number, endsWithFive: boolean, min: number): number => {
    if (text === '' || (text === '-' && min < 0)) return NaN;

    const last = text.charAt(text.length - 1);
    if (precision === 0 && endsWithFive && last !== '0' && last !== '5') return NaN;

    let normalized = text.replace(',', '.');

    if (precision > 0) {
        if (normalized.endsWith('.')) normalized = normalized.slice(0, -1);
        if (!/^-?([0-9]*[.])?[0-9]+$/.test(normalized)) return NaN;

        for (let i = 0; i < precision; i++) {
            const dot = normalized.indexOf('.');
            if (dot === -1) normalized += '0';
            else {
                const chars = normalized.split('');
                [chars[dot], chars[dot + 1]] = [chars[dot + 1], chars[dot]];
                normalized = chars.join('');
                if (normalized.endsWith('.')) normalized = normalized.slice(0, -1);
            }
        }
    } else if (precision < 0) {
        for (let i = 0; i > precision; i--) {
            if (normalized === '0' || normalized === '-0' || normalized === '') break;
            if (!normalized.endsWith('0')) return NaN;
            normalized = normalized.slice(0, -1);
        }
    }

    const tail = normalized.charAt(normalized.length - 1);
    if (endsWithFive && tail !== '0' && tail !== '5') return NaN;

    return /^-?\d+$/.test(normalized) ? parseInt(normalized, 10) : NaN;
};

const rangeMessage = (min: number, max: number, precision: number): string => {
    const hasMin = min !== MIN_INT;
    const hasMax = max !== MAX_INT;
    const shown = (value: number) => displayValue(value, precision);

    const fill = (message: string) => message.replace('%min%', shown(min)).replace('%max%', shown(max));

    if (hasMin && hasMax) return fill(localizeWithFallback('wiredfurni.params.number_input.between', 'Number needs to be between %min% and %max%', ['min', 'max'], [shown(min), shown(max)]));
    if (hasMin) return fill(localizeWithFallback('wiredfurni.params.number_input.min', 'Number needs to be %min% or higher', ['min'], [shown(min)]));
    if (hasMax) return fill(localizeWithFallback('wiredfurni.params.number_input.max', 'Number needs to be %max% or lower', ['max'], [shown(max)]));

    return localizeWithFallback('wiredfurni.params.number_input.invalid', 'Number is invalid');
};

/** NumberInputPreset: the typed text drives the value, bad input only tints the field until it is valid again. */
export const WiredNumberInput: FC<WiredNumberInputProps> = ({ value, min, max, precision = 0, endsWithFive = false, width = 40, disabled = false, onChange }) => {
    const scale = endsWithFive ? 5 : 1;
    const [text, setText] = useState(() => displayValue(value * scale, precision));
    const [error, setError] = useState<string | null>(null);
    const validValue = useRef(value);

    useEffect(() => {
        if (value === validValue.current) return;

        validValue.current = value;
        setText(displayValue(value * scale, precision));
        setError(null);
    }, [value, scale, precision]);

    const onTextChange = (event: ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value;
        setText(next);

        const parsed = parseDisplayValue(next, precision, endsWithFive, min);
        if (Number.isNaN(parsed)) return setError(localizeWithFallback('wiredfurni.params.number_input.invalid', 'Number is invalid'));

        if (parsed < min * scale || parsed > max * scale) return setError(rangeMessage(min * scale, max * scale, precision));

        setError(null);
        validValue.current = endsWithFive ? parsed / 5 : parsed;
        onChange(validValue.current);
    };

    return (
        <div className={`octane-wired__number-input ${error ? 'is-invalid' : ''}`} style={{ width: width + 8 }} title={error ?? undefined}>
            <input
                className="octane-wired__number-input-field"
                disabled={disabled}
                spellCheck={false}
                style={{ width }}
                type="text"
                value={text}
                onChange={onTextChange}
            />
        </div>
    );
};
