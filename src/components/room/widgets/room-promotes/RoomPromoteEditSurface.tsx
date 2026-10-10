import { FC, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { renderFrame3WithShadow } from '../../../../common/card/NativeFrameShadow';
import { NativeText, NativeTextRaster } from '../../../../common/native-text/NativeText';

export type RoomPromoteFieldFill = 'white' | 'yellow';

/** What the surface painted for one field: the text, the fill under it and whether the raster fitted the native field. */
export interface RoomPromoteFieldReceipt {
    text: string;
    fill: RoomPromoteFieldFill;
    fits: boolean;
}

export interface RoomPromoteEditSurfaceState {
    /** The surface is on screen; the DOM visuals and the CSS shadow give way to it in the same commit. */
    drawn: boolean;
    name: RoomPromoteFieldReceipt | null;
    description: RoomPromoteFieldReceipt | null;
}

interface RoomPromoteEditSurfaceProps {
    caption: string;
    /** Left of the caption inside the header box (the view's AIR field-width rule); the surface waits until it is known. */
    captionLeft: number | undefined;
    nameLabel: string;
    descriptionLabel: string;
    name: string;
    description: string;
    hasNameError: boolean;
    focusedField: 'name' | 'description' | null;
    onStateChange: (state: RoomPromoteEditSurfaceState) => void;
}

// iro_event_settings: a 241x191 frame; positions are card-relative CSS pixels taken from RoomWidgets.css (header box at 6,6; client box at 11,33; fields addressed inside it).
const WIDTH = 241;
const HEIGHT = 191;
const HEADER_INSET = 6;
const CAPTION_Y = HEADER_INSET + 3;
const LABEL_X = 11;
const NAME_LABEL_Y = 33 + 4;
const DESCRIPTION_LABEL_Y = 33 + 40;
const NAME_FIELD = { x: 11, y: 33 + 20, width: 217, height: 15, multiline: false };
const DESCRIPTION_FIELD = { x: 11, y: 33 + 56, width: 217, height: 88, multiline: true };
const CLOSE = { x: HEADER_INSET + 229 - 3 - 19, y: HEADER_INSET + 2 };
const YELLOW = '#ffe91b';
const MAX_DEVICE_AREA = 4 * 1024 * 1024;
const CLOSE_URLS = {
    default: new URL('../../../../assets/images/habbo-skin/slices/close-3-default.png', import.meta.url).href,
    hover: new URL('../../../../assets/images/habbo-skin/slices/close-3-hover.png', import.meta.url).href,
    pressed: new URL('../../../../assets/images/habbo-skin/slices/close-3-pressed.png', import.meta.url).href
};

type CloseState = keyof typeof CLOSE_URLS;
type SourceKey = 'caption' | 'nameLabel' | 'descriptionLabel' | 'nameWhite' | 'nameYellow' | 'descriptionWhite';

const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) =>
    {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('bitmap failed to load'));
        image.src = url;
    });

const createCanvas = (width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null =>
{
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });

    return context ? [canvas, context] : null;
};

const sameState = (a: RoomPromoteEditSurfaceState, b: RoomPromoteEditSurfaceState) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The Edit Promo window painted the way the native client shows it at a fractional device pixel ratio: one 1x composite (frame, native shadow, caption,
 * labels, field boxes with their text rasters, close button) that the native stage then enlarges as a whole with bilinear sampling. The browser would
 * snap each DOM layer to whole device pixels instead, so the composite is enlarged here, in the same bilinear mapping the native stage uses, into a device
 * aligned canvas placed from the card's measured viewport position (a draggable window moves by transform; every move re-measures and re-bakes).
 * Mounted only at a fractional ratio. The inputs stay DOM elements: the surface paints boxes and rasters from committed props only, and reports per field
 * what it painted (text, fill, fit) so a field hides its own browser text only while the surface really shows that text.
 */
