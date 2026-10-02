import {
    AddLinkEventTracker,
    BuildersClubSubscriptionStatusMessageEvent,
    FloorHeightMapEvent,
    GetOccupiedTilesMessageComposer,
    GetRoomEntryTileMessageComposer,
    GetSessionDataManager,
    ILinkEventTracker,
    PerkAllowancesMessageEvent,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomEntryTileMessageEvent,
    RoomOccupiedTilesMessageEvent,
    RoomVisualizationSettingsEvent,
    UpdateFloorPropertiesMessageComposer
} from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useMessageEvent, useNotification, useOctaneEvent } from '../../hooks';
import { AIR_FLOOR_ASSETS } from './air/airAssets';
import { FloorplanEditorLegacyView } from './FloorplanEditorLegacyView';
import {
    OfficialDrawMode,
    OfficialFloorPlan,
    emptyOfficialFloorPlan,
    loadOfficialMap,
    officialPlanData,
    setOccupiedMap,
    thicknessSelection,
    thicknessWire,
    wrapDirection
} from './official/officialFloorPlan';
import { parseTilemap } from './state/encoding';
import { initialState } from './state/reducer';
import { FloorActionMode, FloorplanAction, FloorplanState, ThicknessLevel } from './state/types';
import { FloorplanHeightPicker } from './views/FloorplanHeightPicker';
import { FloorplanImportExport } from './views/FloorplanImportExport';
import { FloorplanOfficialCanvas } from './views/FloorplanOfficialCanvas';
import { FloorplanOfficialPreview } from './views/FloorplanOfficialPreview';
import { FloorplanOptionsPanel } from './views/FloorplanOptionsPanel';
import { FloorplanToolbar } from './views/FloorplanToolbar';
import { FloorplanWallHeightSlider } from './views/FloorplanWallHeightSlider';

export type FloorplanEditorExternalSession = {
    tilemap: string;
    occupiedTiles?: boolean[][];
    title?: string;
    onClose: () => void;
    onSave: (tilemap: string) => void;
};

type Props = {
    externalSession?: FloorplanEditorExternalSession;
};

const ACTION_FOR_MODE: Record<OfficialDrawMode, FloorActionMode> = {
    add_tile: 'SET',
    remove_tile: 'UNSET',
    increase_height: 'UP',
    decrease_height: 'DOWN',
    set_enter_tile: 'DOOR'
};

const MODE_FOR_ACTION: Record<FloorActionMode, OfficialDrawMode> = {
    SET: 'add_tile',
    UNSET: 'remove_tile',
    UP: 'increase_height',
    DOWN: 'decrease_height',
    DOOR: 'set_enter_tile'
};

const staffCanSave = (): boolean => {
    try {
        const session = GetSessionDataManager();

        return typeof session?.hasSecurity === 'function' && session.hasSecurity(4) === true;
    } catch {
        return false;
    }
};

const asThickness = (value: number): ThicknessLevel => (value <= 0 ? 0 : value >= 3 ? 3 : (value as ThicknessLevel));

export const FloorplanEditorView: FC<Props> = ({ externalSession }) => {
    if (externalSession) return <FloorplanEditorLegacyView externalSession={externalSession} />;

    return <OfficialFloorplanEditor />;
};

