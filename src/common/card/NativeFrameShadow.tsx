import { FC, RefObject, useEffect, useRef } from 'react';

// The classic v75 client draws a window's DropShadowFilter with Canvas2D (HabboAirLauncher.app.js, GraphicContext._r4eb6f23e1a4ffd):
// the window is extracted at resolution 1, drawn once with shadowBlur/shadowOffset set and the result is put under the window as a bitmap.
// The window image is drawn into that bitmap too, so its anti-aliased frame pixels are composited twice. The routine below is that function.
// frame_3 (2119_frame_3_xml): DropShadowFilter distance 4, angle 45, color 0, alpha 0.35, blurX 4, blurY 4; strength and quality are the defaults.
// The routine is fixed to this one proven filter and only reachable through NativeFrameShadow, which bounds the frame size before anything is allocated.
const FRAME_3_SHADOW = { distance: 4, angle: 45, color: 0, alpha: 0.35, blurX: 4, blurY: 4, strength: 1, quality: 1 };

// habbo_skin_frame_3: 10px corners, 33px title and 10px footer cut from frame-ubuntu-3.png, the same slices OctaneCardView.css gives border-image.
const FRAME_URL = new URL('../../assets/images/habbo-skin/slices/frame-ubuntu-3.png', import.meta.url).href;
const SLICE_TOP = 33;
const SLICE_SIDE = 10;
const SLICE_BOTTOM = 10;
const MIN_WIDTH = SLICE_SIDE * 2;
const MIN_HEIGHT = SLICE_TOP + SLICE_BOTTOM;
const MAX_SPRITE_AREA = 2048 * 2048;
// Chrome blurs a shadow differently on a GPU canvas (alpha off by up to 3 levels); willReadFrequently keeps these canvases on the CPU path that the shadow bitmap was measured against.
const CANVAS_OPTIONS: CanvasRenderingContext2DSettings = { willReadFrequently: true };

const shadowColor = (color: number, alpha: number): string => {
    const rgb = Number.isFinite(color) ? (color >>> 0) & 0xffffff : 0;

    return `rgba(${(rgb >>> 16) & 255}, ${(rgb >>> 8) & 255}, ${rgb & 255}, ${Math.max(0, Math.min(1, alpha))})`;
};

const shadowPads = (filter: typeof FRAME_3_SHADOW) => {
    const angle = (filter.angle * Math.PI) / 180;
    const blur = Math.max(0, Math.max(filter.blurX, filter.blurY));
    const offsetX = Math.cos(angle) * filter.distance;
    const offsetY = Math.sin(angle) * filter.distance;

    return {
        blur,
        offsetX,
        offsetY,
        left: Math.ceil(blur * 2 + Math.max(0, -offsetX)),
        top: Math.ceil(blur * 2 + Math.max(0, -offsetY)),
        right: Math.ceil(blur * 2 + Math.max(0, offsetX)),
        bottom: Math.ceil(blur * 2 + Math.max(0, offsetY))
    };
};

// Whether a frame of this size may be drawn: whole pixels from the frame minimum up, with the shadow bitmap under the area limit.
const isFrameSizeSupported = (width: number, height: number): boolean => {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < MIN_WIDTH || height < MIN_HEIGHT) return false;

    const { left, top, right, bottom } = shadowPads(FRAME_3_SHADOW);

    return (width + left + right) * (height + top + bottom) <= MAX_SPRITE_AREA;
};

// Draws `source` (a frame raster) with its shadow into a new canvas; `left`/`top` are where the source lands inside it.
const renderNativeShadow = (source: HTMLCanvasElement): { canvas: HTMLCanvasElement; left: number; top: number } | null => {
    if (!isFrameSizeSupported(source.width, source.height)) return null;

    const filter = FRAME_3_SHADOW;
    const width = Math.max(1, Math.ceil(source.width || 1));
    const height = Math.max(1, Math.ceil(source.height || 1));
    const passes = Math.max(1, Math.round(filter.quality * Math.max(1, filter.strength)));
    const { blur, offsetX, offsetY, left, top, right, bottom } = shadowPads(filter);
    const canvas = document.createElement('canvas');

    canvas.width = width + left + right;
    canvas.height = height + top + bottom;

    const context = canvas.getContext('2d', CANVAS_OPTIONS);

    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.shadowColor = shadowColor(filter.color, filter.alpha);
    context.shadowBlur = blur;
    context.shadowOffsetX = offsetX;
    context.shadowOffsetY = offsetY;

    for (let pass = 0; pass < passes; pass++) context.drawImage(source, left, top);

    context.restore();

    return { canvas, left, top };
};

let frameImage: Promise<HTMLImageElement> | null = null;

const loadFrameImage = (): Promise<HTMLImageElement> => {
    if (!frameImage) {
        frameImage = new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();

            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('frame bitmap failed to load'));
            image.src = FRAME_URL;
        });

        // A failed load is retried by the next window instead of being remembered.
        frameImage.catch(() => {
            frameImage = null;
        });
    }

    return frameImage;
};