export const RoomPromoteEditSurface: FC<RoomPromoteEditSurfaceProps> = (props) =>
{
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const latest = useRef(props);
    const engine = useRef<{ repaint: (sync: boolean, force?: boolean) => void; setRaster: (key: SourceKey) => (raster: NativeTextRaster | null) => void } | null>(null);
    const rasterHandlers = useMemo(
        () => ({
            caption: (raster: NativeTextRaster | null) => engine.current?.setRaster('caption')(raster),
            nameLabel: (raster: NativeTextRaster | null) => engine.current?.setRaster('nameLabel')(raster),
            descriptionLabel: (raster: NativeTextRaster | null) => engine.current?.setRaster('descriptionLabel')(raster),
            nameWhite: (raster: NativeTextRaster | null) => engine.current?.setRaster('nameWhite')(raster),
            nameYellow: (raster: NativeTextRaster | null) => engine.current?.setRaster('nameYellow')(raster),
            descriptionWhite: (raster: NativeTextRaster | null) => engine.current?.setRaster('descriptionWhite')(raster)
        }),
        []
    );

    useEffect(() =>
    {
        const canvas = canvasRef.current;
        const card = canvas?.parentElement;
        const wrapper = canvas?.closest<HTMLElement>('.draggable-window') ?? null;

        if (!canvas || !card) return;

        const rasters = new Map<SourceKey, NativeTextRaster>();
        let disposed = false;
        let closeState: CloseState = 'default';
        let hover = false;
        let pressed = false;
        let frame: Awaited<ReturnType<typeof renderFrame3WithShadow>> = null;
        let closeImages: Record<CloseState, HTMLImageElement> | null = null;
        let composite: { canvas: HTMLCanvasElement; left: number; top: number; premultiplied: Float32Array } | null = null;
        let state: RoomPromoteEditSurfaceState = { drawn: false, name: null, description: null };

        const commit = (next: RoomPromoteEditSurfaceState, sync: boolean) =>
        {
            if (sameState(state, next)) return;

            state = next;

            // Outside React's own commit the change is flushed at once, so the DOM visuals and the surface swap in one paint.
            if (sync) flushSync(() => latest.current.onStateChange(next));
            else latest.current.onStateChange(next);
        };

        const hide = (sync: boolean) =>
        {
            canvas.style.visibility = 'hidden';
            composite = null;
            commit({ drawn: false, name: null, description: null }, sync);
        };

        const raster = (key: SourceKey, text: string, background: number) =>
        {
            const found = rasters.get(key);

            return found && found.text === text && found.background === background && found.canvas.width > 0 ? found : null;
        };

        const paintField = (context: CanvasRenderingContext2D, field: typeof NAME_FIELD, value: string, fill: RoomPromoteFieldFill, focused: boolean, key: SourceKey): RoomPromoteFieldReceipt | null =>
        {
            context.fillStyle = '#000';
            context.fillRect(field.x, field.y, field.width, field.height);
            context.fillStyle = fill === 'yellow' ? YELLOW : '#fff';
            context.fillRect(field.x + 1, field.y + 1, field.width - 2, field.height - 2);

            if (focused) return null;
            if (value.length === 0) return { text: '', fill, fits: true };

            const source = raster(key, value, fill === 'yellow' ? 0xffe91b : 0xffffff);

            if (!source) return null;

            // The v75 field clips its text bitmap to the 215px interior, ending 2px above the field's bottom edge; a raster that does not fit stays the browser's text.
            const fits = source.canvas.width <= 215 && (!field.multiline || source.canvas.height <= field.height - 2);

            if (fits)
            {
                context.save();
                context.beginPath();
                context.rect(field.x + 1, field.y + 1, 215, field.height - 3);
                context.clip();
                context.drawImage(source.canvas, field.x, field.y);
                context.restore();
            }

            return { text: value, fill, fits };
        };

        const compose = (): { receipts: Pick<RoomPromoteEditSurfaceState, 'name' | 'description'> } | null =>
        {
            const p = latest.current;
            const caption = raster('caption', p.caption, 0x377998);
            const nameLabel = raster('nameLabel', p.nameLabel, 0xe9e9e1);
            const descriptionLabel = raster('descriptionLabel', p.descriptionLabel, 0xe9e9e1);

            if (!frame || !closeImages || p.captionLeft === undefined || !caption || !nameLabel || !descriptionLabel) return null;

            const surface = createCanvas(WIDTH, HEIGHT);
            const sheet = createCanvas(frame.sprite.width, frame.sprite.height);

            if (!surface || !sheet) return null;

            const [windowCanvas, context] = surface;
            const [sheetCanvas, sheetContext] = sheet;

            context.drawImage(frame.frame, 0, 0);
            context.drawImage(caption.canvas, HEADER_INSET + p.captionLeft, CAPTION_Y);
            context.drawImage(nameLabel.canvas, LABEL_X, NAME_LABEL_Y);
            context.drawImage(descriptionLabel.canvas, LABEL_X, DESCRIPTION_LABEL_Y);

            const nameFill: RoomPromoteFieldFill = p.hasNameError ? 'yellow' : 'white';
            const receipts = {
                name: paintField(context, NAME_FIELD, p.name, nameFill, p.focusedField === 'name', nameFill === 'yellow' ? 'nameYellow' : 'nameWhite'),
                description: paintField(context, DESCRIPTION_FIELD, p.description, 'white', p.focusedField === 'description', 'descriptionWhite')
            };

            context.drawImage(closeImages[closeState], CLOSE.x, CLOSE.y);

            // One composite, as the native stage holds it: the shadow sprite (with the frame drawn into it), then the window over it.
            sheetContext.drawImage(frame.sprite, 0, 0);
            sheetContext.drawImage(windowCanvas, frame.left, frame.top);

            const pixels = sheetContext.getImageData(0, 0, sheetCanvas.width, sheetCanvas.height).data;
            const premultiplied = new Float32Array(pixels.length);

            for (let index = 0; index < pixels.length; index += 4)
            {
                const alpha = pixels[index + 3] / 255;

                premultiplied[index] = pixels[index] * alpha;
                premultiplied[index + 1] = pixels[index + 1] * alpha;
                premultiplied[index + 2] = pixels[index + 2] * alpha;
                premultiplied[index + 3] = pixels[index + 3];
            }

            composite = { canvas: sheetCanvas, left: frame.left, top: frame.top, premultiplied };

            return { receipts };
        };

        // The native stage scales a resolution-1 bitmap with bilinear sampling, centre-based, from the stage origin. The same mapping is evaluated here for the
        // device pixels the composite covers, from the card's viewport position, and drawn 1:1 at a device-aligned origin.
        const bake = (): boolean =>
        {
            if (!composite) return false;

            const ratio = window.devicePixelRatio;

            if (!Number.isFinite(ratio) || ratio <= 1 || ratio > 4 || Number.isInteger(ratio)) return false;

            const rect = card.getBoundingClientRect();
            const originX = rect.left - composite.left;
            const originY = rect.top - composite.top;
            const sourceWidth = composite.canvas.width;
            const sourceHeight = composite.canvas.height;
            const deviceX0 = Math.floor(originX * ratio);
            const deviceY0 = Math.floor(originY * ratio);
            const width = Math.ceil((originX + sourceWidth) * ratio) - deviceX0;
            const height = Math.ceil((originY + sourceHeight) * ratio) - deviceY0;

            if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width * height > MAX_DEVICE_AREA) return false;

            const output = new ImageData(width, height);
            const source = composite.premultiplied;
            const columnBase = new Int32Array(width);
            const columnWeight = new Float32Array(width);

            for (let column = 0; column < width; column++)
            {
                const position = (deviceX0 + column + 0.5) / ratio - 0.5 - originX;
                const base = Math.floor(position);

                columnBase[column] = base;
                columnWeight[column] = position - base;
            }

            for (let line = 0; line < height; line++)
            {
                const position = (deviceY0 + line + 0.5) / ratio - 0.5 - originY;
                const y0 = Math.floor(position);
                const wy = position - y0;
                const row0 = y0 >= 0 && y0 < sourceHeight;
                const row1 = y0 + 1 >= 0 && y0 + 1 < sourceHeight;

                for (let column = 0; column < width; column++)
                {
                    const x0 = columnBase[column];
                    const wx = columnWeight[column];
                    const col0 = x0 >= 0 && x0 < sourceWidth;
                    const col1 = x0 + 1 >= 0 && x0 + 1 < sourceWidth;
                    const w00 = row0 && col0 ? (1 - wx) * (1 - wy) : 0;
                    const w10 = row0 && col1 ? wx * (1 - wy) : 0;
                    const w01 = row1 && col0 ? (1 - wx) * wy : 0;
                    const w11 = row1 && col1 ? wx * wy : 0;

                    if (w00 + w10 + w01 + w11 === 0) continue;

                    const i00 = (y0 * sourceWidth + x0) * 4;
                    const i10 = i00 + 4;
                    const i01 = i00 + sourceWidth * 4;
                    const i11 = i01 + 4;
                    // A neighbour outside the composite has weight 0 and is not read at all (reading past the array would give undefined, and undefined * 0 is NaN).
                    const alpha = (w00 > 0 ? source[i00 + 3] * w00 : 0) + (w10 > 0 ? source[i10 + 3] * w10 : 0) + (w01 > 0 ? source[i01 + 3] * w01 : 0) + (w11 > 0 ? source[i11 + 3] * w11 : 0);
                    const target = (line * width + column) * 4;

                    if (alpha > 0)
                    {
                        const scale = 255 / alpha;

                        for (let k = 0; k < 3; k++)
                        {
                            const value = (w00 > 0 ? source[i00 + k] * w00 : 0) + (w10 > 0 ? source[i10 + k] * w10 : 0) + (w01 > 0 ? source[i01 + k] * w01 : 0) + (w11 > 0 ? source[i11 + k] * w11 : 0);

                            output.data[target + k] = Math.min(255, Math.round(value * scale));
                        }
                    }

                    output.data[target + 3] = Math.round(alpha);
                }
            }

            if (canvas.width !== width || canvas.height !== height)
            {
                canvas.width = width;
                canvas.height = height;
            }

            const context = canvas.getContext('2d', { willReadFrequently: true });

            if (!context) return false;

            context.putImageData(output, 0, 0);
            canvas.style.width = `${width / ratio}px`;
            canvas.style.height = `${height / ratio}px`;
            canvas.style.transform = `translate3d(${deviceX0 / ratio - rect.left}px, ${deviceY0 / ratio - rect.top}px, 0)`;

            return true;
        };

        let paintedKey = '';
        const sceneKey = () =>
        {
            const p = latest.current;

            return JSON.stringify([p.caption, p.captionLeft, p.nameLabel, p.descriptionLabel, p.focusedField === 'name' ? null : p.name, p.focusedField === 'description' ? null : p.description, p.hasNameError, p.focusedField]);
        };
        const repaint = (sync: boolean, force = true) =>
        {
            if (disposed) return;

            const key = sceneKey();

            // A committed render that changes nothing the surface paints (typing in the focused field) does not repaint.
            if (!force && state.drawn && key === paintedKey) return;

            paintedKey = key;

            try
            {
                const painted = compose();

                if (!painted || !bake())
                {
                    hide(sync);

                    return;
                }

                canvas.style.visibility = 'visible';
                commit({ drawn: true, ...painted.receipts }, sync);
            }
            catch
            {
                hide(sync);
            }
        };

        const rebake = () =>
        {
            if (disposed || !state.drawn) return;

            if (!bake()) hide(true);
        };

        // Only a raster the committed scene paints right now repaints; the others (the focused field's text while it is typed, the fill that is not showing) are stored for the next paint.
        const isPainted = (key: SourceKey): boolean =>
        {
            const p = latest.current;

            if (key === 'nameWhite') return p.focusedField !== 'name' && !p.hasNameError;
            if (key === 'nameYellow') return p.focusedField !== 'name' && p.hasNameError;
            if (key === 'descriptionWhite') return p.focusedField !== 'description';

            return true;
        };

        engine.current = {
            repaint: (sync, force) => repaint(sync, force),
            setRaster: (key) => (next) =>
            {
                if (disposed) return;

                if (next) rasters.set(key, next);
                else rasters.delete(key);

                if (!isPainted(key)) return;

                // A raster arriving is async work outside React; one being dropped happens inside an effect, where the change is batched.
                repaint(next !== null);
            }
        };

        const setClose = () =>
        {
            const next: CloseState = pressed ? 'pressed' : hover ? 'hover' : 'default';

            if (next === closeState) return;

            closeState = next;
            repaint(true);
        };
        const onOver = (event: PointerEvent) =>
        {
            if ((event.target as Element)?.closest?.('.volt-card-close-button'))
            {
                hover = true;
                setClose();
            }
        };
        const onOut = (event: PointerEvent) =>
        {
            const to = event.relatedTarget as Element | null;

            if ((event.target as Element)?.closest?.('.volt-card-close-button') && !to?.closest?.('.volt-card-close-button'))
            {
                hover = false;
                setClose();
            }
        };
        const onDown = (event: PointerEvent) =>
        {
            if ((event.target as Element)?.closest?.('.volt-card-close-button'))
            {
                pressed = true;
                setClose();
            }
        };
        const release = () =>
        {
            if (!pressed && !hover) return;

            pressed = false;
            setClose();
        };
        const onLeaveWindow = () =>
        {
            hover = false;
            pressed = false;
            setClose();
        };

        card.addEventListener('pointerover', onOver);
        card.addEventListener('pointerout', onOut);
        card.addEventListener('pointerdown', onDown);
        document.addEventListener('pointerup', release, true);
        document.addEventListener('pointercancel', release, true);
        document.addEventListener('lostpointercapture', release, true);
        window.addEventListener('blur', onLeaveWindow);

        const mutations = wrapper ? new MutationObserver(rebake) : null;
        const resizes = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(rebake) : null;

        mutations?.observe(wrapper, { attributes: true, attributeFilter: ['style'] });
        resizes?.observe(card);
        window.addEventListener('resize', rebake);

        // A move between two fractional ratios changes neither the page size, nor the wrapper style, nor the card: only the resolution media query says so.
        let ratioQuery: MediaQueryList | null = null;
        const onRatioChange = () =>
        {
            rebake();
            listenRatio();
        };
        const listenRatio = () =>
        {
            if (disposed || typeof matchMedia !== 'function') return;

            ratioQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
            ratioQuery.addEventListener('change', onRatioChange, { once: true });
        };

        listenRatio();

        Promise.all([renderFrame3WithShadow(WIDTH, HEIGHT), Promise.all(Object.values(CLOSE_URLS).map(loadImage))])
            .then(([renderedFrame, images]) =>
            {
                if (disposed) return;

                frame = renderedFrame;
                closeImages = { default: images[0], hover: images[1], pressed: images[2] };
                repaint(true);
            })
            .catch(() => hide(true));

        return () =>
        {
            disposed = true;
            engine.current = null;
            card.removeEventListener('pointerover', onOver);
            card.removeEventListener('pointerout', onOut);
            card.removeEventListener('pointerdown', onDown);
            document.removeEventListener('pointerup', release, true);
            document.removeEventListener('pointercancel', release, true);
            document.removeEventListener('lostpointercapture', release, true);
            window.removeEventListener('blur', onLeaveWindow);
            window.removeEventListener('resize', rebake);
            ratioQuery?.removeEventListener('change', onRatioChange);
            mutations?.disconnect();
            resizes?.disconnect();
            // The DOM visuals and the CSS shadow must return with the surface gone.
            latest.current.onStateChange({ drawn: false, name: null, description: null });
        };
    }, []);

    // Everything the surface paints comes from the committed props of this render, never from an earlier or a pending one.
    useLayoutEffect(() =>
    {
        latest.current = props;
        engine.current?.repaint(false, false);
    });

    return (
        <>
            <canvas ref={canvasRef} aria-hidden="true" className="volt-room-promote-edit__surface" />
            <div aria-hidden="true" className="volt-room-promote-edit__sources">
                <NativeText background={0x377998} nativeResolution overrides={{ color: 0xffffff }} text={props.caption} textStyle="u_frame_title" onRaster={rasterHandlers.caption} />
                <NativeText background={0xe9e9e1} nativeResolution text={props.nameLabel} textStyle="u_bold" onRaster={rasterHandlers.nameLabel} />
                <NativeText background={0xe9e9e1} nativeResolution text={props.descriptionLabel} textStyle="u_bold" onRaster={rasterHandlers.descriptionLabel} />
                <NativeText background={0xffffff} nativeResolution text={props.name} textStyle="u_regular" onRaster={rasterHandlers.nameWhite} />
                <NativeText background={0xffe91b} nativeResolution text={props.name} textStyle="u_regular" onRaster={rasterHandlers.nameYellow} />
                <NativeText background={0xffffff} maxWidth={217} nativeResolution text={props.description} textStyle="u_regular" onRaster={rasterHandlers.descriptionWhite} />
            </div>
        </>
    );
};