const OfficialFloorplanEditor: FC = () => {
    const [roomVisible, setRoomVisible] = useState(false);
    const [importExportVisible, setImportExportVisible] = useState(false);
    const [zoom, setZoom] = useState<1 | 2>(1);
    const [plan, setPlan] = useState<OfficialFloorPlan>(emptyOfficialFloorPlan);
    const [previewPlan, setPreviewPlan] = useState<OfficialFloorPlan>(emptyOfficialFloorPlan);
    const [drawMode, setDrawMode] = useState<OfficialDrawMode>('add_tile');
    const [drawingHeight, setDrawingHeight] = useState(0);
    const [fixedWallsHeight, setFixedWallsHeight] = useState(0);
    const fixedWallsWireRef = useRef(0);
    const [wallsFixed, setWallsFixed] = useState(false);
    const [wallDrop, setWallDrop] = useState<ThicknessLevel>(0);
    const [floorDrop, setFloorDrop] = useState<ThicknessLevel>(0);
    const [committedWall, setCommittedWall] = useState<ThicknessLevel>(0);
    const [committedFloor, setCommittedFloor] = useState<ThicknessLevel>(0);
    const [canSave, setCanSave] = useState(false);
    const [importCanSave, setImportCanSave] = useState(false);
    const bcSecondsRef = useRef(0);
    const windowCreatedRef = useRef(false);
    const roomVisibleRef = useRef(false);
    const { simpleAlert } = useNotification();
    const [largeFloorPlans, setLargeFloorPlans] = useState(false);
    const lastReceivedRef = useRef('');
    const planRef = useRef(plan);
    const bcTimerRef = useRef<number | null>(null);
    const previewStageRef = useRef<HTMLDivElement>(null);
    const previewTimerRef = useRef<number | null>(null);
    const previewCenteredRef = useRef(false);

    planRef.current = plan;
    roomVisibleRef.current = roomVisible;

    const liveState = useMemo<FloorplanState>(() => ({
        ...initialState,
        tiles: parseTilemap(officialPlanData(plan)),
        door: { x: plan.entryX, y: plan.entryY, dir: (plan.entryDir & 7) as FloorplanState['door']['dir'] },
        thickness: { wall: wallDrop, floor: floorDrop },
        wallHeight: wallsFixed ? fixedWallsHeight + 1 : 0
    }), [plan, wallDrop, floorDrop, wallsFixed, fixedWallsHeight]);

    const toolbarState = useMemo<FloorplanState>(() => ({
        ...liveState,
        brush: { h: drawingHeight, action: ACTION_FOR_MODE[drawMode] }
    }), [liveState, drawingHeight, drawMode]);

    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => setRoomVisible(false));

    useEffect(() => {
        if (!roomVisible) return;

        if (!windowCreatedRef.current) {
            setCanSave(bcSecondsRef.current > 0 || staffCanSave());
            windowCreatedRef.current = true;
        }
        setWallDrop(committedWall);
        setFloorDrop(committedFloor);
        setWallsFixed(fixedWallsWireRef.current !== -1);
        if (!previewTimerRef.current) setPreviewPlan(planRef.current);
        SendMessageComposer(new GetRoomEntryTileMessageComposer());
        SendMessageComposer(new GetOccupiedTilesMessageComposer());
    }, [roomVisible]);

    useEffect(() => {
        if (!roomVisible || previewTimerRef.current !== null) return;

        // AIR's preview receiver keeps its cadence after the editor has first been created.
        previewTimerRef.current = window.setInterval(() => setPreviewPlan(planRef.current), 2000);
    }, [roomVisible]);

    useEffect(() => {
        if (!roomVisible) previewCenteredRef.current = false;
    }, [roomVisible]);

    const centerPreviewOnce = () => {
        if (previewCenteredRef.current) return;

        const stage = previewStageRef.current;

        if (!stage || stage.clientWidth <= 0 || stage.clientHeight <= 0) return;

        stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
        stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
        previewCenteredRef.current = true;
    };

    useEffect(() => () => {
        if (bcTimerRef.current !== null) window.clearInterval(bcTimerRef.current);
        if (previewTimerRef.current !== null) window.clearInterval(previewTimerRef.current);
    }, []);

    useMessageEvent<BuildersClubSubscriptionStatusMessageEvent>(BuildersClubSubscriptionStatusMessageEvent, (event) => {
        const seconds = event.getParser()?.secondsLeft ?? 0;

        bcSecondsRef.current = seconds;

        if (bcTimerRef.current === null) {
            bcTimerRef.current = window.setInterval(() => {
                bcSecondsRef.current -= 10;
                if (roomVisibleRef.current) setCanSave(bcSecondsRef.current > 0 || staffCanSave());
            }, 10000);
        }
    });

    useMessageEvent<PerkAllowancesMessageEvent>(PerkAllowancesMessageEvent, (event) => {
        const parser = event.getParser() as { isAllowed?: (code: string) => boolean; isPerkAllowed?: (code: string) => boolean } | undefined;

        setLargeFloorPlans(Boolean(parser?.isAllowed?.('BUILDER_AT_WORK') || parser?.isPerkAllowed?.('BUILDER_AT_WORK')));
    });

    useMessageEvent<RoomOccupiedTilesMessageEvent>(RoomOccupiedTilesMessageEvent, (event) => {
        const occupied = event.getParser().blockedTilesMap ?? [];

        setPlan((current) => setOccupiedMap(current, occupied));
    });

    useMessageEvent<RoomEntryTileMessageEvent>(RoomEntryTileMessageEvent, (event) => {
        const parser = event.getParser();

        setPlan((current) => ({
            ...current,
            entryX: parser.x,
            entryY: parser.y,
            entryDir: wrapDirection(parser.direction | 0)
        }));
    });

    useMessageEvent<FloorHeightMapEvent>(FloorHeightMapEvent, (event) => {
        const parser = event.getParser();
        const loaded = loadOfficialMap(parser.model ?? '');

        lastReceivedRef.current = parser.model ?? '';
        setPlan((current) => ({ ...loaded, reserved: current.reserved, entryX: current.entryX, entryY: current.entryY, entryDir: current.entryDir }));
        setPreviewPlan({ ...loaded, entryX: planRef.current.entryX, entryY: planRef.current.entryY, entryDir: planRef.current.entryDir });
        fixedWallsWireRef.current = parser.wallHeight;
        if (parser.wallHeight !== -1) setFixedWallsHeight(parser.wallHeight);
        setWallsFixed(parser.wallHeight !== -1);
    });

    useMessageEvent<RoomVisualizationSettingsEvent>(RoomVisualizationSettingsEvent, (event) => {
        const parser = event.getParser();
        const wall = asThickness(thicknessSelection(parser.thicknessWall));
        const floor = asThickness(thicknessSelection(parser.thicknessFloor));

        setWallDrop(wall);
        setFloorDrop(floor);
        setCommittedWall(wall);
        setCommittedFloor(floor);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                if (parts[1] === 'show') setRoomVisible(true);
                else if (parts[1] === 'hide') setRoomVisible(false);
                else if (parts[1] === 'toggle') setRoomVisible((value) => !value);
            },
            eventUrlPrefix: 'floor-editor/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    const acceptPlan = (next: OfficialFloorPlan, limited: boolean) => {
        setPlan(next);

        if (limited) simpleAlert(LocalizeText('floor.plan.editor.size.limit.exceeded'), null, null, null, LocalizeText('floor.plan.editor.alert'));
    };

    const dispatch = (action: FloorplanAction) => {
        if (action.type === 'BRUSH_SET') {
            if (action.action) setDrawMode(MODE_FOR_ACTION[action.action]);
            if (action.h !== undefined) setDrawingHeight(Math.max(0, Math.min(30, action.h | 0)));
            return;
        }

        if (action.type === 'SET_DOOR_DIR') {
            setPlan((current) => ({ ...current, entryDir: wrapDirection(action.dir) }));
            return;
        }

        if (action.type === 'SET_THICKNESS') {
            if (action.wall !== undefined) setWallDrop(action.wall);
            if (action.floor !== undefined) setFloorDrop(action.floor);
            return;
        }

        if (action.type === 'SET_WALL_HEIGHT') {
            if (action.value <= 0) {
                setWallsFixed(false);
                return;
            }

            setWallsFixed(true);
            fixedWallsWireRef.current = Math.max(0, Math.min(15, action.value - 1));
            setFixedWallsHeight(fixedWallsWireRef.current);
            return;
        }

        if (action.type === 'IMPORT_STRING') {
            const loaded = loadOfficialMap(action.raw.replace(/\n/g, '\r'));

            setPlan((current) => ({ ...loaded, reserved: current.reserved, entryX: current.entryX, entryY: current.entryY, entryDir: current.entryDir }));
        }
    };

    const saveFloorChanges = () => {
        if (!canSave) return;

        setCommittedWall(wallDrop);
        setCommittedFloor(floorDrop);
        SendMessageComposer(new UpdateFloorPropertiesMessageComposer(
            officialPlanData(plan),
            plan.entryX,
            plan.entryY,
            plan.entryDir,
            thicknessWire(wallDrop),
            thicknessWire(floorDrop),
            wallsFixed ? fixedWallsHeight : -1
        ));
    };

    const reloadFromLast = () => {
        const loaded = loadOfficialMap(lastReceivedRef.current);

        setPlan((current) => ({ ...loaded, reserved: current.reserved, entryX: current.entryX, entryY: current.entryY, entryDir: current.entryDir }));
        setPreviewPlan((current) => ({ ...loaded, reserved: current.reserved, entryX: current.entryX, entryY: current.entryY, entryDir: current.entryDir }));
        SendMessageComposer(new GetOccupiedTilesMessageComposer());
        SendMessageComposer(new GetRoomEntryTileMessageComposer());
    };

    const displayedWall = fixedWallsHeight + 1;

    return (
        <>
            {roomVisible && (
                <OctaneCardView uniqueKey="floorpan-editor" frameStyle={3} className="w-[662px] h-[600px]" classNames={['octane-floorplan-window']} theme="primary" isResizable>
                    <OctaneCardHeaderView headerText={LocalizeText('floor.plan.editor.title')} onCloseClick={() => setRoomVisible(false)} />
                    <OctaneCardContentView overflow="hidden">
                        <div className="fp-bc" data-testid="floorplan-official">
                            <div className="fp-bc-banner">
                                <img className="fp-bc-logo" src={AIR_FLOOR_ASSETS.logo} alt="" />
                                <span className="fp-bc-subtitle">{LocalizeText('floor.plan.editor.subtitle')}</span>
                            </div>
                            <section className="fp-bc-heightmap" data-testid="floorplan-plan-panel">
                                <FloorplanToolbar
                                    state={toolbarState}
                                    dispatch={dispatch}
                                    extras={false}
                                />
                                <div className="fp-bc-height-row">
                                    <span className="fp-bc-height-label">{LocalizeText('floor.plan.editor.tile.height')}</span>
                                    <FloorplanHeightPicker selectedH={drawingHeight} onSelect={setDrawingHeight} />
                                </div>
                                <div className="fp-bc-map">
                                    <FloorplanOfficialCanvas
                                        plan={plan}
                                        zoom={zoom}
                                        mode={drawMode}
                                        drawingHeight={drawingHeight}
                                        largeFloorPlans={largeFloorPlans}
                                        onPlan={acceptPlan}
                                    />
                                    <button type="button" className="fp-bc-zoom" data-testid="floorplan-zoom" data-zoom={zoom} onClick={() => setZoom((value) => (value === 1 ? 2 : 1))}>
                                        <img src={AIR_FLOOR_ASSETS.magnifier} alt="" />
                                    </button>
                                </div>
                            </section>
                            <section className="fp-bc-side" data-testid="floorplan-preview-panel">
                                <FloorplanOptionsPanel state={toolbarState} dispatch={dispatch} />
                                <div className={`fp-bc-wall-row ${wallsFixed ? '' : 'is-off'}`}>
                                    <button
                                        type="button"
                                        className={`fp-bc-check ${wallsFixed ? 'is-on' : ''}`}
                                        data-testid="wall-height-fixed"
                                        aria-pressed={wallsFixed}
                                        onClick={() => {
                                            if (wallsFixed) {
                                                setWallsFixed(false);
                                                return;
                                            }

                                            if (fixedWallsWireRef.current === -1) fixedWallsWireRef.current = fixedWallsHeight;
                                            setWallsFixed(true);

                                        }}
                                    />
                                    <span className="fp-bc-wall-label">{LocalizeText('floor.editor.wall.height')}</span>
                                    <span className="fp-bc-wall-number" data-testid="wall-height-badge">{displayedWall}</span>
                                    <FloorplanWallHeightSlider value={displayedWall} disabled={!wallsFixed} onChange={(value) => dispatch({ type: 'SET_WALL_HEIGHT', value, source: 'local' })} />
                                </div>
                                <div className="fp-bc-preview-stage" ref={previewStageRef}>
                                    <FloorplanOfficialPreview plan={previewPlan} onDrawn={centerPreviewOnce} />
                                    <button type="button" className="fp-bc-refresh" data-testid="floorplan-refresh" onClick={() => setPreviewPlan(planRef.current)}>
                                        <img src={AIR_FLOOR_ASSETS.refresh} alt="" />
                                    </button>
                                </div>
                            </section>
                            <div className="fp-bc-footer">
                                <button type="button" className="fp-bc-btn" data-testid="floorplan-revert" onClick={reloadFromLast}>{LocalizeText('floor.plan.editor.reload')}</button>
                                <div className="fp-bc-footer-right">
                                    <button type="button" className="fp-bc-btn" data-testid="floorplan-import-export" onClick={() => {
                                        if (importExportVisible) { setImportExportVisible(false); return; }
                                        setImportCanSave(bcSecondsRef.current > 0 || staffCanSave());
                                        setImportExportVisible(true);
                                    }}>{LocalizeText('floor.plan.editor.import.export')}</button>
                                    <button type="button" className="fp-bc-btn" data-testid="floorplan-cancel" onClick={() => setRoomVisible(false)}>{LocalizeText('floor.plan.editor.cancel')}</button>
                                    <button type="button" className="fp-bc-btn is-save" data-testid="floorplan-save" disabled={!canSave} onClick={saveFloorChanges}>{LocalizeText('floor.plan.editor.save')}</button>
                                </div>
                            </div>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
            {importExportVisible && (
                <FloorplanImportExport
                    state={toolbarState}
                    dispatch={dispatch}
                    initialText={officialPlanData(plan)}
                    saveDisabled={!importCanSave}
                    onClose={() => setImportExportVisible(false)}
                    onSaveFromText={(raw) => {
                        if (!importCanSave) return;

                        SendMessageComposer(new UpdateFloorPropertiesMessageComposer(
                            raw.replace(/\r\n|\n/g, '\r'),
                            plan.entryX,
                            plan.entryY,
                            plan.entryDir,
                            thicknessWire(committedWall),
                            thicknessWire(committedFloor),
                            -1
                        ));
                    }}
                    onRevertText={() => lastReceivedRef.current}
                />
            )}
        </>
    );
};
