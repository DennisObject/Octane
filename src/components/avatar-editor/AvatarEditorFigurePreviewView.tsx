import { FC } from 'react';
import shadowSrc from '../../assets/images/avatareditor/air/preview-shadow.png';
import rotateSrc from '../../assets/images/avatareditor/air/rotate.png';
import { LayoutAvatarImageView } from '../../common';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorEffectPreviewView } from './AvatarEditorEffectPreviewView';

const AVATAR_DIRECTIONS: number = 8;

export const AvatarEditorFigurePreviewView: FC<{}> = (props) => {
    const { getFigureString = null, gender = 'M', selectedEffect, previewDirection: direction, setPreviewDirection: setDirection } = useAvatarEditor();

    const rotateFigure = () => {
        setDirection(curr => (curr + 1) % AVATAR_DIRECTIONS);
    };

    return (
        <div className="octane-avatar-editor-preview-shell">
            <div className="figure-preview-container">
                {selectedEffect === -1 ? <>
                    <img className="octane-avatar-editor-preview-shadow" src={shadowSrc} alt="" draggable={false} />
                    <LayoutAvatarImageView direction={direction} figure={getFigureString} gender={gender} scale={2} />
                </> : <AvatarEditorEffectPreviewView direction={direction} figure={getFigureString} effect={selectedEffect} />}
            </div>
            <button type="button" className="octane-avatar-editor-rotate" aria-label="Rotate avatar" onClick={rotateFigure}>
                <img src={rotateSrc} alt="" draggable={false} />
            </button>
        </div>
    );
};