// The frame raster at width x height: fixed corners, the stretched edges and the opaque fill, like border-image-slice "33 10 10 10 fill".
const drawFrame = (image: HTMLImageElement, width: number, height: number): HTMLCanvasElement | null => {
    if (!isFrameSizeSupported(width, height)) return null;

    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', CANVAS_OPTIONS);

    if (!context) return null;

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const sourceX = [0, SLICE_SIDE, sourceWidth - SLICE_SIDE, sourceWidth];
    const sourceY = [0, SLICE_TOP, sourceHeight - SLICE_BOTTOM, sourceHeight];
    const targetX = [0, SLICE_SIDE, width - SLICE_SIDE, width];
    const targetY = [0, SLICE_TOP, height - SLICE_BOTTOM, height];

    context.imageSmoothingEnabled = false;

    for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
            context.drawImage(
                image,
                sourceX[column],
                sourceY[row],
                sourceX[column + 1] - sourceX[column],
                sourceY[row + 1] - sourceY[row],
                targetX[column],
                targetY[row],
                targetX[column + 1] - targetX[column],
                targetY[row + 1] - targetY[row]
            );
        }
    }

    return canvas;
};

/**
 * The frame-3 window frame raster and its native shadow sprite, for one fixed contract and a size guard: `sprite` is the shadow with the frame drawn into it
 * (as the native routine does), `frame` the window frame alone, `left`/`top` where the window lands inside the sprite. Null when the size is not supported or a canvas is missing.
 */
export const renderFrame3WithShadow = async (width: number, height: number): Promise<{ sprite: HTMLCanvasElement; frame: HTMLCanvasElement; left: number; top: number } | null> =>
{
    if (!isFrameSizeSupported(width, height)) return null;

    const image = await loadFrameImage();
    const frame = drawFrame(image, width, height);
    const shadow = frame ? renderNativeShadow(frame) : null;

    return frame && shadow ? { sprite: shadow.canvas, frame, left: shadow.left, top: shadow.top } : null;
};

interface NativeFrameShadowProps {
    /** The frame element the shadow belongs to; its rendered size drives the shadow. */
    targetRef: RefObject<HTMLElement>;
    /** True while the native shadow is drawn; false means the caller should keep its fallback shadow. */
    onReadyChange: (ready: boolean) => void;
}

// A pointer-transparent canvas behind a frame-3 window holding the native shadow bitmap (1x, left of the window by `left`, above it by `top`).
// It stays 1x on purpose: the native bitmap is made at resolution 1 and the stage scales it. The native stage canvas is enlarged without
// smoothing on an integer device pixel ratio and smoothed on a fractional one (launcher MWt: imageRendering pixelated / auto), and so is this canvas.
const applySampling = (canvas: HTMLCanvasElement) => {
    canvas.style.imageRendering = Number.isInteger(window.devicePixelRatio) ? 'pixelated' : 'auto';
};

export const NativeFrameShadow: FC<NativeFrameShadowProps> = ({ targetRef, onReadyChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const target = targetRef.current;
        const canvas = canvasRef.current;

        if (!target || !canvas || typeof ResizeObserver === 'undefined') {
            onReadyChange(false);

            return;
        }

        let disposed = false;
        let request = 0;
        let drawnKey = '';

        const clear = () => {
            drawnKey = '';
            canvas.width = 0;
            canvas.height = 0;
            onReadyChange(false);
        };

        const update = () => {
            const width = target.offsetWidth;
            const height = target.offsetHeight;
            const key = `${width}x${height}`;
            // Every report invalidates what is still pending, including one that returns to the size already drawn.
            const current = ++request;

            if (key === drawnKey) return;

            if (!isFrameSizeSupported(width, height)) {
                clear();

                return;
            }

            loadFrameImage()
                .then((image) => {
                    // Only the latest size may draw, and nothing draws after unmount.
                    if (disposed || current !== request) return;

                    const frame = drawFrame(image, width, height);
                    const shadow = frame ? renderNativeShadow(frame) : null;
                    const context = shadow ? canvas.getContext('2d', CANVAS_OPTIONS) : null;

                    if (!shadow || !context) {
                        clear();

                        return;
                    }

                    canvas.width = shadow.canvas.width;
                    canvas.height = shadow.canvas.height;
                    canvas.style.left = `${-shadow.left}px`;
                    canvas.style.top = `${-shadow.top}px`;
                    canvas.style.width = `${shadow.canvas.width}px`;
                    canvas.style.height = `${shadow.canvas.height}px`;
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(shadow.canvas, 0, 0);
                    drawnKey = key;
                    onReadyChange(true);
                })
                .catch(() => {
                    if (disposed || current !== request) return;

                    clear();
                });
        };

        const observer = new ResizeObserver(update);
        const onDeviceChange = () => applySampling(canvas);

        applySampling(canvas);
        window.addEventListener('resize', onDeviceChange);
        observer.observe(target);
        update();

        return () => {
            disposed = true;
            observer.disconnect();
            window.removeEventListener('resize', onDeviceChange);
            // The canvas goes away with this effect, so the caller's fallback shadow must come back until a new one is drawn.
            onReadyChange(false);
        };
    }, [targetRef, onReadyChange]);

    return <canvas ref={canvasRef} aria-hidden="true" className="octane-native-frame-shadow" />;
};
