import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { loadNativeFont, measureNativeText } from '../../common/native-text/NativeFont';
import { NativeText } from '../../common/native-text/NativeText';
import { NativeTextStyleName, nativeTextStyles } from '../../common/native-text/NativeTextStyles';

interface AchievementTextProps {
    text: string;
    /** Flat surface colour under the text. Omit to draw over a bitmap (white or black text only, see below). */
    background?: number;
    size?: number;
    bold?: boolean;
    underline?: boolean;
    color?: number;
    /** TextField rect (x, y, width) from the quest engine layout XML; the field's own 2px gutter is part of the raster. */
    x: number;
    y: number;
    width?: number;
    /** Field height from the layout XML: AIR clips the raster to the field. */
    height?: number;
    align?: 'left' | 'center' | 'right';
    /** auto_size="center" fields: the raster lands on floor((field - raster) / 2); CSS rounds a half pixel up. */
    floorCenter?: boolean;
    maxWidth?: number;
    /** Overrides the kerning of a `textStyle` entry (layout text fields without a kerning variable do not kern). */
    kerning?: boolean;
    /** A text_styles_css entry instead of the quest engine's explicit Ubuntu style (size and weight come from the entry). */
    textStyle?: NativeTextStyleName;
    /** Called with the raster height once it is drawn and whenever it changes (fields that grow with their text). */
    onHeight?: (height: number) => void;
    className?: string;
    style?: CSSProperties;
}

// NativeText composites its glyph alpha onto one opaque colour. Over a bitmap that would paint a flat box, so white text is
// rasterised on black and screen-blended (backdrop + a * (1 - backdrop)) and black text on white and multiply-blended
// (backdrop * (1 - a)); both equal an AIR alpha blend of the glyph over whatever is underneath. The blend only sees the
// backdrop when no ancestor between the text and that backdrop is isolated (no transform, opacity, filter or z-index).
// Quest engine text fields set font_face Ubuntu, sharpness 0, thickness 0 and kerning false
// instead of a text_styles_css entry, so the style is spelled out here.
export const AchievementText: FC<AchievementTextProps> = ({ text, background, size, bold, underline, color = 0x000000, x, y, width, height, align = 'left', floorCenter = false, maxWidth, textStyle, kerning, onHeight, className = '', style }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const wrapper = wrapperRef.current;

        if (!onHeight || !wrapper || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => onHeight(wrapper.offsetHeight));

        observer.observe(wrapper);

        return () => observer.disconnect();
    }, [onHeight]);

    const bitmap = background === undefined;
    const onBlack = color === 0xffffff;

    return (
        <div
            ref={wrapperRef}
            className={`air-achievement-text ${className}`.trim()}
            style={{ position: 'absolute', left: x, top: y, width, height, overflow: height === undefined ? undefined : 'hidden', textAlign: align, paddingRight: floorCenter ? 0.02 : undefined, whiteSpace: 'nowrap', pointerEvents: 'none', ...style }}
        >
            <NativeText
                background={bitmap ? (onBlack ? 0x000000 : 0xffffff) : background}
                maxWidth={maxWidth}
                overrides={
                    textStyle
                        ? { color, ...(size !== undefined && { size }), ...(bold !== undefined && { bold }), ...(underline !== undefined && { underline }), ...(kerning !== undefined && { kerning }) }
                        : { family: 'Ubuntu', size: size ?? 12, bold: bold ?? false, underline: underline ?? false, color, sharpness: 0, thickness: 0, kerning: false, antiAliasType: 'advanced' }
                }
                style={bitmap ? { mixBlendMode: onBlack ? 'screen' : 'multiply' } : undefined}
                text={text}
                textStyle={textStyle ?? 'u_regular'}
            />
        </div>
    );
};

// An AIR text field is floor(textWidth) + 1 + 4 wide, so a text that measures exactly N.0 is one pixel wider than the
// ceil(textWidth) + 4 raster NativeText draws. Fields laid out one after another need the AIR width.
export const useAirFieldWidth = (text: string, size = 12, bold = false, textStyle?: NativeTextStyleName): number | undefined => {
    const [width, setWidth] = useState<{ key: string; value: number }>(null);
    const key = `${textStyle ?? ''}:${size}:${bold}:${text}`;

    useEffect(() => {
        let disposed = false;
        const style = textStyle
            ? { ...nativeTextStyles[textStyle], size, bold }
            : { family: 'Ubuntu' as const, size, bold, sharpness: 0, thickness: 0, kerning: false, antiAliasType: 'advanced' as const };

        loadNativeFont(style)
            .then((loaded) => {
                if (!disposed) setWidth({ key, value: Math.floor(measureNativeText(loaded.font, text, style)) + 5 });
            })
            .catch(() => {});

        return () => {
            disposed = true;
        };
    }, [key, size, bold, text, textStyle]);

    return width?.key === key ? width.value : undefined;
};
