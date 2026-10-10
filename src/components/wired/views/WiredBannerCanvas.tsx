import { FC, useLayoutEffect, useRef } from 'react';
import wiredBgLeft from '../../../assets/images/wired/wired_bg_left.png';
import wiredBgRight from '../../../assets/images/wired/wired_bg_right.png';
import frameSkin from '../../../assets/images/friends/swf/illumina_light_border_frame.png';

const FRAME_COLOR = 0xe2;
// ColorTransform alpha of the three layers (blend 0.1, 0.1 and 0.12 of the wired_banner container).
const LEFT_ALPHA = 26;
const DARKEN_ALPHA = 26;
const RIGHT_ALPHA = 31;
const RIGHT_OFFSET_Y = -19;
// The frame skin's three top rows are lighter and stay out of the darkening.
const SKIN_HIGHLIGHT_ROWS = 3;
const SKIN_HIGHLIGHT_COLOR = 228;

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = src;
    });

const readPixels = (image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);

    return context.getImageData(0, 0, image.width, image.height);
};

let artwork: Promise<[ImageData, ImageData, ImageData]> | null = null;
const loadArtwork = () =>
    (artwork ??= Promise.all([loadImage(wiredBgLeft), loadImage(wiredBgRight), loadImage(frameSkin)]).then(([left, right, skin]) => [readPixels(left), readPixels(right), readPixels(skin)]));

const SKIN_CORNER = 4;

/** Composites the illumina wired banner with the integer maths of the AIR bitmap pipeline, so every pixel matches. */
export const WiredBannerCanvas: FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let cancelled = false;
        const draw = async () => {
            const [left, right, skin] = await loadArtwork();
            if (cancelled) return;

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (!width || !height) return;

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext('2d');
            const output = context.createImageData(width, height);
            const data = output.data;
            data.fill(FRAME_COLOR);
            data.fill(SKIN_HIGHLIGHT_COLOR, 0, width * SKIN_HIGHLIGHT_ROWS * 4);

            const blend = (image: ImageData, x0: number, y0: number, alpha: number) => {
                for (let y = Math.max(0, y0); y < Math.min(height, y0 + image.height); y++) {
                    for (let x = Math.max(0, x0); x < Math.min(width, x0 + image.width); x++) {
                        const source = ((y - y0) * image.width + (x - x0)) * 4;
                        if (image.data[source + 3] === 0) continue;

                        const target = (y * width + x) * 4;
                        for (let channel = 0; channel < 3; channel++) data[target + channel] = Math.floor((data[target + channel] * (255 - alpha) + image.data[source + channel] * alpha) / 255);
                    }
                }
            };

            blend(left, 0, 0, LEFT_ALPHA);
            for (let index = width * SKIN_HIGHLIGHT_ROWS * 4; index < data.length; index += 4) {
                for (let channel = 0; channel < 3; channel++) data[index + channel] = Math.floor((data[index + channel] * (255 - DARKEN_ALPHA)) / 255);
                data[index + 3] = 255;
            }
            for (let index = 3; index < width * SKIN_HIGHLIGHT_ROWS * 4; index += 4) data[index] = 255;
            blend(right, width - right.width, RIGHT_OFFSET_Y, RIGHT_ALPHA);

            // The frame skin's rounded corners are painted above the banner (the canvas starts at frame pixel 1,1).
            const frameWidth = width + 2;
            for (let y = 0; y < SKIN_CORNER - 1; y++) {
                for (let x = 0; x < width; x++) {
                    const frameX = x + 1;
                    const tileX = frameX < SKIN_CORNER ? frameX : frameX >= frameWidth - SKIN_CORNER ? skin.width - SKIN_CORNER + (frameX - (frameWidth - SKIN_CORNER)) : -1;
                    if (tileX < 0) continue;

                    if (skin.data[((y + 1) * skin.width + tileX) * 4 + 3] > 0) data[(y * width + x) * 4 + 3] = 0;
                }
            }

            context.putImageData(output, 0, 0);
        };

        draw();
        const observer = new ResizeObserver(() => draw());
        observer.observe(canvas);

        return () => {
            cancelled = true;
            observer.disconnect();
        };
    }, []);

    return <canvas ref={canvasRef} className="volt-wired__banner-canvas" aria-hidden="true" />;
};
