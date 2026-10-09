import { AvatarDirectionAngle } from '@octane/renderer';
import { FC, useState } from 'react';
import shadowSrc from '../../assets/images/avatareditor/air/preview-shadow.png';
import rotateSrc from '../../assets/images/avatareditor/air/rotate.png';
import { LayoutAvatarImageView } from '../../common';
import { useAvatarEditor } from '../../hooks';

const DEFAULT_DIRECTION: number = 4;
const AVATAR_DIRECTIONS: number = 8;

export const AvatarEditorFigurePreviewView: FC<{}> = (props) => {
    const [direction, setDirection] = useState<number>(DEFAULT_DIRECTION);
    const { getFigureString = null, gender = 'M' } = useAvatarEditor();

    const rotateFigure = () => {
        setDirection(curr => (curr + 1) % AVATAR_DIRECTIONS);
    };

    return (
        <div className="octane-avatar-editor-preview-shell">
            <div className="figure-preview-container">
                <img className="octane-avatar-editor-preview-shadow" src={shadowSrc} alt="" draggable={false} />
                <LayoutAvatarImageView direction={direction} figure={getFigureString} gender={gender} scale={2} />
            </div>
            <button type="button" className="octane-avatar-editor-rotate" aria-label="Rotate avatar" onClick={rotateFigure}>
                <img src={rotateSrc} alt="" draggable={false} />
            </button>
        </div>
    );
};
