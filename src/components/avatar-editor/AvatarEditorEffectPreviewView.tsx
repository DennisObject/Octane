import { GetRoomEngine, RoomPreviewer } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { Point } from 'pixi.js';
import { LayoutRoomPreviewerView } from '../../common/layout/LayoutRoomPreviewerView';

export const AvatarEditorEffectPreviewView: FC<{ figure: string; effect: number; direction: number }> = ({ figure, effect, direction }) =>
{
    const [previewer, setPreviewer] = useState<RoomPreviewer>(null);

    // The previewer lives as long as its container is mounted (the ref callback owns it, so no state is set from an effect).
    const attach = useCallback((node: HTMLDivElement) =>
    {
        if (!node) return;

        const instance = new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER);
        instance.backgroundColor = null;
        instance.disableUpdate = true;
        instance.addViewOffset = new Point(-65, -30);
        instance.updateRoomWallsAndFloorVisibility(false, false);
        setPreviewer(instance);

        return () =>
        {
            instance.dispose();
            setPreviewer((current) => (current === instance ? null : current));
        };
    }, []);

    useEffect(() =>
    {
        if (!previewer) return;

        previewer.addAvatarIntoRoom(figure, effect);
        previewer.updateAvatarDirection(direction, direction);
        previewer.setAutomaticStateChange(false);
        previewer.updatePreviewRoomView(true);
    }, [previewer, figure, effect, direction]);

    return <div ref={attach} className="volt-avatar-editor-effect-preview">{previewer && <LayoutRoomPreviewerView roomPreviewer={previewer} height={210} onPreviewClick={() =>
    {}} />}</div>;
};
