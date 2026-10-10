import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';

export const AvatarEditorHotLookThumbnailView: FC<{ figure: string; gender: string }> = ({ figure, gender }) =>
{
    // The bitmap is kept with the look it was drawn for, so a changed look shows nothing until its own bitmap is ready.
    const key = `${gender}:${figure}`;
    const [drawn, setDrawn] = useState<{ key: string; url: string }>(null);
    const url = drawn?.key === key ? drawn.url : null;

    useEffect(() =>
    {
        let disposed = false;
        let revision = 0;

        const render = async () =>
        {
            if (disposed) return;

            const currentRevision = ++revision;
            const avatar = GetAvatarRenderManager().createAvatarImage(figure, AvatarScaleType.LARGE, gender, {
                resetFigure: render,
                dispose: () =>
                {},
                get disposed()
                {
                    return disposed;
                }
            });
            if (!avatar) return;

            let source: string;
            try
            {
                avatar.setDirection(AvatarSetType.FULL, 4);
                source = avatar.processAsImageUrl(AvatarSetType.FULL);
            }
            finally
            {
                avatar.dispose();
            }
            if (!source || disposed) return;

            const image = new Image();
            image.src = source;
            try
            {
                await image.decode();
            }
            catch
            {
                return;
            }
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
            setDrawn({ key: `${gender}:${figure}`, url: output.toDataURL('image/png') });
            scaled.width = scaled.height = output.width = output.height = 0;
        };

        render();
        return () =>
        {
            disposed = true; revision++;
        };
    }, [figure, gender]);

    return url && <img className="volt-avatar-editor-hotlook-bitmap" src={url} alt="" draggable={false} />;
};
