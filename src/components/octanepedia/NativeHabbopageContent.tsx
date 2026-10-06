import { CSSProperties, FC, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { compositeAir32RetainedToOpaque, resolveLineMetrics } from '../../common/native-text/Air32NativeTextRenderer';
import { loadNativeFont, measureNativeText, NativeFontStyle, supportsNativeText } from '../../common/native-text/NativeFont';
import { nativeTextStyles } from '../../common/native-text/NativeTextStyles';
import { SwfFont } from '../../common/native-text/NativeTextTypes';

const FIELD_GUTTER = 2;
const resolvePtLineMetrics = (font: SwfFont, size: number) => ({
    ascent: (font.metrics.ascent * size) / font.emSquare,
    descent: (font.metrics.descent * size) / font.emSquare
});
type TextRun = {
    text: string;
    style: NativeFontStyle;
    href?: string;
};

type DrawRun = TextRun & {
    x: number;
    y: number;
    width: number;
    height: number;
    loaded: Awaited<ReturnType<typeof loadNativeFont>>;
};

type NativeLayout = {
    drawRuns: DrawRun[];
    height: number;
    images: { src: string; alt: string; x: number; y: number; width: number; height: number }[];
    links: { href: string; label: string; x: number; y: number; width: number; height: number }[];
};

interface NativeHabbopageContentProps {
    fieldWidth: number;
    markup: string;
    onLinkClick: (href: string) => void;
}

const parseColor = (value: string) => {
    const color = value.trim();
    if (/^#[\da-f]{6}$/i.test(color)) return Number.parseInt(color.slice(1), 16);
    if (/^#[\da-f]{3}$/i.test(color)) return Number.parseInt(color.slice(1).replace(/(.)/g, '$1$1'), 16);
    return undefined;
};

const blockStyle = (tagName: string): NativeFontStyle => {
    const style = { ...nativeTextStyles.u_regular, color: 0x000000 };
    if (tagName === 'H1') return { ...style, size: 23, bold: true, color: 0xfc6204 };
    if (tagName === 'H2') return { ...style, size: 19, bold: true, color: 0xfc6204 };
    if (tagName === 'H3') return { ...style, size: 15, bold: true, color: 0xfc6204 };
    return style;
};

const appendRun = (runs: TextRun[], run: TextRun) => {
    if (!run.text) return;
    const previous = runs.at(-1);
    if (previous && previous.href === run.href && JSON.stringify(previous.style) === JSON.stringify(run.style)) previous.text += run.text;
    else runs.push(run);
};

const parseRuns = (element: Element, base: NativeFontStyle) => {
    const runs: TextRun[] = [];
    const visit = (node: Node, inherited: NativeFontStyle, href?: string) => {
        if (node.nodeType === Node.TEXT_NODE) {
            appendRun(runs, { text: node.textContent ?? '', style: inherited, href });
            return;
        }
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName === 'BR') {
            appendRun(runs, { text: '\n', style: inherited, href });
            return;
        }
        const style = { ...inherited };
        let link = href;
        if (node.matches('B, STRONG')) style.bold = true;
        if (node.matches('I, EM')) style.italic = true;
        if (node.matches('U')) style.underline = true;
        if (node.tagName === 'FONT') {
            const size = node.getAttribute('size');
            const color = parseColor(node.getAttribute('color') ?? '');
            if (size && /^\d+(?:px)?$/.test(size)) style.size = Number.parseInt(size, 10);
            else if (size === '-1') style.size = 10;
            if (color !== undefined) style.color = color;
        }
        if (node.tagName === 'A') {
            style.bold = true;
            style.underline = true;
            style.color = 0xfc6204;
            link = node.getAttribute('href') ?? undefined;
        }
        node.childNodes.forEach((child) => visit(child, style, link));
    };
    element.childNodes.forEach((node) => visit(node, base));
    return runs;
};

const isNativeBlock = (element: Element) =>
    element.matches('H1, H2, H3, P') &&
    !element.querySelector('img, div, span') &&
    ![element, ...Array.from(element.querySelectorAll('*'))].some((child) => child.getAttribute('style')?.trim()) &&
    Array.from(element.querySelectorAll('*')).every((child) => child.matches('A, B, BR, EM, FONT, I, STRONG, U'));

const loadImageSize = (src: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = reject;
        image.src = src;
    });

const layoutMarkup = async (markup: string, fieldWidth: number): Promise<NativeLayout | null> => {
    const document = new DOMParser().parseFromString(`<div>${markup}</div>`, 'text/html');
    const root = document.body.firstElementChild;
    if (!root) return null;

    const drawRuns: DrawRun[] = [];
    const images: NativeLayout['images'] = [];
    const links: NativeLayout['links'] = [];
    const regularStyle = blockStyle('P');
    const regularLoaded = await loadNativeFont(regularStyle);
    const regularMetrics = resolvePtLineMetrics(regularLoaded.font.swfFont, regularStyle.size);
    const spacerMetrics = resolvePtLineMetrics(regularLoaded.font.swfFont, 1);
    const regularLineHeight = regularMetrics.ascent + regularMetrics.descent;
    const spacerLineHeight = spacerMetrics.ascent + spacerMetrics.descent;
    let y = 0;
    let float: { side: 'left' | 'right'; width: number; bottom: number } | null = null;

    for (const node of Array.from(root.childNodes)) {
        if (!(node instanceof HTMLElement)) {
            if (node.textContent?.trim()) return null;
            continue;
        }
        if (node.matches('SPAN.padding-top, SPAN.padding-bottom')) {
            y += spacerLineHeight + (node.classList.contains('padding-top') ? 10 : 5);
            continue;
        }
        if (node.tagName === 'BR') {
            y += regularLineHeight;
            continue;
        }
        if (node.tagName === 'FONT' && !node.textContent?.trim()) continue;
        if (node.tagName === 'IMG') {
            const src = node.getAttribute('src');
            if (!src) return null;
            const natural = await loadImageSize(src);
            const authoredWidth = Number.parseInt(node.getAttribute('width') ?? '', 10);
            const authoredHeight = Number.parseInt(node.getAttribute('height') ?? '', 10);
            const width = authoredWidth || Math.round((natural.width * authoredHeight) / natural.height) || natural.width;
            const height = authoredHeight || Math.round((natural.height * authoredWidth) / natural.width) || natural.height;
            const hspace = Number.parseInt(node.getAttribute('hspace') ?? '0', 10) || 0;
            const vspace = Number.parseInt(node.getAttribute('vspace') ?? '0', 10) || 0;
            const align = node.getAttribute('align');
            const x = align === 'right' ? fieldWidth - width - hspace : hspace;
            const imageY = y + vspace;
            images.push({ src, alt: node.getAttribute('alt') ?? '', x, y: imageY, width, height });
            if (align === 'left' || align === 'right') float = { side: align, width: width + hspace * 2, bottom: imageY + height + vspace };
            else y = imageY + height + vspace;
            continue;
        }
        if (!isNativeBlock(node)) return null;

        const base = blockStyle(node.tagName);
        const runs = parseRuns(node, base);
        const loadedRuns = await Promise.all(runs.map(async (run) => ({ ...run, loaded: await loadNativeFont(run.style) })));
        if (loadedRuns.some((run) => !supportsNativeText(run.loaded.font, run.text.replace(/[\r\n]/g, '')))) return null;
        const baseLoaded = loadedRuns[0]?.loaded ?? (await loadNativeFont(base));

        if (float && y >= float.bottom) float = null;
        const floatLeft = float?.side === 'left' ? float.width : 0;
        const floatRight = float?.side === 'right' ? float.width : 0;
        const indent = (node.classList.contains('bullet-item') ? 7 : 0) + floatLeft;
        const firstIndent = node.classList.contains('bullet-item') ? floatLeft : indent;
        const lineLimit = fieldWidth - FIELD_GUTTER * 2 - floatRight;
        const lines: (typeof loadedRuns)[] = [[]];
        const widths = [firstIndent];
        const push = (run: (typeof loadedRuns)[number], text: string) => {
            if (!text) return;
            const line = lines.at(-1);
            const previous = line.at(-1);
            if (previous && previous.href === run.href && JSON.stringify(previous.style) === JSON.stringify(run.style)) previous.text += text;
            else line.push({ ...run, text });
            widths[widths.length - 1] += measureNativeText(run.loaded.font, text, run.style);
        };
        const newLine = () => {
            lines.push([]);
            widths.push(indent);
        };

        for (const run of loadedRuns) {
            for (const token of run.text.split(/(\r\n|[\r\n]|[^\S\r\n]+)/).filter(Boolean)) {
                if (/^(?:\r\n|[\r\n])$/.test(token)) {
                    newLine();
                    continue;
                }
                let remaining = token;
                while (remaining) {
                    const available = lineLimit - widths.at(-1);
                    if (measureNativeText(run.loaded.font, remaining, run.style) <= available) {
                        push(run, remaining);
                        break;
                    }
                    if (widths.at(-1) > indent) {
                        newLine();
                        if (/^\s+$/.test(remaining)) break;
                        continue;
                    }
                    let lower = 1;
                    let upper = remaining.length;
                    while (lower < upper) {
                        const middle = Math.floor((lower + upper + 1) / 2);
                        if (measureNativeText(run.loaded.font, remaining.slice(0, middle), run.style) <= lineLimit - indent) lower = middle;
                        else upper = middle - 1;
                    }
                    push(run, remaining.slice(0, lower));
                    remaining = remaining.slice(lower);
                    if (remaining) newLine();
                }
            }
        }

        const metrics = loadedRuns.length
            ? loadedRuns.map((run) => resolveLineMetrics(run.loaded.font.swfFont, run.style.size, false))
            : [resolveLineMetrics(baseLoaded.font.swfFont, base.size, false)];
        const lineAscent = Math.max(...metrics.map((value) => value.ascent));
        const lineDescent = Math.max(...metrics.map((value) => value.descent));
        const lineHeight = lineAscent + lineDescent;
        lines.forEach((line, lineIndex) => {
            let runX = lineIndex === 0 ? firstIndent : indent;
            for (const run of line) {
                const width = measureNativeText(run.loaded.font, run.text, run.style);
                const renderMetrics = resolveLineMetrics(run.loaded.font.swfFont, run.style.size, false);
                const lineTop = y + lineIndex * lineHeight;
                const drawRun = {
                    ...run,
                    x: FIELD_GUTTER + runX,
                    y: Math.round(lineTop + lineAscent + 2) - renderMetrics.baseline,
                    width,
                    height: renderMetrics.textHeight
                };
                drawRuns.push(drawRun);
                if (run.href && run.text.trim()) links.push({ href: run.href, label: run.text.trim(), x: drawRun.x, y: drawRun.y, width, height: lineHeight });
                runX += width;
            }
        });
        y += Math.max(1, lines.length) * lineHeight;
    }

    return { drawRuns, images, height: Math.ceil(Math.max(y, float?.bottom ?? 0)) + FIELD_GUTTER * 2, links };
};

export const NativeHabbopageContent: FC<NativeHabbopageContentProps> = ({ fieldWidth, markup, onLinkClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [layout, setLayout] = useState<NativeLayout>(null);

    useEffect(() => {
        let disposed = false;
        setLayout(null);
        layoutMarkup(markup, fieldWidth)
            .then((next) => {
                if (disposed || !next || !canvasRef.current) return;
                const pixels = new Uint8ClampedArray(fieldWidth * next.height * 4);
                next.drawRuns.forEach((run) => {
                    run.loaded.renderer.render(run.text, {
                        size: run.style.size,
                        color: run.style.color ?? 0,
                        antiAliasType: run.style.antiAliasType ?? 'advanced',
                        gridFitType: 'pixel',
                        thickness: run.style.thickness ?? 0,
                        sharpness: run.style.sharpness ?? 0,
                        kerning: run.style.kerning ?? true,
                        fontStyle: run.style.italic ? 'italic' : 'normal',
                        stageQuality: 'high',
                        renderingPipeline: 'habbo-retained',
                        textDecoration: run.style.underline ? 'underline' : null,
                        target: {
                            pixels,
                            width: fieldWidth,
                            height: next.height,
                            offsetX: Math.round(run.x),
                            offsetY: Math.round(run.y)
                        }
                    });
                });
                const canvas = canvasRef.current;
                canvas.width = fieldWidth;
                canvas.height = next.height;
                const composited = compositeAir32RetainedToOpaque(pixels, [255, 255, 255, 255]);
                canvas.getContext('2d').putImageData(new ImageData(composited, fieldWidth, next.height), 0, 0);
                setLayout(next);
            })
            .catch(() => {
                if (!disposed) setLayout(null);
            });
        return () => {
            disposed = true;
        };
    }, [fieldWidth, markup]);

    const activateLink = (href: string, event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onLinkClick(href);
    };
    const accessibleText = useMemo(() => new DOMParser().parseFromString(markup, 'text/html').body.textContent ?? '', [markup]);

    return (
        <div className="octanepedia__native-page" data-native-habbopage={layout ? 'rendered' : 'fallback'} style={{ width: fieldWidth }}>
            <canvas ref={canvasRef} aria-hidden="true" style={{ display: layout ? 'block' : 'none' }} />
            {layout?.images.map((image, index) => (
                <img
                    alt={image.alt}
                    height={image.height}
                    key={`${image.src}-${index}`}
                    src={image.src}
                    style={{ position: 'absolute', left: image.x, top: image.y }}
                    width={image.width}
                />
            ))}
            {layout?.links.map((link, index) => (
                <a
                    aria-label={link.label}
                    className="octanepedia__native-link"
                    href={link.href}
                    key={`${link.href}-${index}`}
                    onClick={(event) => activateLink(link.href, event)}
                    style={{ left: link.x, top: link.y, width: link.width, height: link.height } as CSSProperties}
                />
            ))}
            {layout ? <span className="octanepedia__accessible-copy">{accessibleText}</span> : <div dangerouslySetInnerHTML={{ __html: markup }} />}
        </div>
    );
};
