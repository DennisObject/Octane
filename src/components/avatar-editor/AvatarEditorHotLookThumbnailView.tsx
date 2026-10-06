import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';

export const AvatarEditorHotLookThumbnailView: FC<{ figure: string; gender: string }> = ({ figure, gender }) => {
    const [url, setUrl] = useState<string>(null);

    useEffect(() => {
        let disposed = false;
        let revision = 0;
        setUrl(null);

        const render = async () => {
            if (disposed) return;

            const currentRevision = ++revision;
            const avatar = GetAvatarRenderManager().createAvatarImage(figure, AvatarScaleType.LARGE, gender, {
                resetFigure: render,
                dispose: () => {},
                get disposed() { return disposed; }
            });
            if (!avatar) return;

            let source: string;
            try {
                avatar.setDirection(AvatarSetType.FULL, 4);
                source = avatar.processAsImageUrl(AvatarSetType.FULL);
            } finally {
                avatar.dispose();
            }
            if (!source || disposed) return;

            const image = new Image();
            image.src = source;
            await image.decode();
            if (disposed || currentRevision !== revision) return;

            // Native rz/eh scale the full h bitmap by 0.5 with smoothing;
            // p3e copies it into Outfit's 35x60 bitmap, centered and bottom-aligned.
            const scaled = document.createElement('canvas');
            scaled.width = Math.round(image.width * 0.5);
            scaled.height = Math.round(image.height * 0.5);
            const scaledContext = scaled.getContext('2d');
            const output = document.createElement('canvas');
            output.width = 35;
            output.height = 60;
            const outputContext = output.getContext('2d');
            if (!scaledContext || !outputContext) return;

            scaledContext.imageSmoothingEnabled = true;
            scaledContext.drawImage(image, 0, 0, scaled.width, scaled.height);
            outputContext.drawImage(scaled, Math.floor((35 - scaled.width) / 2), 60 - scaled.height);
            setUrl(output.toDataURL('image/png'));
            scaled.width = scaled.height = output.width = output.height = 0;
        };

        render();
        return () => { disposed = true; revision++; };
    }, [figure, gender]);

    return url && <img className="octane-avatar-editor-hotlook-bitmap" src={url} alt="" draggable={false} />;
};
