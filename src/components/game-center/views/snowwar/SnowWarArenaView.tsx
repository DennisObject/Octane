import { GetDesiredResolution, GetRenderer, GetRoomEngine, GetStage, VoltSprite, VoltTexture, RoomGeometry, RoomVariableEnum, Vector3d } from '@volt/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { AddAnimationTickerCallback, ISnowWarEngine, SetActiveRoomId, SnowWarArenaPlayerName, SnowWarArenaRoom, SnowWarChatMessage, SnowWarEngineState, SNOWWAR_ROOM_ID } from '../../../../api';
import { useSnowWar } from '../../../../hooks';
import { SnowWarArenaChatView } from './SnowWarArenaChatView';
import { SnowWarArenaPlayerNameView } from './SnowWarArenaPlayerNameView';

const CANVAS_ID = 1;

const getViewportSize = () =>
{
    const viewport = window.visualViewport;

    return {
        width: Math.max(1, Math.floor(viewport?.width ?? window.innerWidth)),
        height: Math.max(1, Math.floor(viewport?.height ?? window.innerHeight))
    };
};

// AIR RoomDesktop listens to every canvas click in a game session; DispatchMouseEvent would turn quick repeat throws into double clicks.
const dispatchArenaMouseEvent = (event: MouseEvent) => GetRoomEngine().dispatchMouseEvent(CANVAS_ID, event.clientX, event.clientY, event.type, event.altKey, (event.ctrlKey || event.metaKey), event.shiftKey, false);

/** AIR builds the game room on StageLoad, right after EnterArena, and keeps it until the game is over (`initView` / `gameOver`). */
const isArenaState = (state: number) => (state >= SnowWarEngineState.GAME_STARTING) && (state <= SnowWarEngineState.STAGE_ENDING);

export const SnowWarArenaView: FC = () =>
{
    const { engine, state, chatMessages, arenaViewId } = useSnowWar();

    // One room per game: a rematch remounts it from the new arena's level once its StageLoad arrived.
    if(!engine || !engine.level || !arenaViewId || (arenaViewId !== engine.arenaId) || !isArenaState(state)) return null;

    // The room UI only becomes visible on StageStarting (`SnowWarEngine.startStage`); the loading view covers it before.
    return <SnowWarArenaStageView key={ arenaViewId } engine={ engine } chatMessages={ chatMessages } visible={ state >= SnowWarEngineState.STAGE_STARTING } />;
};

