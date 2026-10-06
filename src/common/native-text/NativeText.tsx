import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { compositeAir32RetainedToOpaque, resolveLineMetrics } from './Air32NativeTextRenderer';
import { loadNativeFont, measureNativeText, NativeFontStyle, supportsNativeText } from './NativeFont';
import { NativeTextStyleName, nativeTextStyles } from './NativeTextStyles';

interface NativeTextProps {
    text: string;
    textStyle: NativeTextStyleName;
    /** Native retained glyphs are composited against the actual surface colour. */
    background: number;
    maxWidth?: number;
    leading?: number;
    overrides?: Partial<NativeFontStyle>;
    className?: string;
    style?: CSSProperties;
}

// TextField.wrapText preserves whitespace and splits a long token only when a
// whole empty line cannot hold it. Widths come from DefineFont3, never DOM text.
function wrapNativeParagraph(text: string, width: number, measure: (text: string) => number): string[] {
    if (!text) return [''];
    const lines: string[] = [];
    let line = '';
    const fitCharacters = (prefix: string, suffix: string) => {
        let lower = 0,
            upper = suffix.length;
        while (lower < upper) {
            const middle = Math.floor((lower + upper + 1) / 2);
            if (measure(prefix + suffix.slice(0, middle)) <= width) lower = middle;
            else upper = middle - 1;
        }
        return lower;
    };
    for (const token of text.split(/(\s+)/).filter(Boolean)) {
        let remaining = token;
        while (remaining) {
            if (measure(line + remaining) <= width) {
                line += remaining;
                break;
            }
            if (line) {
                if (/^\s+$/.test(token)) {
                    const count = fitCharacters(line, remaining);
                    line += remaining.slice(0, count);
                    remaining = remaining.slice(count);
                }
                lines.push(line);
                line = '';
                continue;
            }
            const count = Math.max(1, fitCharacters('', remaining));
            lines.push(remaining.slice(0, count));
            remaining = remaining.slice(count);
        }
    }
    if (line || !lines.length) lines.push(line);
    return lines;
}

/** A v75 TextField raster, retaining its 2px gutter and accessible DOM text. */
export const NativeText: FC<NativeTextProps> = ({ text, textStyle, background, maxWidth, leading = 0, overrides, className, style }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState<{ width: number; height: number }>(null);
    const fontStyle = { ...nativeTextStyles[textStyle], ...overrides, background };
    const styleKey = JSON.stringify(fontStyle);

    useEffect(() => {
        let disposed = false;
        setSize(null);
        const render = async () => {
            // Bound work before tokenisation or native layout. Oversized messages
            // retain the existing DOM text rather than being truncated.
            if (text.length > 8192 || !Number.isInteger(fontStyle.size) || fontStyle.size < 1 || fontStyle.size > 256) return;
            const loaded = await loadNativeFont(fontStyle);
            if (disposed || !supportsNativeText(loaded.font, text.replace(/[\r\n]/g, ''))) return;
            const measure = (value: string) => measureNativeText(loaded.font, value, fontStyle);
            const width = maxWidth === undefined ? Infinity : Math.max(1, maxWidth - 4);
            const lines = text.split(/\r\n|\r|\n/).flatMap((paragraph) => wrapNativeParagraph(paragraph, width, measure));
            const metrics = resolveLineMetrics(loaded.font.swfFont, fontStyle.size, fontStyle.antiAliasType === 'normal');
            const lineHeight = metrics.textHeight + leading;
            let textWidth = 0;
            for (const line of lines) textWidth = Math.max(textWidth, measure(line));
            const fieldWidth = Math.ceil(textWidth) + 4;
            const fieldHeight = Math.ceil(lines.length * lineHeight) + 4;
            // Keep the native text fallback for unsupported or excessively large fields.
            if (fieldWidth * fieldHeight > 2 * 1024 * 1024) return;
            const pixels = new Uint8ClampedArray(fieldWidth * fieldHeight * 4);
            lines.forEach((line, index) =>
                loaded.renderer.render(line, {
                    size: fontStyle.size,
                    color: fontStyle.color ?? 0,
                    antiAliasType: fontStyle.antiAliasType ?? 'advanced',
                    gridFitType: 'pixel',
                    thickness: fontStyle.thickness ?? 0,
                    sharpness: fontStyle.sharpness ?? 0,
                    kerning: fontStyle.kerning ?? true,
                    fontStyle: fontStyle.italic ? 'italic' : 'normal',
                    stageQuality: 'high',
                    renderingPipeline: 'habbo-retained',
                    etchingColor: fontStyle.etchingColor,
                    etchingPosition: fontStyle.etchingPosition,
                    textDecoration: fontStyle.underline ? 'underline' : null,
                    // Each line gets a local surface view: the native renderer's
                    // etching pass is relative to that surface, not target.offsetY.
                    target: {
                        pixels: pixels.subarray(Math.round(index * lineHeight) * fieldWidth * 4),
                        width: fieldWidth,
                        height: fieldHeight - Math.round(index * lineHeight)
                    }
                })
            );
            if (disposed || !canvasRef.current) return;
            const canvas = canvasRef.current;
            canvas.width = fieldWidth;
            canvas.height = fieldHeight;
            const composited = compositeAir32RetainedToOpaque(pixels, [(background >>> 16) & 255, (background >>> 8) & 255, background & 255, 255]);
            canvas.getContext('2d').putImageData(new ImageData(composited, fieldWidth, fieldHeight), 0, 0);
            setSize({ width: fieldWidth, height: fieldHeight });
        };
        render().catch((error) => {
            if (!disposed) console.warn('Native text rendering failed', error);
        });
        return () => {
            disposed = true;
        };
    }, [text, textStyle, styleKey, maxWidth, leading]);

    return (
        <span
            className={className}
            data-native-text={size ? textStyle : 'fallback'}
            style={{ display: 'inline-block', verticalAlign: 'top', position: 'relative', ...size, ...style }}
        >
            <canvas ref={canvasRef} aria-hidden="true" style={{ display: size ? 'block' : 'none', imageRendering: 'pixelated' }} />
            <span
                style={
                    size
                        ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'pre' }
                        : { lineHeight: 'normal', whiteSpace: 'pre-wrap' }
                }
            >
                {text}
            </span>
        </span>
    );
};
