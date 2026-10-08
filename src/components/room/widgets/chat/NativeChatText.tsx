import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { compositeAir32RetainedToOpaque, resolveLineMetrics } from '../../../../common/native-text/Air32NativeTextRenderer';
import { loadNativeFont, measureNativeText, NativeFontStyle, supportsNativeText } from '../../../../common/native-text/NativeFont';
import { useNativeTextScale } from '../../../../common/native-text/NativeTextScale';
import { nativeTextStyles } from '../../../../common/native-text/NativeTextStyles';

type ChatRun = {
    text: string;
    style: NativeFontStyle;
};

interface NativeChatTextProps {
    username?: string;
    html: string;
    type: number;
    anonymous: boolean;
    maxWidth: number;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLSpanElement>;
}

const CHAT_COLORS: Record<string, number> = {
    black: 0x000000,
    blue: 0x0000ff,
    brown: 0xa52a2a,
    cyan: 0x00ffff,
    gold: 0xffd700,
    gray: 0x808080,
    green: 0x008000,
    grey: 0x808080,
    indigo: 0x4b0082,
    lime: 0x00ff00,
    magenta: 0xff00ff,
    maroon: 0x800000,
    navy: 0x000080,
    olive: 0x808000,
    orange: 0xffa500,
    pink: 0xffc0cb,
    purple: 0x800080,
    red: 0xff0000,
    silver: 0xc0c0c0,
    teal: 0x008080,
    violet: 0xee82ee,
    white: 0xffffff,
    yellow: 0xffff00
};

const parseColor = (value: string): number | undefined => {
    const color = value.trim().toLowerCase();
    if (CHAT_COLORS[color] !== undefined) return CHAT_COLORS[color];
    if (/^#[0-9a-f]{3}$/i.test(color)) return Number.parseInt(color.slice(1).replace(/(.)/g, '$1$1'), 16);
    if (/^#[0-9a-f]{6}$/i.test(color)) return Number.parseInt(color.slice(1), 16);
    const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) return (Math.min(255, Number(rgb[1])) << 16) | (Math.min(255, Number(rgb[2])) << 8) | Math.min(255, Number(rgb[3]));
    return undefined;
};

const sameStyle = (left: NativeFontStyle, right: NativeFontStyle) => JSON.stringify(left) === JSON.stringify(right);

const appendRun = (runs: ChatRun[], text: string, style: NativeFontStyle) => {
    if (!text) return;
    const previous = runs.at(-1);
    if (previous && sameStyle(previous.style, style)) previous.text += text;
    else runs.push({ text, style });
};

const parseMessageRuns = (html: string, baseStyle: NativeFontStyle): ChatRun[] => {
    const document = new DOMParser().parseFromString(`<span>${html}</span>`, 'text/html');
    const runs: ChatRun[] = [];
    const visit = (node: Node, inherited: NativeFontStyle) => {
        if (node.nodeType === Node.TEXT_NODE) {
            appendRun(runs, node.textContent ?? '', inherited);
            return;
        }
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName === 'BR') {
            appendRun(runs, '\n', inherited);
            return;
        }
        const style = { ...inherited };
        if (node.matches('B, STRONG')) style.bold = true;
        if (node.matches('I, EM')) style.italic = true;
        if (node.matches('U')) style.underline = true;
        const color = parseColor(node.style.color);
        if (color !== undefined) style.color = color;
        node.childNodes.forEach((child) => visit(child, style));
    };
    document.body.firstElementChild?.childNodes.forEach((node) => visit(node, baseStyle));
    return runs;
};

