import { FC, useState } from 'react';
import { LocalizeText } from '../../../api';
import { Button, LayoutFurniImageView } from '../../../common';
import { FurniDetail, furniEditorText } from '../../../hooks/furni-editor';

const FOOTPRINT_MAX = 8;

interface FurniEditorPreviewViewProps {
    item: FurniDetail;
    width: number;
    length: number;
    modes: number;
}

// Rendered through the room engine, so what shows here is what a room shows:
// rotation walks the four floor directions (two for wall items), the state
// stepper drives the visualization state the way a click in the room would,
// and the footprint grid draws width x length as typed in the form.
// The parent keys this view by item id, so another furni starts unrotated.
export const FurniEditorPreviewView: FC<FurniEditorPreviewViewProps> = ({ item, width, length, modes }) => {
    const directions = item.type === 'i' ? [2, 4] : [0, 2, 4, 6];
    const [directionIndex, setDirectionIndex] = useState(1);
    const [state, setState] = useState(-1);
    const direction = directions[directionIndex % directions.length];
    const stateCount = Math.max(0, Number.isFinite(modes) ? modes : 0);
    const footprintWidth = Number.isFinite(width) ? width : 1;
    const footprintLength = Number.isFinite(length) ? length : 1;
    const cols = Math.min(Math.max(footprintWidth, 1), FOOTPRINT_MAX);
    const rows = Math.min(Math.max(footprintLength, 1), FOOTPRINT_MAX);
    const footprint = furniEditorText('furni.editor.preview.footprint', { width: footprintWidth, length: footprintLength });

    const nextState = () => setState((previous) => (stateCount === 0 || previous + 1 >= stateCount ? -1 : previous + 1));

    return (
        <div className="volt-furni-editor-preview">
            <LayoutFurniImageView direction={direction} productClassId={item.spriteId} productType={item.type} state={state} />
            <div
                aria-label={footprint}
                className="volt-furni-editor-footprint"
                role="img"
                style={{ gridTemplateColumns: `repeat(${cols}, 6px)` }}
                title={footprintWidth > FOOTPRINT_MAX || footprintLength > FOOTPRINT_MAX ? LocalizeText('furni.editor.preview.footprint_clipped') : footprint}
            >
                {Array.from({ length: cols * rows }, (_, index) => (
                    <span key={index} />
                ))}
            </div>
            <span className="volt-furni-editor-preview-size">{footprint}</span>
            <div className="volt-furni-editor-preview-controls">
                <Button variant="secondary" onClick={() => setDirectionIndex((previous) => previous + 1)}>
                    {furniEditorText('furni.editor.preview.rotate', { direction })}
                </Button>
                {stateCount > 1 && (
                    <Button variant="secondary" onClick={nextState}>
                        {state < 0
                            ? LocalizeText('furni.editor.preview.state_base')
                            : furniEditorText('furni.editor.preview.state', { state: state + 1, count: stateCount })}
                    </Button>
                )}
            </div>
        </div>
    );
};
