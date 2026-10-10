import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager, IAvatarImage } from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { dataUrlToBlob } from '../../../../common/layout/avatarImageCrop';

// gift_wrapping avatar_image: PurchaseConfirmationDialog.updateAvatarImage sets the purchaser's cropped head (AvatarImage.getCroppedImage("head")) or the incognito
// bitmap on a 60x149 window that centres itself when it is resized (ON_RESIZE_ALIGN_CENTER, WindowController.setRectangle): x = trunc((60 - width) / 2),
// y = trunc((149 - height) / 2), whole pixels. Source-derived; the v75 rig cannot open this dialog.
const BOX_WIDTH = 60;
const BOX_HEIGHT = 149;

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
    left: Math.trunc((BOX_WIDTH - image.naturalWidth) / 2),
    top: Math.trunc((BOX_HEIGHT - image.naturalHeight) / 2)
});

/** The purchaser's head (figure) or a fixed bitmap (imageUrl, the incognito purchaser) in the gift card's avatar box. */
export const CatalogGiftAvatar: FC<{ figure?: string; imageUrl?: string }> = ({ figure = null, imageUrl = null }) => {
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
        <div className="volt-catalog-gift-avatar">
            {placed?.key === key && <img alt="" draggable={false} src={placed.url} style={{ left: placed.left, top: placed.top }} />}
        </div>
    );
};
