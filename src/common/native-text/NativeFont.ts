import { Air32NativeTextRenderer, layoutNativeText, layoutNormalText, prepareAir32NativeBundle, swfGlyphHasInk } from './Air32NativeTextRenderer';
import { NativeBundle, NativeFont, NativeRenderOptions } from './NativeTextTypes';

const fontAssets = {
    regular: new URL('../../assets/native-fonts/ubuntu_regular.json', import.meta.url).href,
    bold: new URL('../../assets/native-fonts/ubuntu_bold.json', import.meta.url).href,
    italic: new URL('../../assets/native-fonts/ubuntu_italic.json', import.meta.url).href,
    boldItalic: new URL('../../assets/native-fonts/ubuntu_bold_italic.json', import.meta.url).href,
    condensed: new URL('../../assets/native-fonts/ubuntu_condensed.json', import.meta.url).href,
    volter: new URL('../../assets/native-fonts/volter.json', import.meta.url).href,
    volterBold: new URL('../../assets/native-fonts/volterb.json', import.meta.url).href
};
type FontKey = keyof typeof fontAssets;
interface LoadedFont {
    font: NativeFont;
    renderer: Air32NativeTextRenderer;
}
const loadingFonts = new Map<FontKey, Promise<LoadedFont>>();

export interface NativeFontStyle {
    family: 'Ubuntu' | 'UbuntuCondensed' | 'Volter';
    size: number;
    bold?: boolean;
    italic?: boolean;
    color?: number;
    underline?: boolean;
    background?: number;
    etchingColor?: number;
    etchingPosition?: string;
    antiAliasType?: 'advanced' | 'normal';
    thickness?: number;
    sharpness?: number;
    kerning?: boolean;
    /** Pixels between glyphs. Non-zero text is drawn like the official client's canvas fallback (CanvasSpacedText); zero keeps the native glyph renderer. */
    letterSpacing?: number;
}

export async function loadNativeFont(style: NativeFontStyle): Promise<LoadedFont> {
    const key: FontKey =
        style.family === 'Volter'
            ? style.bold
                ? 'volterBold'
                : 'volter'
            : style.family === 'UbuntuCondensed'
              ? 'condensed'
              : style.bold
                ? style.italic
                    ? 'boldItalic'
                    : 'bold'
                : style.italic
                  ? 'italic'
                  : 'regular';
    if (!loadingFonts.has(key)) {
        const loading = fetch(fontAssets[key]).then(async (response) => {
            if (!response.ok) throw new Error(`Native font ${key}: HTTP ${response.status}`);
            const font = prepareAir32NativeBundle((await response.json()) as NativeBundle);
            return { font, renderer: new Air32NativeTextRenderer(font) };
        });
        loadingFonts.set(key, loading);
        loading.catch(() => loadingFonts.delete(key));
    }
    return loadingFonts.get(key);
}

export function supportsNativeText(font: NativeFont, text: string): boolean {
    for (let index = 0; index < text.length; index++) {
        const glyph = font.swfGlyphs.get(text.charCodeAt(index));
        if (!glyph || (swfGlyphHasInk(font, glyph, text.charCodeAt(index)) && !font.profile.glyphs.has(text.charCodeAt(index)))) return false;
    }
    return true;
}

export function measureNativeText(font: NativeFont, text: string, style: NativeFontStyle): number {
    const layout = style.antiAliasType === 'normal' ? layoutNormalText : layoutNativeText;
    return layout(font, text, style.size, style.kerning ?? true).textWidth;
}

/** v75 uses AIR glyph profiles, DefineFont3 advances and retained premultiplied pixels. */
export function renderNativeText(loaded: LoadedFont, text: string, style: NativeFontStyle) {
    const options: NativeRenderOptions = {
        size: style.size,
        color: style.color ?? 0,
        background: style.background ?? 0xffffff,
        fontStyle: style.italic ? 'italic' : 'normal',
        antiAliasType: style.antiAliasType ?? 'advanced',
        gridFitType: 'pixel',
        thickness: style.thickness ?? 0,
        sharpness: style.sharpness ?? 0,
        kerning: style.kerning ?? true,
        stageQuality: 'high',
        renderingPipeline: 'habbo-retained',
        textDecoration: style.underline ? 'underline' : null,
        etchingColor: style.etchingColor,
        etchingPosition: style.etchingPosition
    };
    const rendered = loaded.renderer.render(text, options);
    const pixels = new Uint8ClampedArray(style.background === undefined ? rendered.retainedPixels : rendered.pixels);
    for (let offset = 0; offset < pixels.length; offset += 4) {
        const alpha = pixels[offset + 3];
        if (alpha === 0 || alpha === 255) continue;
        for (let channel = 0; channel < 3; channel++) pixels[offset + channel] = Math.min(255, Math.round((pixels[offset + channel] * 255) / alpha));
    }
    return { ...rendered, pixels };
}
