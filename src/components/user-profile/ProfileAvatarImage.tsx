import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager, IAvatarImage } from '@volt/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { dataUrlToBlob } from '../../common/layout/avatarImageCrop';

// new_extended_profile avatar_image (cropped, scale h, direction 2): AvatarImageWidget shows AvatarImage.getCroppedImage, the union of the body-part layer
// rectangles, in the 34px widget: horizontally centred (rounded towards zero), its top at the widget top (measured on the v75 client).
const WIDGET_WIDTH = 34;

interface ProfileAvatarState {
    figure: string;
    url: string;
    left: number;
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('avatar image failed to load'));
        image.src = url;
    });

export const ProfileAvatarImage: FC<{ figure: string }> = ({ figure }) => {
    const [shown, setShown] = useState<ProfileAvatarState>(null);
    const objectUrlRef = useRef<string>(null);

    useEffect(() => {
        let isDisposed = false;
        let latestRender = 0;

        if (!figure) return;

        const render = async (currentFigure: string) => {
            if (isDisposed) return;

            const renderId = ++latestRender;
            // The newest render failed: do not keep showing an older image of the same figure.
            const fail = () => {
                if (!isDisposed && renderId === latestRender) setShown(null);
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

                image.setDirection(AvatarSetType.FULL, 2);

                const url = image.processAsCroppedImageUrl(AvatarSetType.FULL);

                release();

                if (!url) return fail();

                const loaded = await loadImage(url);
                const blob = dataUrlToBlob(url);

                // Only the newest render may show; a placeholder drawn before the figure parts arrived is replaced by its resetFigure redraw.
                if (isDisposed || renderId !== latestRender) return;

                if (!blob) return fail();

                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

                objectUrlRef.current = URL.createObjectURL(blob);
                setShown({ figure, url: objectUrlRef.current, left: Math.trunc((WIDGET_WIDTH - loaded.naturalWidth) / 2) });
            } catch {
                // An image that cannot be drawn or decoded leaves the avatar blank rather than breaking the profile.
                fail();
            } finally {
                release();
            }
        };

        void render(figure);

        return () => {
            isDisposed = true;
        };
    }, [figure]);

    useEffect(
        () => () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);

            objectUrlRef.current = null;
        },
        []
    );

    return shown?.figure === figure ? (
        <img alt="" className="volt-extended-profile__avatar-image" draggable={false} src={shown.url} style={{ marginLeft: shown.left }} />
    ) : null;
};
