import { createContext, FC, useContext, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from '../../../common/native-text/NativeText';
import { useWiredNative } from './WiredNativeContext';

/** IlluminaWiredStyle.frameColor; the advanced settings wrapper paints advancedBackgroundColor (0xCCCCCC). */
export const WIRED_SURFACE_COLOR = 0xe2e2e2;
export const WIRED_ADVANCED_SURFACE_COLOR = 0xcccccc;
/** IlluminaWiredStyle.softTextColor. */
export const WIRED_SOFT_TEXT_COLOR = 0x444444;

export const WiredSurfaceContext = createContext(WIRED_SURFACE_COLOR);

export interface WiredTextProps {
    text: string;
    bold?: boolean;
    soft?: boolean;
    underline?: boolean;
    /** TextParam wrap mode: lines break at the width the layout gives the text field. */
    wrap?: boolean;
    className?: string;
}

/** The il_regular text_view / text_bold_view of wired_style_illumina, drawn by the native glyph renderer. */
export const WiredText: FC<WiredTextProps> = ({ text, bold = false, soft = false, underline = false, wrap = false, className = '' }) =>
{
    const isNative = useWiredNative();
    const background = useContext(WiredSurfaceContext);
    const boxRef = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState<number>(undefined);

    useLayoutEffect(() =>
    {
        if (!isNative || !wrap || !boxRef.current) return;

        const element = boxRef.current;
        const observer = new ResizeObserver(() => setWidth(Math.floor(element.getBoundingClientRect().width)));

        observer.observe(element);
        setWidth(Math.floor(element.getBoundingClientRect().width));

        return () => observer.disconnect();
    }, [isNative, wrap]);

    // Only the Illumina frame draws il_regular; the other styles keep their own text.
    if (!isNative)
        return (
            <span
                className={`octane-wired__text ${bold ? 'octane-wired__text--bold' : ''} ${soft ? 'octane-wired__text--soft' : ''} ${wrap ? 'octane-wired__text--wrap' : ''} ${className}`}
                style={underline ? { textDecoration: 'underline' } : undefined}
            >
                {text}
            </span>
        );

    const native = (
        <NativeText
            className={wrap ? '' : `octane-wired__native-text ${className}`}
            background={background}
            maxWidth={wrap ? width : undefined}
            overrides={{ bold, underline, ...(soft ? { color: WIRED_SOFT_TEXT_COLOR } : null) }}
            text={text}
            textStyle="il_regular"
        />
    );

    if (!wrap) return native;

    return (
        <span ref={boxRef} className={`octane-wired__native-text octane-wired__native-text--wrap ${className}`}>
            {width !== undefined && native}
        </span>
    );
};
