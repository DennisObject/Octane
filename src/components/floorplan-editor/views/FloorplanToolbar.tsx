import { Dispatch, FC } from 'react';
import { FaRedo, FaUndo } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import { Base } from '../../../common';
import { AIR_FLOOR_ASSETS } from '../air/airAssets';
import { FloorActionMode, FloorplanAction, FloorplanState } from '../state/types';
import { FloorplanNativeText } from './FloorplanNativeText';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    panMode?: boolean;
    setPanMode?: (next: boolean) => void;
    includeDoor?: boolean;
    extras?: boolean;
};

const BRUSH_BUTTONS: { id: string; mode: FloorActionMode; icon: string; name: string }[] = [
    { id: 'tool-set', mode: 'SET', icon: AIR_FLOOR_ASSETS.addTile, name: 'add_tile' },
    { id: 'tool-unset', mode: 'UNSET', icon: AIR_FLOOR_ASSETS.removeTile, name: 'remove_tile' },
    { id: 'tool-up', mode: 'UP', icon: AIR_FLOOR_ASSETS.raiseTile, name: 'increase_height' },
    { id: 'tool-down', mode: 'DOWN', icon: AIR_FLOOR_ASSETS.sinkTile, name: 'decrease_height' },
    { id: 'tool-door', mode: 'DOOR', icon: AIR_FLOOR_ASSETS.enterTile, name: 'set_enter_tile' }
];

export const FloorplanToolbar: FC<Props> = ({ state, dispatch, canUndo, canRedo, onUndo, onRedo, panMode, setPanMode, includeDoor = true, extras = true }) => {
    const exitPan = () => {
        if (panMode && setPanMode) setPanMode(false);
    };

    const buttons = BRUSH_BUTTONS.filter((button) => includeDoor || button.mode !== 'DOOR');

    return (
        <div className="fp-control-group" data-testid="floorplan-toolbar">
            <div className="fp-group-label">
                {extras ? LocalizeText('floor.plan.editor.draw.mode') : <FloorplanNativeText background={0xbdbdb5} text={LocalizeText('floor.plan.editor.draw.mode')} />}
            </div>
            <div className="fp-tools">
                {buttons.map((b, index) => {
                    const active = state.brush.action === b.mode && !panMode;
                    const gapBefore = b.mode === 'UP' || b.mode === 'DOOR';

                    return (
                        <span key={b.id} className="fp-tool-slot">
                            {gapBefore && index > 0 && <img className="fp-tool-divider" data-before={b.name} src={AIR_FLOOR_ASSETS.receptionDivider} alt="" />}
                            <Base
                                pointer
                                data-testid={b.id}
                                data-tool={b.name}
                                data-active={active ? 'true' : 'false'}
                                className={`fp-tool ${active ? 'is-active' : ''}`}
                                onClick={() => {
                                    exitPan();
                                    dispatch({ type: 'BRUSH_SET', action: b.mode });
                                }}
                            >
                                <img src={b.icon} alt="" draggable={false} />
                            </Base>
                        </span>
                    );
                })}
                {extras && <>
                <Base
                    pointer
                    data-testid="tool-select-all"
                    className="fp-tool is-extra"
                    title={state.brush.action === 'UNSET' ? 'Erase all tiles' : 'Apply brush to all tiles'}
                    onClick={() => {
                        exitPan();
                        dispatch({ type: 'SELECT_ALL' });
                        dispatch({ type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
                    }}
                >
                    <span className={`octane-icon ${state.brush.action === 'UNSET' ? 'icon-set-deselect' : 'icon-set-select'}`} />
                </Base>
                <Base
                    pointer
                    data-testid="tool-square-select"
                    data-active={state.squareSelect && !panMode ? 'true' : 'false'}
                    title="Rectangular selection"
                    className={`fp-tool is-extra ${state.squareSelect && !panMode ? 'is-active' : ''}`}
                    onClick={() => {
                        exitPan();
                        dispatch({ type: 'SQUARE_SELECT_TOGGLE' });
                    }}
                >
                    <span className="octane-icon icon-set-squaresselect" />
                </Base>
                {setPanMode && (
                    <Base
                        pointer
                        data-testid="tool-pan"
                        data-active={panMode ? 'true' : 'false'}
                        title={panMode ? 'Hand mode active — drag to pan the view' : 'Hand mode — drag to pan the view'}
                        className={`fp-tool is-extra ${panMode ? 'is-active' : ''}`}
                        onClick={() => setPanMode(!panMode)}
                    >
                        <span className="octane-icon icon-hand-mode" />
                    </Base>
                )}
                {(onUndo || onRedo) && (
                    <>
                        <Base
                            pointer={Boolean(canUndo)}
                            data-testid="tool-undo"
                            title="Undo (Ctrl+Z)"
                            className={`fp-tool is-extra is-compact ${canUndo ? '' : 'is-disabled'}`}
                            onClick={canUndo && onUndo ? onUndo : undefined}
                        >
                            <FaUndo size={12} />
                        </Base>
                        <Base
                            pointer={Boolean(canRedo)}
                            data-testid="tool-redo"
                            title="Redo (Ctrl+Shift+Z)"
                            className={`fp-tool is-extra is-compact ${canRedo ? '' : 'is-disabled'}`}
                            onClick={canRedo && onRedo ? onRedo : undefined}
                        >
                            <FaRedo size={12} />
                        </Base>
                    </>
                )}
                </>}
            </div>
        </div>
    );
};