export const SnowWarArenaStageView: FC<{ engine: ISnowWarEngine; chatMessages: readonly SnowWarChatMessage[]; visible: boolean }> = ({ engine, chatMessages, visible }) =>
{
    const elementRef = useRef<HTMLDivElement>(null);
    const [ playerNames, setPlayerNames ] = useState<SnowWarArenaPlayerName[]>([]);

    // AIR AvatarInfoWidget.showGamePlayerName: one bubble per player, not restarted while it shows.
    const showPlayerName = useCallback((playerName: SnowWarArenaPlayerName) => setPlayerNames(names => (names.some(name => (name.objectId === playerName.objectId)) ? names : [ ...names, playerName ])), []);
    const hidePlayerName = useCallback((objectId: number) => setPlayerNames(names => names.filter(name => (name.objectId !== objectId))), []);

    useEffect(() =>
    {
        const element = elementRef.current;
        const roomEngine = GetRoomEngine();
        const renderer = GetRenderer();
        const room = new SnowWarArenaRoom(engine, showPlayerName);

        room.init();

        const { width, height } = getViewportSize();

        renderer.resize(width, height, GetDesiredResolution());

        // AIR RoomDesktop: a game session gets a scale 32 canvas centred on the room bounds, with no camera target.
        const displayObject = roomEngine.getRoomInstanceDisplay(SNOWWAR_ROOM_ID, CANVAS_ID, width, height, RoomGeometry.SCALE_ZOOMED_OUT);
        const canvas = roomEngine.getRoomInstanceRenderingCanvas(SNOWWAR_ROOM_ID, CANVAS_ID);
        const background = new VoltSprite(VoltTexture.WHITE);

        background.tint = 0;
        background.width = width;
        background.height = height;
        canvas.master.addChildAt(background, 0);

        const geometry = roomEngine.getRoomInstanceGeometry(SNOWWAR_ROOM_ID, CANVAS_ID) as RoomGeometry;

        if(geometry)
        {
            const minX = roomEngine.getRoomInstanceVariable<number>(SNOWWAR_ROOM_ID, RoomVariableEnum.ROOM_MIN_X) || 0;
            const maxX = roomEngine.getRoomInstanceVariable<number>(SNOWWAR_ROOM_ID, RoomVariableEnum.ROOM_MAX_X) || 0;
            const minY = roomEngine.getRoomInstanceVariable<number>(SNOWWAR_ROOM_ID, RoomVariableEnum.ROOM_MIN_Y) || 0;
            const maxY = roomEngine.getRoomInstanceVariable<number>(SNOWWAR_ROOM_ID, RoomVariableEnum.ROOM_MAX_Y) || 0;
            const offset = 20;

            geometry.location = new Vector3d((((minX + maxX) / 2) + (offset - 1)), (((minY + maxY) / 2) + (offset - 1)), (Math.sqrt((offset * offset) + (offset * offset)) * Math.tan((30 / 180) * Math.PI)));
        }

        const previousActiveRoomId = roomEngine.activeRoomId;

        GetStage().addChild(displayObject);
        SetActiveRoomId(SNOWWAR_ROOM_ID);

        const htmlCanvas = renderer.canvas;
        const previousParent = htmlCanvas.parentElement;
        const previousHandlers = { click: htmlCanvas.onclick, move: htmlCanvas.onmousemove, down: htmlCanvas.onmousedown, up: htmlCanvas.onmouseup };

        htmlCanvas.onclick = dispatchArenaMouseEvent;
        htmlCanvas.onmousemove = dispatchArenaMouseEvent;
        htmlCanvas.onmousedown = dispatchArenaMouseEvent;
        htmlCanvas.onmouseup = dispatchArenaMouseEvent;
        element.prepend(htmlCanvas);

        const resize = () =>
        {
            const { width: newWidth, height: newHeight } = getViewportSize();
            const offsetX = canvas.screenOffsetX - ((newWidth - canvas.width) / 2);
            const offsetY = canvas.screenOffsetY - ((newHeight - canvas.height) / 2);

            renderer.resize(newWidth, newHeight, GetDesiredResolution());

            background.width = newWidth;
            background.height = newHeight;

            canvas.initialize(newWidth, newHeight);
            canvas.screenOffsetX = ~~offsetX;
            canvas.screenOffsetY = ~~offsetY;
        };

        window.addEventListener('resize', resize);

        const removeTicker = AddAnimationTickerCallback(() => room.update());

        return () =>
        {
            removeTicker();
            window.removeEventListener('resize', resize);

            htmlCanvas.onclick = previousHandlers.click;
            htmlCanvas.onmousemove = previousHandlers.move;
            htmlCanvas.onmousedown = previousHandlers.down;
            htmlCanvas.onmouseup = previousHandlers.up;

            if(previousParent && (previousParent !== element)) previousParent.appendChild(htmlCanvas);

            if(displayObject.parent) displayObject.parent.removeChild(displayObject);

            room.dispose();
            SetActiveRoomId(previousActiveRoomId);
        };
    }, [ engine, showPlayerName ]);

    return (
        <div ref={ elementRef } className="absolute inset-0 overflow-hidden bg-black" style={ { visibility: visible ? 'visible' : 'hidden' } }>
            <SnowWarArenaChatView chatMessages={ chatMessages } />
            { playerNames.map(playerName => <SnowWarArenaPlayerNameView key={ playerName.objectId } playerName={ playerName } onClose={ hidePlayerName } />) }
        </div>
    );
};
