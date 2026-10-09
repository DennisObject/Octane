import { FC } from 'react';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { useFurnitureStickieWidget } from '../../../../hooks';
import { FurnitureStickieSheetView } from './FurnitureStickieSheetView';

const DEFAULT_STICKIE_COLOR = 'FFFF33';

const STICKIE_TYPES = ['post_it_shakesp', 'post_it_dreams', 'post_it_xmas', 'post_it_vd', 'post.it.vd', 'post_it_juninas'];
const STICKIE_TYPE_NAMES = ['shakesp', 'dreams', 'christmas', 'heart', 'heart', 'juninas'];

const isThemedStickie = (type: string) => STICKIE_TYPES.indexOf(type) > -1;

const getStickieTypeName = (type: string) => STICKIE_TYPE_NAMES[STICKIE_TYPES.indexOf(type)];

export const FurnitureStickieView: FC<{}> = (props) => {
    const {
        objectId = -1,
        color = '0',
        text = '',
        type = '',
        canModify = false,
        updateColor = null,
        updateText = null,
        trash = null,
        onClose = null
    } = useFurnitureStickieWidget();

    if (objectId === -1) return null;

    const themeName = isThemedStickie(type) ? getStickieTypeName(type) : null;

    return (
        <DraggableWindow handleSelector=".drag-handler" initialPosition={{ x: 100, y: 100 }} windowPosition={DraggableWindowPosition.NOTHING}>
            <FurnitureStickieSheetView
                color={color && color.length === 6 ? color : DEFAULT_STICKIE_COLOR}
                showColors={canModify && !themeName}
                showDelete={canModify}
                themeName={themeName}
                onClose={onClose}
                onColor={updateColor}
                onDelete={trash}
            >
                {/* v75 input: max_chars 500, saved when the text changed. */}
                <textarea
                    key={objectId + text}
                    className="context-text"
                    defaultValue={text}
                    maxLength={500}
                    readOnly={!canModify}
                    spellCheck={false}
                    onBlur={(event) => event.target.value !== text && updateText(event.target.value)}
                />
            </FurnitureStickieSheetView>
        </DraggableWindow>
    );
};
