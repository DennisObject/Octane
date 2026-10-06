import { ChangeEvent, FC } from 'react';

interface AirSettingsVolumeRowProps {
    id: string;
    top: number;
    label: string;
    muteLabel: string;
    maximumLabel: string;
    value: number;
    onChange: (value: number) => void;
}

// Slider and mute/maximum changes update local sound; the parent persists volumes when the window closes.
export const AirSettingsVolumeRow: FC<AirSettingsVolumeRowProps> = ({ id, top, label, muteLabel, maximumLabel, value, onChange }) => {
    const changeValue = (event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.currentTarget.value));

    return (
        <div className={`air-settings-volume-row${value === 0 ? ' is-muted' : ''}`} style={{ top }}>
            <label className="air-settings-volume-row__label" htmlFor={id}>
                {label}
            </label>
            <button
                aria-label={`${label}: ${muteLabel}`}
                className="air-settings-volume-row__speaker air-settings-volume-row__speaker--off"
                onClick={() => onChange(0)}
                type="button"
            />
            <div className="air-settings-volume-row__slider">
                <input
                    aria-label={label}
                    id={id}
                    max="100"
                    min="0"
                    step="1"
                    type="range"
                    value={value}
                    onChange={changeValue}
                />
            </div>
            <button
                aria-label={`${label}: ${maximumLabel}`}
                className="air-settings-volume-row__speaker air-settings-volume-row__speaker--on"
                onClick={() => onChange(100)}
                type="button"
            />
        </div>
    );
};
