import { FC, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { airHeightHex } from '../air/airHeightColor';
import { AIR_FLOOR_ASSETS } from '../air/airAssets';
import { OFFICIAL_LEVELS } from '../official/officialFloorPlan';

type Props = {
    selectedH: number;
    onSelect: (h: number) => void;
};

/** Official tile_height_colormap: horizontal HSL ramp, thumb is the avatar-editor download icon. */
export const FloorplanHeightPicker: FC<Props> = ({ selectedH, onSelect }) => {
    const count = OFFICIAL_LEVELS;
    const maxHeight = OFFICIAL_LEVELS;
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const gradient = useMemo(() => {
        const stops: string[] = [];
        for (let i = 0; i < count; i++) {
            const fill = airHeightHex(i);
            const startPct = (i / count) * 100;
            const endPct = ((i + 1) / count) * 100;
            stops.push(`${fill} ${startPct.toFixed(2)}%`);
            stops.push(`${fill} ${endPct.toFixed(2)}%`);
        }
        return `linear-gradient(to right, ${stops.join(', ')})`;
    }, [count]);

    const heightFromClientX = useCallback(
        (clientX: number): number | null => {
            const track = trackRef.current;
            if (!track) return null;
            const rect = track.getBoundingClientRect();
            if (rect.width === 0) return null;
            const local = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

            return Math.max(0, Math.min(maxHeight, Math.floor(local * count)));
        },
        [count, maxHeight]
    );

    const onPointerDown = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.button !== 0) return;
            const next = heightFromClientX(e.clientX);
            if (next !== null && next !== selectedH) onSelect(next);
            setIsDragging(true);
        },
        [heightFromClientX, onSelect, selectedH]
    );

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: PointerEvent) => {
            const next = heightFromClientX(e.clientX);
            if (next !== null && next !== selectedH) onSelect(next);
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
    }, [isDragging, heightFromClientX, onSelect, selectedH]);

    const clamped = Math.max(0, Math.min(maxHeight, selectedH));
    const thumbPct = (clamped / Math.max(1, count)) * 100;
    const thumbColor = airHeightHex(clamped);

    return (
        <div
            className={`fp-bc-colormap ${isDragging ? 'is-dragging' : ''}`}
            role="slider"
            aria-label="Brush height"
            aria-valuemin={0}
            aria-valuemax={maxHeight}
            aria-valuenow={clamped}
            aria-orientation="horizontal"
            title={`Brush height ${clamped}`}
        >
            <div ref={trackRef} data-testid="height-track" className="fp-bc-colormap-track" style={{ background: gradient }} onPointerDown={onPointerDown} />
            <img
                data-testid="height-thumb"
                data-value={clamped}
                data-thumb-color={thumbColor}
                className="fp-bc-colormap-thumb"
                src={AIR_FLOOR_ASSETS.sliderThumb}
                alt=""
                style={{ left: `${thumbPct.toFixed(4)}%` }}
            />
        </div>
    );
};