/** One native TextField-equivalent canvas for the name and every formatted message run. */
export const NativeChatText: FC<NativeChatTextProps> = ({ username, html, type, anonymous, maxWidth, className, onClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState<{ width: number; height: number }>(null);
    const scale = useNativeTextScale();
    const runs = useMemo(() => {
        const messageStyle = {
            ...nativeTextStyles[type === 1 ? 'u_chat_whisper' : type === 2 ? 'u_chat_shout' : 'u_chat_speak'],
            color: type === 1 ? 0x595959 : 0x000000
        };
        const parsed = parseMessageRuns(html, messageStyle);
        if (!anonymous && username) {
            const nameStyle = type === 1 ? nativeTextStyles.u_chat_name_whisper : nativeTextStyles.u_chat_name;
            parsed.unshift({ text: `${username}: `, style: { ...nameStyle, color: type === 1 ? 0x595959 : 0x000000 } });
        }
        return parsed;
    }, [anonymous, html, type, username]);

    useEffect(() => {
        let disposed = false;
        setSize(null);
        const render = async () => {
            if (!runs.length) return;
            if (runs.reduce((length, run) => length + run.text.length, 0) > 8192) return;
            const loadedRuns = await Promise.all(runs.map(async (run) => ({ ...run, loaded: await loadNativeFont(run.style) })));
            if (disposed || loadedRuns.some(({ loaded, text }) => !supportsNativeText(loaded.font, text.replace(/\n/g, '')))) return;

            const lines: (typeof loadedRuns)[] = [[]];
            const widths: number[] = [0];
            const pushText = (run: (typeof loadedRuns)[number], text: string) => {
                if (!text) return;
                const line = lines.at(-1);
                const previous = line.at(-1);
                if (previous && sameStyle(previous.style, run.style)) previous.text += text;
                else line.push({ ...run, text });
                widths[widths.length - 1] += measureNativeText(run.loaded.font, text, run.style);
            };
            const newLine = () => {
                lines.push([]);
                widths.push(0);
            };

            for (const run of loadedRuns) {
                for (const token of run.text.split(/(\r\n|[\r\n]|[^\S\r\n]+)/).filter(Boolean)) {
                    if (/^(?:\r\n|[\r\n])$/.test(token)) {
                        newLine();
                        continue;
                    }
                    let remaining = token;
                    while (remaining) {
                        const available = maxWidth - widths.at(-1);
                        const tokenWidth = measureNativeText(run.loaded.font, remaining, run.style);
                        if (tokenWidth <= available) {
                            pushText(run, remaining);
                            break;
                        }
                        if (widths.at(-1) > 0 && /^\s+$/.test(remaining)) {
                            let count = 0;
                            while (
                                count < remaining.length &&
                                measureNativeText(run.loaded.font, remaining.slice(0, count + 1), run.style) <= available
                            ) {
                                count++;
                            }
                            pushText(run, remaining.slice(0, count));
                            remaining = remaining.slice(count);
                            newLine();
                            continue;
                        }
                        if (widths.at(-1) > 0) {
                            newLine();
                            continue;
                        }
                        let lower = 1;
                        let upper = remaining.length;
                        while (lower < upper) {
                            const middle = Math.floor((lower + upper + 1) / 2);
                            if (measureNativeText(run.loaded.font, remaining.slice(0, middle), run.style) <= maxWidth) lower = middle;
                            else upper = middle - 1;
                        }
                        pushText(run, remaining.slice(0, lower));
                        remaining = remaining.slice(lower);
                        if (remaining) newLine();
                    }
                }
            }

            const metrics = resolveLineMetrics(loadedRuns[0]?.loaded.font.swfFont, 12, false);
            const lineHeight = metrics.textHeight + 1;
            const fieldWidth = Math.ceil(Math.max(0, ...widths)) + 4;
            const fieldHeight = Math.ceil(lines.length * lineHeight) + 4;
            if (fieldWidth * fieldHeight > 2 * 1024 * 1024) return;
            // Line breaks follow the 1x layout; the raster is drawn at the display scale (see NativeTextScale),
            // with runs placed by their width at that size so a bold name never runs into the message.
            const scaledWidth = (run: (typeof loadedRuns)[number], text: string) => measureNativeText(run.loaded.font, text, { ...run.style, size: 12 * scale });
            const pixelWidth = Math.max(fieldWidth * scale, ...lines.map((line) => Math.ceil(line.reduce((width, run) => width + scaledWidth(run, run.text), 0)) + 4 * scale));
            const pixelHeight = fieldHeight * scale;
            const pixels = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);
            lines.forEach((line, lineIndex) => {
                let x = 0;
                line.forEach((run) => {
                    run.loaded.renderer.render(run.text, {
                        size: 12 * scale,
                        color: run.style.color ?? 0,
                        antiAliasType: 'advanced',
                        gridFitType: 'pixel',
                        thickness: -15,
                        sharpness: 80,
                        kerning: true,
                        fontStyle: run.style.italic ? 'italic' : 'normal',
                        stageQuality: 'high',
                        renderingPipeline: 'habbo-retained',
                        textDecoration: run.style.underline ? 'underline' : null,
                        target: {
                            pixels,
                            width: pixelWidth,
                            height: pixelHeight,
                            offsetX: Math.round(x),
                            offsetY: Math.round(lineIndex * lineHeight) * scale
                        }
                    });
                    x += scaledWidth(run, run.text);
                });
            });
            if (disposed || !canvasRef.current) return;
            const canvas = canvasRef.current;
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
            canvas.style.width = `${pixelWidth / scale}px`;
            canvas.style.height = `${fieldHeight}px`;
            canvas.style.imageRendering = scale > 1 ? 'auto' : '';
            const composited = compositeAir32RetainedToOpaque(pixels, [219, 219, 219, 255]);
            canvas.getContext('2d').putImageData(new ImageData(composited, pixelWidth, pixelHeight), 0, 0);
            setSize({ width: pixelWidth / scale, height: fieldHeight });
        };
        if (runs.length) render().catch((error) => !disposed && console.warn('Native chat text rendering failed', error));
        return () => {
            disposed = true;
        };
    }, [maxWidth, runs, scale]);

    return (
        <span className={`native-chat-text ${className ?? ''}`} data-native-chat-text={size ? 'rendered' : 'fallback'} style={size}>
            <canvas ref={canvasRef} aria-hidden="true" />
            <span className="native-chat-text-accessible" onClick={onClick}>
                {!anonymous && username && <b>{username}: </b>}
                <span dangerouslySetInnerHTML={{ __html: html }} />
            </span>
        </span>
    );
};
