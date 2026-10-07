import { CSSProperties, FC, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from '../../../common/native-text/NativeText';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';

export const FLOORPLAN_PANEL_COLOR = 0xe9e9e1;
export const FLOORPLAN_BOX_COLOR = 0xbdbdb5;

interface FloorplanNativeTextProps {
    text: string;
    textStyle?: NativeTextStyleName;
    background?: number;
    maxWidth?: number;
    color?: number;
    size?: number;
    underline?: boolean;
    className?: string;
    style?: CSSProperties;
}

// v75 TextField raster (HabboWindowManagerCom text_styles_css) over the flat colour of the window part it sits on.
export const FloorplanNativeText: FC<FloorplanNativeTextProps> = ({ text, textStyle = 'u_regular', background = FLOORPLAN_PANEL_COLOR, maxWidth, color, size, underline, className, style }) => {
    const overrides = { ...(color === undefined ? {} : { color }), ...(size === undefined ? {} : { size }), ...(underline === undefined ? {} : { underline }) };

    return <NativeText className={className} text={text} textStyle={textStyle} background={background} maxWidth={maxWidth} overrides={overrides} style={style} />;
};

// auto_size="center": the TextField sits at floor((width - fieldWidth) / 2) inside its window, never on a half pixel.
// Without an explicit width the field follows the width of the element that holds it, so a resized window keeps the title centred.
export const FloorplanCenteredText: FC<FloorplanNativeTextProps & { width?: number }> = ({ width, ...props }) => {
    const fieldRef = useRef<HTMLSpanElement>(null);
    const [left, setLeft] = useState(0);

    useLayoutEffect(() => {
        const field = fieldRef.current;
        const holder = field?.parentElement;

        if (!field || !holder) return;

        const place = () => setLeft(Math.floor(((width ?? holder.clientWidth) - field.offsetWidth) / 2));
        const observer = new ResizeObserver(place);

        place();
        observer.observe(field);
        if (width === undefined) observer.observe(holder);

        return () => observer.disconnect();
    }, [width]);

    return (
        <span ref={fieldRef} style={{ display: 'inline-block', position: 'relative', left }}>
            <FloorplanNativeText {...props} />
        </span>
    );
};
