import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { dataUrlToBlob } from '../../common/layout/avatarImageCrop';

// HabboFaceFocuser.focusUserFace(image, "head", 2, 1): a fixed 50x50 window of the 90x130 head canvas at (21, 28) for direction 2, copied with
// copyPixels (no alpha-bounds centring), then placed by the view at (0, 10) of its 50x70 holder.
const FACE_DIRECTION = 2;
const FACE_X = 21;
const FACE_Y = 28;
const FACE_SIZE = 50;
const FACE_CACHE_MAX = 200;
const FACE_CACHE = new Map<string, Blob>();

const cropFace = (imageUrl: string): Promise<string> =>
    new Promise((resolve) =>
    {
        const image = new Image();

        image.onload = () =>
        {
            try
            {
                const canvas = document.createElement('canvas');

                canvas.width = FACE_SIZE;
                canvas.height = FACE_SIZE;

                const context = canvas.getContext('2d');

                if (!context) return resolve(null);

                context.imageSmoothingEnabled = false;
                context.drawImage(image, FACE_X, FACE_Y, FACE_SIZE, FACE_SIZE, 0, 0, FACE_SIZE, FACE_SIZE);
                resolve(canvas.toDataURL('image/png'));
            }
            catch
            {
                // A rejected draw must not leave the render waiting for a crop that never comes.
                resolve(null);
            }
        };
        image.onerror = () => resolve(null);
        image.src = imageUrl;
    });

/** The head of an entry as the v75 leaderboard draws it: one fixed crop of the head image, never re-centred per figure. */
export const BadgeLeaderboardFace: FC<{ figure: string }> = ({ figure }) =>
{
    const [shown, setShown] = useState<{ figure: string; url: string }>(null);
    const requestRef = useRef(0);
    const objectUrlRef = useRef<string>(null);

    useEffect(() =>
    {
        const requestId = ++requestRef.current;
        let isDisposed = false;
        // Every render of this figure (the first one and each resetFigure redraw) takes a number; only the newest may show its result,
        // however long its crop takes.
        let latestRender = 0;
        const show = (blob: Blob, renderId: number) =>
        {
            if (isDisposed || requestRef.current !== requestId || renderId !== latestRender) return;

            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

            objectUrlRef.current = URL.createObjectURL(blob);
            setShown({ figure, url: objectUrlRef.current });
        };

        if (!figure) return;

        const cached = FACE_CACHE.get(figure);

        if (cached)
        {
            show(cached, ++latestRender);

            return () =>
            {
                isDisposed = true;
            };
        }

        const render = async (currentFigure: string) =>
        {
            if (isDisposed || requestRef.current !== requestId) return;

            const renderId = ++latestRender;
            const image = GetAvatarRenderManager().createAvatarImage(currentFigure, AvatarScaleType.LARGE, 'M', {
                resetFigure: (nextFigure: string) => render(nextFigure),
                dispose: null,
                disposed: false
            });

            if (!image) return;

            image.setDirection(AvatarSetType.HEAD, FACE_DIRECTION);

            const full = image.processAsImageUrl(AvatarSetType.HEAD);
            const isPlaceholder = image.isPlaceholder();

            image.dispose();

            if (!full) return;

            const cropped = await cropFace(full);
            const blob = cropped ? dataUrlToBlob(cropped) : null;

            if (!blob) return;

            // A placeholder figure is redrawn through resetFigure once its parts have loaded; only the finished image is cached.
            if (!isPlaceholder)
            {
                if (FACE_CACHE.size >= FACE_CACHE_MAX) FACE_CACHE.delete(FACE_CACHE.keys().next().value);

                FACE_CACHE.set(currentFigure, blob);
            }

            show(blob, renderId);
        };

        void render(figure);

        return () =>
        {
            isDisposed = true;
        };
    }, [figure]);

    useEffect(
        () => () =>
        {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

            objectUrlRef.current = null;
        },
        []
    );

    return <div className="octane-badge-leaderboard__face">{shown?.figure === figure && <img alt="" draggable={false} src={shown.url} />}</div>;
};
