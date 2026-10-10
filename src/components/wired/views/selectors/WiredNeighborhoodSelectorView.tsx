import { GetRoomEngine } from '@octane/renderer';
import { CSSProperties, FC, JSX, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FaMinus, FaPlus, FaTimes } from 'react-icons/fa';
import { MdGridOn } from 'react-icons/md';
import { LocalizeText, WiredFurniType } from '../../../../api';
import sourceFurniIcon from '../../../../assets/images/wired/source_furni.png';
import sourceUserIcon from '../../../../assets/images/wired/source_user.png';
import { Button, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { CLICKED_USER_SOURCE_VALUE, nativeSourceOptions, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

const SOURCE_GROUP_BUTTONS = [
    { key: 'user', icon: sourceUserIcon, isUserGroup: true },
    { key: 'furni', icon: sourceFurniIcon, isUserGroup: false }
] as const;

const TILE_W = 22;
const TILE_H = 11;
const GRID_RANGE = 10;
const CX = GRID_RANGE * TILE_W + TILE_W / 2;
const CY = GRID_RANGE * TILE_H + TILE_H / 2;
const GRID_PX_W = (GRID_RANGE * 2 + 1) * TILE_W;
const GRID_PX_H = (GRID_RANGE * 2 + 1) * TILE_H;

type Tile = { x: number; y: number };

/** The native neighbourhood is 441 tiles: a square spiral from the anchor, east, north, west, south, with steps 1,1,2,2,3,3,... */
const NEIGHBORHOOD_TILE_COUNT = 441;
const NEIGHBORHOOD_WORDS = 14;
/** The last word carries only the final 25 tiles; its top seven bits are unused. */
const NEIGHBORHOOD_LAST_WORD_MASK = 0x01ffffff;

const buildNeighborhoodSpiral = (): Tile[] => {
    const tiles: Tile[] = [{ x: 0, y: 0 }];
    const directions = [
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 1 }
    ];
    let x = 0;
    let y = 0;
    let direction = 0;

    for (let step = 1; tiles.length < NEIGHBORHOOD_TILE_COUNT; step++) {
        for (let leg = 0; leg < 2 && tiles.length < NEIGHBORHOOD_TILE_COUNT; leg++) {
            for (let move = 0; move < step && tiles.length < NEIGHBORHOOD_TILE_COUNT; move++) {
                x += directions[direction].x;
                y += directions[direction].y;
                tiles.push({ x, y });
            }

            direction = (direction + 1) % directions.length;
        }
    }

    return tiles;
};

const NEIGHBORHOOD_SPIRAL = buildNeighborhoodSpiral();
const NEIGHBORHOOD_INDEX = new Map(NEIGHBORHOOD_SPIRAL.map((tile, index) => [`${tile.x},${tile.y}`, index]));

/** Packs picked tiles into the 14 signed words, bit i of the spiral in word i>>5 at bit i&31. */
const tilesToNeighborhoodWords = (tiles: Tile[]): number[] => {
    const words = Array.from({ length: NEIGHBORHOOD_WORDS }, () => 0);

    for (const tile of tiles) {
        const index = NEIGHBORHOOD_INDEX.get(`${tile.x},${tile.y}`);

        if (index === undefined) continue;

        words[index >>> 5] |= 1 << (index & 31);
    }

    return words;
};

const neighborhoodWordsToTiles = (words: number[]): Tile[] =>
    NEIGHBORHOOD_SPIRAL.filter((_, index) => {
        const wordIndex = index >>> 5;
        const word = (words[wordIndex] ?? 0) & (wordIndex === NEIGHBORHOOD_WORDS - 1 ? NEIGHBORHOOD_LAST_WORD_MASK : -1);

        return ((word >>> (index & 31)) & 1) === 1;
    });

const tileIncluded = (tiles: Tile[], x: number, y: number) => tiles.some((tile) => tile.x === x && tile.y === y);
const tileLeft = (rx: number, ry: number) => CX + (rx - ry) * (TILE_W / 2) - TILE_W / 2;
const tileTop = (rx: number, ry: number) => CY + (rx + ry) * (TILE_H / 2) - TILE_H / 2;

interface NeighborhoodGridProps {
    selectedTiles: Tile[];
    targetTile: Tile;
    invert: boolean;
    onSetTile: (x: number, y: number, selected: boolean) => void;
    onMoveTarget: (x: number, y: number) => void;
    targetPlacementMode: boolean;
}

const NeighborhoodGrid: FC<NeighborhoodGridProps> = (props) => {
    const { selectedTiles = [], targetTile, invert = false, onSetTile = null, onMoveTarget = null, targetPlacementMode = false } = props;
    const [dragMode, setDragMode] = useState<'add' | 'remove' | 'target' | null>(null);
    const tiles: JSX.Element[] = [];

    useEffect(() => {
        const stopDragging = () => setDragMode(null);

        window.addEventListener('mouseup', stopDragging);

        return () => window.removeEventListener('mouseup', stopDragging);
    }, []);

    const beginTileDrag = (event: ReactMouseEvent<HTMLDivElement>, rx: number, ry: number, isSelected: boolean) => {
        event.preventDefault();

        if (targetPlacementMode) {
            setDragMode('target');
            onMoveTarget && onMoveTarget(rx, ry);
            return;
        }

        const nextDragMode = isSelected ? 'remove' : 'add';

        setDragMode(nextDragMode);
        onSetTile && onSetTile(rx, ry, nextDragMode === 'add');
    };

    const continueTileDrag = (event: ReactMouseEvent<HTMLDivElement>, rx: number, ry: number) => {
        if (!(event.buttons & 1) || !dragMode) return;

        if (dragMode === 'target') {
            onMoveTarget && onMoveTarget(rx, ry);
            return;
        }

        onSetTile && onSetTile(rx, ry, dragMode === 'add');
    };

    for (let ry = -GRID_RANGE; ry <= GRID_RANGE; ry++) {
        for (let rx = -GRID_RANGE; rx <= GRID_RANGE; rx++) {
            const isTarget = rx === targetTile.x && ry === targetTile.y;
            const isSelected = tileIncluded(selectedTiles, rx, ry);
            const isActive = invert ? !isSelected : isSelected;
            const left = tileLeft(rx, ry);
            const top = tileTop(rx, ry);
            const zIndex = rx + ry + GRID_RANGE * 2 + 10;

            const diamondStyle: CSSProperties = {
                position: 'absolute',
                width: TILE_W,
                height: TILE_H,
                left,
                top,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                backgroundColor: isActive ? '#3399ff' : '#2a3042',
                cursor: 'pointer',
                zIndex,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isTarget ? '#ffffff' : 'transparent',
                fontSize: 10
            };

            const borderStyle: CSSProperties = {
                position: 'absolute',
                width: TILE_W + (isTarget ? 6 : 2),
                height: TILE_H + (isTarget ? 6 : 2),
                left: left - (isTarget ? 3 : 1),
                top: top - (isTarget ? 3 : 1),
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                backgroundColor: isTarget ? '#ffffff' : isActive ? '#1166cc' : '#1a2032',
                zIndex: zIndex - 1,
                pointerEvents: 'none'
            };

            const outlineStyle: CSSProperties = {
                position: 'absolute',
                width: TILE_W + 4,
                height: TILE_H + 4,
                left: left - 2,
                top: top - 2,
                zIndex: zIndex + 1,
                pointerEvents: 'none',
                overflow: 'visible'
            };

            tiles.push(
                <div key={`border-${rx}-${ry}`} style={borderStyle} />,
                isTarget && (
                    <svg key={`outline-${rx}-${ry}`} style={outlineStyle} viewBox={`0 0 ${TILE_W + 4} ${TILE_H + 4}`}>
                        <polygon
                            points={`${(TILE_W + 4) / 2},2 ${TILE_W + 2},${(TILE_H + 4) / 2} ${(TILE_W + 4) / 2},${TILE_H + 2} 2,${(TILE_H + 4) / 2}`}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="1"
                        />
                    </svg>
                ),
                <div
                    key={`tile-${rx}-${ry}`}
                    style={diamondStyle}
                    title={`(${rx}, ${ry})`}
                    onMouseDown={(event) => beginTileDrag(event, rx, ry, isSelected)}
                    onMouseEnter={(event) => continueTileDrag(event, rx, ry)}
                />
            );
        }
    }

    return (
        <div style={{ position: 'relative', width: GRID_PX_W, height: GRID_PX_H, flexShrink: 0 }} onContextMenu={(event) => event.preventDefault()}>
            {tiles}
        </div>
    );
};

export const WiredNeighborhoodSelectorView: FC<{}> = () => {
    const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
    // The anchor's domain and its native source value (users or furni), straight from the card's metadata.
    const [usersAnchor, setUsersAnchor] = useState(true);
    const [sourceValue, setSourceValue] = useState(0);
    const [targetTile, setTargetTile] = useState<Tile>({ x: 0, y: 0 });
    const [targetPlacementMode, setTargetPlacementMode] = useState(false);
    const [curX, setCurX] = useState(0);
    const [curY, setCurY] = useState(0);

    const { trigger = null, furniIds = [], setIntParams, setUserSources = null, setFurniSources = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();
    const userOptions = useMemo(() => nativeSourceOptions(trigger?.inputSources?.usersAllowed[0], 'users'), [trigger]);
    const furniOptions = useMemo(() => nativeSourceOptions(trigger?.inputSources?.furniAllowed[0], 'furni'), [trigger]);
    const availableUserSources = useAvailableUserSources(trigger, userOptions);

    useEffect(() => {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    }, []);

    useEffect(() => {
        if (!trigger) return;

        // own: [usersAnchorBit, rootX, rootY, 14 words]; the anchor's own source is the U or F tail.
        const params = trigger.intData;
        const usersAnchor = params[0] === 1;

        const anchorsUsers = params[0] === 1;

        setUsersAnchor(anchorsUsers);
        setSourceValue(anchorsUsers ? (trigger.userSources[0] ?? 0) : (trigger.furniSources[0] ?? 100));
        setTargetTile({ x: params[1] ?? 0, y: params[2] ?? 0 });
        setSelectedTiles(neighborhoodWordsToTiles(params.slice(3, 3 + NEIGHBORHOOD_WORDS)));
    }, [trigger]);

    useEffect(() => {
        if (!usersAnchor || sourceValue !== CLICKED_USER_SOURCE_VALUE) return;
        if (availableUserSources.some((option) => option.value === CLICKED_USER_SOURCE_VALUE)) return;

        setSourceValue(0);
    }, [availableUserSources, sourceValue, usersAnchor]);

    // Filter and inverse are category fields; the anchor's source goes to its U or F tail, the other tail keeps its default.
    const save = useCallback(() => {
        setIntParams([usersAnchor ? 1 : 0, targetTile.x, targetTile.y, ...tilesToNeighborhoodWords(selectedTiles)]);
        setUserSources([usersAnchor ? sourceValue : 0]);
        setFurniSources([usersAnchor ? 100 : sourceValue]);
    }, [selectedTiles, setFurniSources, setIntParams, setUserSources, sourceValue, usersAnchor, targetTile.x, targetTile.y]);

    const setTileSelection = useCallback((x: number, y: number, selected: boolean) => {
        setSelectedTiles((previous) => {
            const alreadySelected = tileIncluded(previous, x, y);

            if (selected) {
                if (alreadySelected) return previous;

                return [...previous, { x, y }];
            }

            if (!alreadySelected) return previous;

            return previous.filter((tile) => !(tile.x === x && tile.y === y));
        });
    }, []);

    const activeSources = usersAnchor ? availableUserSources : furniOptions;

    const changeGroup = useCallback(
        (nextIsUserGroup: boolean) => {
            if (nextIsUserGroup === usersAnchor) return;

            const nextOption = (nextIsUserGroup ? availableUserSources : furniOptions)[0];

            setUsersAnchor(nextIsUserGroup);
            if (nextOption) setSourceValue(nextOption.value);
        },
        [availableUserSources, furniOptions, usersAnchor]
    );

    const addTile = useCallback(() => {
        setSelectedTiles((previous) => {
            if (tileIncluded(previous, curX, curY)) return previous;

            return [...previous, { x: curX, y: curY }];
        });
    }, [curX, curY]);

    const removeTile = useCallback(() => {
        setSelectedTiles((previous) => previous.filter((tile) => !(tile.x === curX && tile.y === curY)));
    }, [curX, curY]);

    const loadDefaultPattern = useCallback(() => {
        const nextTiles: Tile[] = [];

        for (let y = -2; y <= 2; y++) {
            for (let x = -2; x <= 2; x++) {
                if (x === 0 && y === 0) continue;

                nextTiles.push({ x, y });
            }
        }

        setSelectedTiles(nextTiles);
    }, []);

    const requiresFurni = !usersAnchor && sourceValue === 100 ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={requiresFurni} save={save} hideDelay={true} cardStyle={{ width: '400px' }}>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.neighborhood_selection')}</Text>

                <div className="flex items-center gap-1">
                    <Button
                        variant={targetPlacementMode ? 'success' : 'secondary'}
                        className="px-2 py-1"
                        onClick={() => setTargetPlacementMode((value) => !value)}
                        title="Sposta target"
                    >
                        <span aria-hidden className="relative inline-block h-[14px] w-[14px]">
                            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
                            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
                            <span className="absolute left-1/2 top-1/2 h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-current" />
                        </span>
                    </Button>
                    <Button variant="success" className="px-2 py-1" onClick={addTile} title={LocalizeText('wiredfurni.tooltip.select.tile')}>
                        <FaPlus />
                    </Button>
                    <Button variant="danger" className="px-2 py-1" onClick={removeTile} title={LocalizeText('wiredfurni.tooltip.remove.tile')}>
                        <FaMinus />
                    </Button>
                    <Button variant="primary" className="px-2 py-1" onClick={loadDefaultPattern} title={LocalizeText('wiredfurni.tooltip.remove.5x5_tile')}>
                        <MdGridOn />
                    </Button>
                    <Button
                        variant="secondary"
                        className="px-2 py-1"
                        onClick={() => setSelectedTiles([])}
                        title={LocalizeText('wiredfurni.tooltip.remove.clear_tile')}
                    >
                        <FaTimes />
                    </Button>
                </div>

                <div className="flex justify-center">
                    <NeighborhoodGrid
                        selectedTiles={selectedTiles}
                        targetTile={targetTile}
                        invert={inverse}
                        onSetTile={setTileSelection}
                        onMoveTarget={(x, y) => setTargetTile({ x, y })}
                        targetPlacementMode={targetPlacementMode}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Text small>X:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: 56 }}
                        value={curX}
                        min={-GRID_RANGE}
                        max={GRID_RANGE}
                        onChange={(event) => setCurX(parseInt(event.target.value) || 0)}
                    />
                    <Text small>Y:</Text>
                    <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: 56 }}
                        value={curY}
                        min={-GRID_RANGE}
                        max={GRID_RANGE}
                        onChange={(event) => setCurY(parseInt(event.target.value) || 0)}
                    />
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-1">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filter}
                        onChange={(event) => setFilter(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-1">
                    <input type="checkbox" className="form-check-input" checked={inverse} onChange={(event) => setInverse(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>

                <hr className="m-0 bg-dark" />

                <WiredFurniSelectionSourceRow
                    title="wiredfurni.params.sources.merged.title.neighborhood"
                    options={activeSources}
                    value={sourceValue}
                    selectionKind={usersAnchor ? 'primary' : 'secondary'}
                    selectionActive={!usersAnchor && sourceValue === 100}
                    selectionCount={furniIds.length}
                    selectionLimit={trigger?.maximumItemSelectionCount ?? 20}
                    selectionEnabledValues={[100]}
                    showSelectionToggle={false}
                    headerContent={
                        <div className="octane-wired__give-var-targets">
                            {SOURCE_GROUP_BUTTONS.map((button) => (
                                <button
                                    key={button.key}
                                    type="button"
                                    className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${usersAnchor === button.isUserGroup ? 'is-active' : ''}`}
                                    onClick={() => changeGroup(button.isUserGroup)}
                                >
                                    <img src={button.icon} alt={button.key} />
                                </button>
                            ))}
                        </div>
                    }
                    onChange={(value) => setSourceValue(value)}
                />

                {!usersAnchor && sourceValue === 100 && (
                    <Text small className="text-center">
                        {LocalizeText(
                            'wiredfurni.pickfurnis.caption',
                            ['count', 'limit'],
                            [furniIds.length.toString(), (trigger?.maximumItemSelectionCount ?? 20).toString()]
                        )}
                    </Text>
                )}
            </div>
        </WiredSelectorBaseView>
    );
};
