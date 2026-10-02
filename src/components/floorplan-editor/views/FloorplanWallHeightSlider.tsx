import { FC, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AIR_FLOOR_ASSETS } from '../air/airAssets';
import { MAX_WALL_HEIGHT, MIN_WALL_HEIGHT } from '../state/constants';

type Props = {
    value: number;
    onChange: (next: number) => void;
    disabled?: boolean;
    official?: boolean;
};

const STEPS = 16;

/** Official wall_height_slider: horizontal, 16 steps shown as 1..16. */
export const FloorplanWallHeightSlider: FC<Props> = ({ value, onChange, disabled = false, official = false }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const valueFromClientX = useCallback((clientX: number): number | null => {
        const track = trackRef.current;
        if (!track) return null;
        const rect = track.getBoundingClientRect();
        if (rect.width === 0) return null;
        const local = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const index = Math.min(STEPS - 1, Math.floor(local * STEPS));
        return index + 1;
    }, []);

    const onPointerDown = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (disabled || e.button !== 0) return;
            const next = valueFromClientX(e.clientX);
            if (next !== null && next !== value) onChange(next);
            setIsDragging(true);
        },
        [disabled, valueFromClientX, onChange, value]
    );

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: PointerEvent) => {
            const next = valueFromClientX(e.clientX);
            if (next !== null && next !== value) onChange(next);
        };
        const onUp = () => setIsDragging(false);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [isDragging, valueFromClientX, onChange, value]);

    const clamped = Math.max(MIN_WALL_HEIGHT, Math.min(MAX_WALL_HEIGHT, value));
    const shown = clamped <= 0 ? 1 : clamped;
    const thumbLeft = official
        ? `${(shown - 1) * (111 / STEPS)}px`
        : `${(((shown - 1) / STEPS) * 100).toFixed(4)}%`;

    return (
        <div
            className={`fp-bc-wall-slider ${disabled ? 'is-disabled' : ''} ${isDragging ? 'is-dragging' : ''}`}
            role="slider"
            aria-label="Wall height"
            aria-valuemin={1}
            aria-valuemax={MAX_WALL_HEIGHT}
            aria-valuenow={shown}
            aria-disabled={disabled || undefined}
            aria-orientation="horizontal"
            title={`Wall height ${shown}`}
        >
            <div ref={trackRef} data-testid="wall-height-track" className="fp-bc-wall-slider-track" onPointerDown={onPointerDown} />
            <img
                data-testid="wall-height-thumb"
                data-value={clamped}
                className="fp-bc-wall-slider-thumb"
                src={AIR_FLOOR_ASSETS.sliderThumb}
                alt=""
                style={{ left: thumbLeft }}
            />
        </div>
    );
};
