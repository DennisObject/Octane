import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@octane/renderer';
import { Dispatch, FC, useEffect, useState } from 'react';
import { LocalizeText } from '../../../api';
import { AIR_FLOOR_ASSETS } from '../air/airAssets';
import { FloorplanThicknessMenu } from './FloorplanThicknessMenu';
import { THICKNESS_NAMES } from '../state/constants';
import { EntryDir, FloorplanAction, FloorplanState, ThicknessLevel } from '../state/types';
import { FloorplanNativeText } from './FloorplanNativeText';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    official?: boolean;
};

const THICKNESS_LEVELS: ThicknessLevel[] = [0, 1, 2, 3];

const OFFICIAL_GHOST_FIGURE = 'hd-180-1.ch-210-66.lg-270-82.sh-290-81';

const rotateDir = (dir: EntryDir, step: 1 | -1): EntryDir => ((dir + step + 8) & 7) as EntryDir;

const GhostAvatar: FC<{ direction: number }> = ({ direction }) => {
    const [url, setUrl] = useState('');

    useEffect(() => {
        let cancelled = false;
        const listener = {
            disposed: false,
            dispose: null as (() => void) | null,
            resetFigure: (figure: string) => {
                if (cancelled || listener.disposed) return;

                const avatar = GetAvatarRenderManager().createAvatarImage(figure, AvatarScaleType.SMALL, 'M', listener);

                if (!avatar) return;

                try {
                    avatar.setDirection(AvatarSetType.FULL, direction);

                    const image = avatar.processAsImageUrl(AvatarSetType.FULL);
                    const placeholder = typeof avatar.isPlaceholder === 'function' && avatar.isPlaceholder();

                    if (!cancelled && !placeholder && typeof image === 'string' && image.length > 0) setUrl(image);
                } catch {
                    if (!cancelled) setUrl('');
                } finally {
                    avatar.dispose();
                }
            }
        };

        try {
            listener.resetFigure(OFFICIAL_GHOST_FIGURE);
        } catch {
            if (!cancelled) setUrl('');
        }

        return () => {
            cancelled = true;
            listener.disposed = true;
        };
    }, [direction]);

    return (
        <span className="fp-bc-ghost" data-testid="floorplan-ghost" data-figure={OFFICIAL_GHOST_FIGURE} data-scale="sh" data-direction={direction}>
            {url ? <img src={url} alt="" /> : null}
        </span>
    );
};

export const FloorplanOptionsPanel: FC<Props> = ({ state, dispatch, official = false }) => {
    const setDir = (next: EntryDir) => dispatch({ type: 'SET_DOOR_DIR', dir: next, source: 'local' });
    const setWall = (t: ThicknessLevel) => dispatch({ type: 'SET_THICKNESS', wall: t, source: 'local' });
    const setFloor = (t: ThicknessLevel) => dispatch({ type: 'SET_THICKNESS', floor: t, source: 'local' });
    const Menu = official ? FloorplanThicknessMenu : ThicknessMenu;

    return (
        <div className="fp-bc-room-controls" data-testid="floorplan-room-controls">
            <div className="fp-bc-direction" data-testid="floorplan-orientation">
                <div className="fp-bc-direction-label">
                    {official ? <FloorplanNativeText background={0xbdbdb5} text={LocalizeText('floor.plan.editor.enter.direction')} /> : LocalizeText('floor.plan.editor.enter.direction')}
                </div>
                <button type="button" className="fp-bc-dir-btn" data-testid="entry-dir-prev" title="Rotate door" onClick={() => setDir(rotateDir(state.door.dir, 1))}>
                    <img src={AIR_FLOOR_ASSETS.arrowLeft} alt="" />
                </button>
                <span
                    className="fp-bc-avatar"
                    data-testid="entry-dir"
                    data-dir={state.door.dir}
                    title={`Direction ${state.door.dir}/7`}
                >
                    <GhostAvatar direction={state.door.dir} />
                </span>
                <button type="button" className="fp-bc-dir-btn is-right" data-testid="entry-dir-next" title="Rotate door" onClick={() => setDir(rotateDir(state.door.dir, -1))}>
                    <img src={AIR_FLOOR_ASSETS.arrowRight} alt="" />
                </button>
            </div>
            <img className="fp-bc-vdivider" src={AIR_FLOOR_ASSETS.receptionDivider} alt="" />
            <div className="fp-bc-thickness" data-testid="floorplan-appearance">
                <div className="fp-bc-direction-label">
                    {official ? <FloorplanNativeText background={0xbdbdb5} text={LocalizeText('floor.plan.editor.room.options')} /> : LocalizeText('floor.plan.editor.room.options')}
                </div>
                <Menu value={state.thickness.wall} onChange={setWall} testId="wall-thickness" labelKeyPrefix="navigator.roomsettings.wall_thickness" />
                <Menu value={state.thickness.floor} onChange={setFloor} testId="floor-thickness" labelKeyPrefix="navigator.roomsettings.floor_thickness" />
            </div>
        </div>
    );
};

type MenuProps = {
    value: ThicknessLevel;
    onChange: (next: ThicknessLevel) => void;
    testId: string;
    labelKeyPrefix: string;
};

const ThicknessMenu: FC<MenuProps> = ({ value, onChange, testId, labelKeyPrefix }) => (
    <select
        className="fp-bc-drop"
        data-testid={testId}
        data-value={value}
        aria-label={testId}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as ThicknessLevel)}
    >
        {THICKNESS_LEVELS.map((level) => (
            <option key={level} value={level}>
                {LocalizeText(`${labelKeyPrefix}.${THICKNESS_NAMES[level]}`)}
            </option>
        ))}
    </select>
);
