import { GetRoomEngine, RoomPreviewer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { Point } from 'pixi.js';
import { LayoutRoomPreviewerView } from '../../common/layout/LayoutRoomPreviewerView';

export const AvatarEditorEffectPreviewView: FC<{ figure: string; effect: number; direction: number }> = ({ figure, effect, direction }) => {
    const [previewer, setPreviewer] = useState<RoomPreviewer>(null);

    useEffect(() => {
        const instance = new RoomPreviewer(GetRoomEngine(), ++RoomPreviewer.PREVIEW_COUNTER);
        instance.backgroundColor = null;
        instance.addViewOffset = new Point(-65, -30);
        instance.updateRoomWallsAndFloorVisibility(false, false);
        setPreviewer(instance);

        return () => instance.dispose();
    }, []);

    useEffect(() => {
        if (!previewer) return;

        previewer.addAvatarIntoRoom(figure, effect);
        previewer.updateAvatarDirection(direction, direction);
        previewer.setAutomaticStateChange(false);
    }, [previewer, figure, effect, direction]);

    return <div className="octane-avatar-editor-effect-preview">{previewer && <LayoutRoomPreviewerView roomPreviewer={previewer} height={210} onPreviewClick={() => {}} />}</div>;
};
