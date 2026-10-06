import { FC } from 'react';
import { LayoutAvatarImageView } from '../../../../../common';

interface InfoStandAvatarViewProps {
    figure: string;
    direction?: number;
    /** avatar_image widget top (the bitmap sits 24px down in every infostand well). */
    top?: number;
    /** avatar_image widget left: 16 in bot_view, one pixel further in user_view and rentable_bot_view. */
    left?: number;
}

/**
 * The avatar_image widget of the infostands: the renderer's trimmed bitmap centred
 * in its 34x84 region at x=16 of the grey_bg, like the Flash widget does.
 */
export const InfoStandAvatarView: FC<InfoStandAvatarViewProps> = ({ figure, direction = 4, top = 24, left = 16 }) => (
    <div className="octane-infostand__avatar" style={{ top, left }}>
        <LayoutAvatarImageView nativeCroppedHead trimmed direction={direction} figure={figure} />
    </div>
);
