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
    wrap?: boolean;
    /** auto_size right: the field's right edge stays at x + width. */
    alignRight?: boolean;
    /** auto_size center: the field is centred on x + width, however wide the glyphs are. */
    alignCenter?: boolean;
    className?: string;
    onClick?: () => void;
}

/** One white v75 TextField of iro_event_info: glyphs drawn onto the translucent panel (screen blend over a black raster), at the field's layout rectangle. */
export const RoomPromoteText: FC<RoomPromoteTextProps> = ({ text, x, y, width, height, bold = false, underline = false, size = 12, wrap = false, alignRight = false, alignCenter = false, className = '', onClick }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [centerOffset, setCenterOffset] = useState(0);

    // auto_size center puts the field at floor((width - fieldWidth) / 2).
    useLayoutEffect(() => {
        const field = textRef.current?.firstElementChild;

        if (!alignCenter || width === undefined || !field) return;

        const center = () => setCenterOffset(Math.floor((width - field.getBoundingClientRect().width) / 2));
        const observer = new ResizeObserver(center);

        center();
        observer.observe(field);

        return () => observer.disconnect();
    }, [alignCenter, width, text]);

    return (
        <div
            ref={textRef}
            className={`octane-event-info__text${height === undefined ? '' : ' is-clipped'} ${className}`}
            style={{ left: x + (alignCenter ? centerOffset : 0), top: y, width: wrap || alignRight ? width : undefined, textAlign: alignRight ? 'right' : undefined, height: height === undefined ? undefined : height - 2, mixBlendMode: 'screen' }}
            onClick={onClick}
        >
            <NativeText
                background={0x000000}
                maxWidth={wrap ? width : undefined}
                overrides={{ size, bold, underline, color: 0xffffff, sharpness: 0, thickness: 0 }}
                text={text}
                textStyle="u_regular"
            />
        </div>
    );
};
