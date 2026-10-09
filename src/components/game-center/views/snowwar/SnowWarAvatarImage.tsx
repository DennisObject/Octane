import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { SnowWarBoxProps, SnowWarImage } from './SnowWarBitmap';

interface AvatarBitmap
{
    url: string;
    width: number;
    height: number;
}

const CACHE: Map<string, AvatarBitmap> = new Map();
const CACHE_MAX = 128;
const RETRY_MS = 500;
const RETRY_LIMIT = 40;

/** Team uniform like AIR getAvatarFigure: team 2 wears ch-20001, everyone else ch-20000; cc removed. */
export const getSnowWarUniformFigure = (figure: string, teamId: number) =>
{
    const parts = figure.split('.').filter(part => part && !part.startsWith('ch-') && !part.startsWith('cc-'));

    parts.push(`ch-${ teamId === 2 ? 20001 : 20000 }-1`);

    return parts.join('.');
};

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) =>
{
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
});

// AIR "h_50": large-size parts resampled to 50 % with smoothing (AvatarImageCache._largeScaledSmall).
const halve = async (url: string): Promise<AvatarBitmap> =>
{
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');

    canvas.width = Math.max(1, Math.round(image.width / 2));
    canvas.height = Math.max(1, Math.round(image.height / 2));

    const context = canvas.getContext('2d');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return { url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
};

interface SnowWarAvatarImageProps extends SnowWarBoxProps
{
    figure: string;
    gender: string;
    /** `getCroppedImage` set: "head" for lobby/HUD/leaderboard heads, "full" for result portraits. */
    setType: 'head' | 'full';
    direction: number;
    /** "h_50" instead of "h". */
    half?: boolean;
    name?: string;
}

/** An AIR `getCroppedImage` avatar bitmap, centred in its bitmap window. */
export const SnowWarAvatarImage: FC<SnowWarAvatarImageProps> = ({ figure, gender, setType, direction, half = false, ...box }) =>
{
    const key = [ figure, gender, setType, direction, half ].join('|');
    const [ rendered, setRendered ] = useState<{ key: string; bitmap: AvatarBitmap }>(null);
    const bitmap = CACHE.get(key) ?? (rendered?.key === key ? rendered.bitmap : null);

    useEffect(() =>
    {
        if(CACHE.has(key)) return;

        let disposed = false;
        let attempts = 0;
        let retryTimer: ReturnType<typeof setTimeout> = null;

        // The renderer may not be ready yet (null image) or, while the arena room is being built,
        // hand back an empty crop; try again shortly instead of leaving the bitmap window blank.
        const retry = (renderFigure: string) =>
        {
            if(disposed || attempts >= RETRY_LIMIT) return;

            attempts++;
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => render(renderFigure), RETRY_MS);
        };

        const render = (renderFigure: string) =>
        {
            if(disposed) return;

            // resetFigure fires once the figure's parts are downloaded (same path as LayoutAvatarImageView).
            const image = GetAvatarRenderManager().createAvatarImage(renderFigure, AvatarScaleType.LARGE, gender, {
                resetFigure: (nextFigure: string) => render(nextFigure),
                dispose: null,
                disposed: false
            });

            if(!image)
            {
                retry(renderFigure);

                return;
            }

            const avatarSetType = setType === 'head' ? AvatarSetType.HEAD : AvatarSetType.FULL;

            image.setDirection(avatarSetType, direction);

            const url = image.processAsCroppedImageUrl(avatarSetType, true);
            const placeholder = image.isPlaceholder();

            image.dispose();

            if(!url)
            {
                retry(renderFigure);

                return;
            }

            (half ? halve(url) : loadImage(url).then(loaded => ({ url, width: loaded.width, height: loaded.height })))
                .then(result =>
                {
                    if(disposed) return;

                    if(result.width <= 2 || result.height <= 2)
                    {
                        retry(renderFigure);

                        return;
                    }

                    if(!placeholder)
                    {
                        if(CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
                        CACHE.set(key, result);
                    }

                    setRendered({ key, bitmap: result });
                })
                .catch(() => retry(renderFigure));
        };

        render(figure);

        return () =>
        {
            disposed = true;
            clearTimeout(retryTimer);
        };
    }, [ key, figure, gender, setType, direction, half ]);

    return <SnowWarImage {...box} src={bitmap?.url} imageWidth={bitmap?.width ?? 0} imageHeight={bitmap?.height ?? 0} />;
};
