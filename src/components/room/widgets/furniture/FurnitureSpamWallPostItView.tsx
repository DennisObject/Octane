import { FC } from 'react';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { useFurnitureSpamWallPostItWidget } from '../../../../hooks';
import { FurnitureStickieSheetView } from './FurnitureStickieSheetView';

const DEFAULT_STICKIE_COLOR = 'FFFF33';

export const FurnitureSpamWallPostItView: FC<{}> = (props) => {
    const { objectId = -1, color = '0', setColor = null, text = '', setText = null, canModify = false, onClose = null } = useFurnitureSpamWallPostItWidget();

    if (objectId === -1) return null;

    return (
        <DraggableWindow handleSelector=".drag-handler" initialPosition={{ x: 100, y: 100 }} windowPosition={DraggableWindowPosition.NOTHING}>
            <FurnitureStickieSheetView
                color={color && color.length === 6 ? color : DEFAULT_STICKIE_COLOR}
                showColors={canModify}
                showDelete={canModify}
                onClose={onClose}
                onColor={setColor}
                onDelete={onClose}
            >
                <textarea
                    autoFocus
                    className="context-text"
                    maxLength={500}
                    spellCheck={false}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                />
            </FurnitureStickieSheetView>
        </DraggableWindow>
    );
};
