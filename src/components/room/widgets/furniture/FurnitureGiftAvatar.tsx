import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager, IAvatarImage } from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { dataUrlToBlob } from '../../../../common/layout/avatarImageCrop';

// PresentFurniWidget.updateAvatarImageContainer: the sender's cropped head (AvatarImage.getCroppedImage("head")) or the incognito bitmap is placed in the 60x140
// avatar_image_container at x = width / 2 - bitmapWidth / 2 and y = height / 2 - bitmapHeight / 2, stored as whole pixels (verified on the v75 client).
const BOX_WIDTH = 60;
const BOX_HEIGHT = 140;

interface Placed {
    key: string;
    url: string;
    left: number;
    top: number;
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('gift avatar failed to load'));
        image.src = url;
    });

const place = (key: string, url: string, image: HTMLImageElement): Placed => ({
    key,
    url,
    left: Math.trunc(BOX_WIDTH / 2 - image.naturalWidth / 2),
    top: Math.trunc(BOX_HEIGHT / 2 - image.naturalHeight / 2)
});

/** The sender's head (figure) or a fixed bitmap (imageUrl, the incognito sender) in the gift card's avatar box. */
export const FurnitureGiftAvatar: FC<{ figure?: string; imageUrl?: string; onClick?: () => void }> = ({
    figure = null,
    imageUrl = null,
    onClick = undefined
}) => {
    const [placed, setPlaced] = useState<Placed>(null);
    const objectUrlRef = useRef<string>(null);
    const key = figure ? `figure:${figure}` : `image:${imageUrl}`;

    useEffect(() => {
        let isDisposed = false;
        let latestRender = 0;

        if (!figure) {
            if (!imageUrl) return;

            loadImage(imageUrl)
                .then((image) => {
                    if (!isDisposed) setPlaced(place(key, imageUrl, image));
                })
                .catch(() => {
                    if (!isDisposed) setPlaced(null);
                });

            return () => {
                isDisposed = true;
            };
        }

        const render = async (currentFigure: string) => {
            if (isDisposed) return;

            const renderId = ++latestRender;
            // The newest render failed: do not keep showing an older image of the same figure.
            const fail = () => {
                if (!isDisposed && renderId === latestRender) setPlaced(null);
            };
            let image: IAvatarImage = null;
            let isReleased = false;
            const release = () => {
                if (isReleased || !image) return;

                isReleased = true;
                image.dispose();
            };

            try {
                image = GetAvatarRenderManager().createAvatarImage(currentFigure, AvatarScaleType.LARGE, '', {
                    resetFigure: (nextFigure: string) => render(nextFigure),
                    dispose: null,
                    disposed: false
                });

                if (!image) return fail();

                image.setDirection(AvatarSetType.HEAD, 2);

                const url = image.processAsCroppedImageUrl(AvatarSetType.HEAD);

                release();

                if (!url) return fail();

                const loaded = await loadImage(url);
                const blob = dataUrlToBlob(url);

                if (isDisposed || renderId !== latestRender) return;

                if (!blob) return fail();

                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

                objectUrlRef.current = URL.createObjectURL(blob);
                setPlaced(place(key, objectUrlRef.current, loaded));
            } catch {
                fail();
            } finally {
                release();
            }
        };

        void render(figure);

        return () => {
            isDisposed = true;
        };
    }, [figure, imageUrl, key]);

    useEffect(
        () => () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

            objectUrlRef.current = null;
        },
        []
    );

    return (
        <div className="fnd-gift-avatar" onClick={onClick}>
            {placed?.key === key && <img alt="" draggable={false} src={placed.url} style={{ left: placed.left, top: placed.top }} />}
        </div>
    );
};
