import { FC, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from '../../../../common/native-text/NativeText';

interface RoomPromoteTextProps {
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    bold?: boolean;
    underline?: boolean;
    size?: number;
    /** TextFormat.letterSpacing of the field (iro_event_info header_txt: -0.4). */
    spacing?: number;
    wrap?: boolean;
    /** auto_size right: the field's right edge stays at x + width. */
    alignRight?: boolean;
    /** auto_size center: the field is centred on x + width, however wide the glyphs are. */
    alignCenter?: boolean;
    className?: string;
    onClick?: () => void;
}

/** One white v75 TextField of iro_event_info: glyphs drawn onto the translucent panel (screen blend over a black raster), at the field's layout rectangle. */
export const RoomPromoteText: FC<RoomPromoteTextProps> = ({ text, x, y, width, height, bold = false, underline = false, size = 12, spacing = 0, wrap = false, alignRight = false, alignCenter = false, className = '', onClick }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [centerShift, setCenterShift] = useState(0);
    // The window re-centres a field whenever its width changes (WindowController.setRectangle, ON_RESIZE_ALIGN_CENTER): it moves by
    // trunc((remainder - widthChange) / 2) and carries the odd half pixel to the next change, so the position depends on the earlier widths.
    const centering = useRef({ width: width ?? 0, shift: 0, remainder: 0 });

    useLayoutEffect(() => {
        const field = textRef.current?.firstElementChild;

        if (!alignCenter || width === undefined || !field) return;

        const settle = () => {
            // Only the drawn raster counts; the DOM fallback while it is being drawn is not the field's width.
            if (field.getAttribute('data-native-text') === 'fallback') return;

            const state = centering.current;
            const next = Math.round(field.getBoundingClientRect().width);

            if (next !== state.width) {
                const combined = state.remainder - (next - state.width);
                const step = Math.trunc(combined / 2);

                state.shift += step;
                state.remainder = combined - step * 2;
                state.width = next;
            }

            setCenterShift(state.shift);
        };
        const observer = new ResizeObserver(settle);

        settle();
        observer.observe(field);

        return () => observer.disconnect();
    }, [alignCenter, width, text]);

    return (
        <div
            ref={textRef}
            className={`octane-event-info__text${height === undefined ? '' : ' is-clipped'} ${className}`}
            style={{ left: x + (alignCenter ? centerShift : 0), top: y, width: wrap || alignRight ? width : undefined, textAlign: alignRight ? 'right' : undefined, height: height === undefined ? undefined : height - 2, mixBlendMode: 'screen' }}
            onClick={onClick}
        >
            <NativeText
                background={0x000000}
                maxWidth={wrap ? width : undefined}
                overrides={{ size, bold, underline, color: 0xffffff, sharpness: 0, thickness: 0, letterSpacing: spacing }}
                text={text}
                textStyle="u_regular"
            />
        </div>
    );
};
