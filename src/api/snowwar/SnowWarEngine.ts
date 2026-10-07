import { Game2GetAccountGameStatusMessageComposer, Game2LoadStageReadyMessageComposer, Game2MakeSnowballMessageComposer, Game2RequestFullStatusUpdateMessageComposer, Game2SetUserMoveTargetMessageComposer, Game2ThrowSnowballAtHumanMessageComposer, Game2ThrowSnowballAtPositionMessageComposer } from '@octane/renderer';
import type { IMessageComposer } from '@octane/renderer';
import { SUBTURN_MS, SUBTURNS_PER_TURN, TILE_WIDTH } from './SnowWarMath';
import { SnowWarHumanObject, SnowWarStage } from './SnowWarSimulation';
import type { SnowWarSimEventData, SnowWarSimNotification, SnowWarSimObjectData } from './SnowWarSimulation';
import { SnowWarEngineState, SnowWarTrajectory } from './SnowWarTypes';
import type { ISnowWarEngine, ISnowWarHuman, ISnowWarObject, SnowWarArenaPlayer, SnowWarClickModifiers, SnowWarEngineEvent, SnowWarEngineEventType, SnowWarEngineListener, SnowWarEngineStateId, SnowWarLevel, SnowWarTileInfo } from './SnowWarTypes';

export interface SnowWarEngineDependencies
{
    send(composer: IMessageComposer<unknown[]>): void;
    playSound(name: string): void;
    getOwnUser(): { userId: number; userName: string };
}

const TICK_MS = 10;

/** `class_2936` click types. */
const CLICK_MOVE = 0;
const CLICK_FAST = 1;
const CLICK_LONG_LOB = 2;
const CLICK_SHORT_LOB = 3;
const CLICK_DEFAULT = 4;

const clickTypeOnTile = ({ altKey, shiftKey }: SnowWarClickModifiers): number =>
    altKey ? (shiftKey ? CLICK_SHORT_LOB : CLICK_LONG_LOB) : (shiftKey ? CLICK_FAST : CLICK_MOVE);

const clickTypeOnOpponent = ({ altKey, shiftKey }: SnowWarClickModifiers): number =>
    altKey ? (shiftKey ? CLICK_SHORT_LOB : CLICK_LONG_LOB) : (shiftKey ? CLICK_FAST : CLICK_DEFAULT);

/** `SnowWarEngine.getTrajectoryFromClickType`. */
const trajectoryFromClickType = (clickType: number): number =>
{
    switch(clickType)
    {
        case CLICK_FAST: return SnowWarTrajectory.QUICK;
        case CLICK_LONG_LOB: return SnowWarTrajectory.LONG_LOB;
        case CLICK_SHORT_LOB: return SnowWarTrajectory.SHORT_LOB;
        default: return SnowWarTrajectory.DEFAULT;
    }
};

/**
 * AIR `SnowWarEngine`: state machine, lockstep pulse/catch-up loop with checksum validation, input
 * composers and the arena half of `class_1951` (object setup, GameStatus queueing, full-status resync).
 * Lobby, loading and results data live in `useSnowWar`, which drives the state transitions it owns.
 */
export class SnowWarEngine implements ISnowWarEngine
{
    private _state: SnowWarEngineStateId = SnowWarEngineState.INACTIVE;
    private _ownId = -1;
    private _gameType = 0;
    private _fieldType = 0;
    private _numberOfTeams = 0;
    private _level: SnowWarLevel = null;
    private _players: SnowWarArenaPlayer[] = [];
    private _stage: SnowWarStage = null;
    private _stageLength = 0;
    private _version = 0;

    private _timeSinceLastUpdate = 0;
    private _currentSubTurn = 0;
    private _maxSubTurn = 0;
    private _lastServerTurn = 0;
    private _serverChecksums = new Map<number, number>();
    private _waitingForFullStatus = false;
    private _lastTimerSeconds = -1;

    private _stageLoadReceived = false;
    private _stageLoadedPending = false;
    private _stageReadySent = false;

    private _ticker: ReturnType<typeof setInterval> = null;
    private _lastTickAt = 0;
    private _objectsCache: ISnowWarObject[] = null;
    private _humansCache: ISnowWarHuman[] = null;
    private _listeners = new Set<(event: SnowWarEngineEvent) => void>();

    constructor(private readonly _dependencies: SnowWarEngineDependencies)
    {
    }

    // ---- read surface ----

    public get state(): SnowWarEngineStateId
    {
        return this._state;
    }

    public get ownId(): number
    {
        return this._ownId;
    }

    public get gameType(): number
    {
        return this._gameType;
    }

    public get fieldType(): number
    {
        return this._fieldType;
    }

    public get numberOfTeams(): number
    {
        return this._numberOfTeams;
    }

    public get isDeathMatch(): boolean
    {
        return this._numberOfTeams === 1;
    }

    public get level(): SnowWarLevel
    {
        return this._level;
    }

    public get players(): readonly SnowWarArenaPlayer[]
    {
        return this._players;
    }

    public get turn(): number
    {
        return this._stage?.turn ?? 0;
    }

    public get subturn(): number
    {
        return this._stage?.subturn ?? 0;
    }

    public get currentSubTurn(): number
    {
        return this._currentSubTurn;
    }

    public get stageLength(): number
    {
        return this._stageLength;
    }

    public get secondsLeft(): number
    {
        return Math.max(0, Math.trunc(this._stageLength - ((this._currentSubTurn * SUBTURN_MS) / 1000)));
    }

    public get teamScores(): readonly number[]
    {
        return this._stage?.teamScores ?? [];
    }

    public get version(): number
    {
        return this._version;
    }

    public get subturnFraction(): number
    {
        if(!this._stage || this._waitingForFullStatus || this._currentSubTurn >= this._maxSubTurn) return 0;

        return Math.min(1, this._timeSinceLastUpdate / SUBTURN_MS);
    }

    public getObjects(): readonly ISnowWarObject[]
    {
        if(!this._stage) return [];

        if(!this._objectsCache) this._objectsCache = this._stage.getGameObjects() as unknown as ISnowWarObject[];

        return this._objectsCache;
    }

    public getObject(id: number): ISnowWarObject
    {
        return (this._stage?.getGameObject(id) as unknown as ISnowWarObject) ?? null;
    }

    public getHumans(): readonly ISnowWarHuman[]
    {
        if(!this._stage) return [];

        if(!this._humansCache) this._humansCache = this._stage.getGameObjects().filter(object => object instanceof SnowWarHumanObject);

        return this._humansCache;
    }

    public getOwnHuman(): ISnowWarHuman
    {
        return this.ownHuman();
    }

    public getTile(x: number, y: number): SnowWarTileInfo
    {
        const tile = this._stage?.getTileAt(x, y);

        if(!tile) return null;

        return { x, y, height: tile.height, walkable: tile.canMoveTo(), occupantId: tile.gameObject?.id ?? null };
    }

    // ---- input (SnowWarEngine.as:623-781) ----

    public clickTile(tileX: number, tileY: number, modifiers: SnowWarClickModifiers): void
    {
        if(this._state !== SnowWarEngineState.STAGE_RUNNING) return;

        const clickType = clickTypeOnTile(modifiers);

        if(clickType === CLICK_MOVE) this.moveTo(tileX, tileY);
        else this.throwAtPosition(tileX, tileY, trajectoryFromClickType(clickType));
    }

    public clickHuman(humanId: number, modifiers: SnowWarClickModifiers): void
    {
        if(this._state !== SnowWarEngineState.STAGE_RUNNING) return;

        if(humanId === this._ownId)
        {
            this.makeSnowball();

            return;
        }

        if(this.isOpponent(humanId)) this.throwAtHuman(humanId, trajectoryFromClickType(clickTypeOnOpponent(modifiers)));
    }

    public moveTo(tileX: number, tileY: number): void
    {
        if(this._state !== SnowWarEngineState.STAGE_RUNNING || !this.ownHuman()) return;

        this._dependencies.send(new Game2SetUserMoveTargetMessageComposer(tileX * TILE_WIDTH, tileY * TILE_WIDTH, this.turn, this.subturn));
    }

    public throwAtPosition(tileX: number, tileY: number, trajectory: number): void
    {
        if(!this.canThrow()) return;

        this._dependencies.send(new Game2ThrowSnowballAtPositionMessageComposer(tileX * TILE_WIDTH, tileY * TILE_WIDTH, trajectory, this.turn, this.subturn));
    }

    public throwAtHuman(humanId: number, trajectory: number): void
    {
        if(!this.canThrow() || !this.isOpponent(humanId)) return;

        this._dependencies.send(new Game2ThrowSnowballAtHumanMessageComposer(humanId, trajectory, this.turn, this.subturn));
    }

    public makeSnowball(): boolean
    {
        if(!this.canMakeSnowball()) return false;

        this._dependencies.send(new Game2MakeSnowballMessageComposer(this.turn, this.subturn));
        this.emit({ type: 'makeStart', humanId: this._ownId });

        return true;
    }

    public canThrow(): boolean
    {
        return this._state === SnowWarEngineState.STAGE_RUNNING && !!this.ownHuman()?.canThrowSnowballs();
    }

    public canMakeSnowball(): boolean
    {
        return this._state === SnowWarEngineState.STAGE_RUNNING && !!this.ownHuman()?.canMakeSnowballs();
    }

    public isOpponent(humanId: number): boolean
    {
        const own = this.ownHuman();
        const target = this._stage?.getGameObject(humanId);

        return !!own && (target instanceof SnowWarHumanObject) && target !== own && own.team !== target.team;
    }

    public notifyStageLoaded(): void
    {
        if(!this._stage || this._stageReadySent) return;

        if(!this._stageLoadReceived)
        {
            this._stageLoadedPending = true;

            return;
        }

        this._stageReadySent = true;
        this._dependencies.send(new Game2LoadStageReadyMessageComposer(100));
    }

    // ---- events ----

    public on<T extends SnowWarEngineEventType>(type: T, listener: SnowWarEngineListener<T>): () => void
    {
        return this.subscribe(event =>
        {
            if(event.type === type) listener(event as Extract<SnowWarEngineEvent, { type: T }>);
        });
    }

    public subscribe(listener: (event: SnowWarEngineEvent) => void): () => void
    {
        this._listeners.add(listener);

        return () => this._listeners.delete(listener);
    }

    private emit(event: SnowWarEngineEvent): void
    {
        for(const listener of [ ...this._listeners ]) listener(event);
    }

    private onSimulationNotification = (notification: SnowWarSimNotification): void =>
    {
        switch(notification.type)
        {
            case 'sound':
                this._dependencies.playSound(notification.name);
                return;
            case 'stopWaitingForSnowball':
                if(notification.humanId === this._ownId) this.emit({ type: 'makeEnd', humanId: notification.humanId });
                return;
            case 'objectAdded':
            case 'objectRemoved':
                this._objectsCache = null;
                this._humansCache = null;
                break;
        }

        this.emit(notification);
    };

    // ---- state machine and arena lifecycle (driven by useSnowWar) ----

    public setState(state: SnowWarEngineStateId): void
    {
        if(this._state === state) return;

        const previous = this._state;

        this._state = state;
        this.emit({ type: 'stateChanged', state, previous });
    }

    /** `gameStarted`: loading view opens. */
    public gameStarted(): void
    {
        this._serverChecksums = new Map();
        this.setState(SnowWarEngineState.GAME_STARTING);
    }

    /** `initArena` + `class_2527.initialize` (EnterArena). */
    public enterArena(gameType: number, fieldType: number, numberOfTeams: number, players: SnowWarArenaPlayer[], level: SnowWarLevel): void
    {
        if(this._stage) return;

        this._gameType = gameType;
        this._fieldType = fieldType;
        this._numberOfTeams = numberOfTeams;
        this._players = players;
        this._level = level;
        this._ownId = -1;
        this._stageLength = 0;
        this._stageLoadReceived = false;
        this._stageLoadedPending = false;
        this._stageReadySent = false;
        this._stage = new SnowWarStage(numberOfTeams, this.onSimulationNotification);
        this._stage.initialize(level);
        this._timeSinceLastUpdate = 0;
        this._currentSubTurn = 0;
        this._maxSubTurn = 0;
        this._waitingForFullStatus = false;
        this._lastTimerSeconds = -1;
        this.invalidate();
        this.startTicker();
    }

    /** StageLoad: the view may now report its objects initialised (LoadStageReady). */
    public stageLoad(): void
    {
        this._stageLoadReceived = true;

        if(this._stageLoadedPending)
        {
            this._stageLoadedPending = false;
            this.notifyStageLoaded();
        }
    }

    /** `stageLoading`: per-player load progress while the loading screen is up. */
    public stageLoading(): void
    {
        if(this._state === SnowWarEngineState.GAME_STARTING || this._state === SnowWarEngineState.STAGE_LOADING) this.setState(SnowWarEngineState.STAGE_LOADING);
    }

    /** StageStarting: objects are created and the countdown starts (`startStage`). */
    public stageStarting(countDown: number, objects: readonly SnowWarSimObjectData[]): void
    {
        if(!this._stage) return;

        this.initializeGameObjects(objects);
        this._dependencies.playSound('HBSTG_ig_countdown');
        this.setState(SnowWarEngineState.STAGE_STARTING);
        this.emit({ type: 'countdown', countDown });
    }

    /** `stageRunning`. */
    public stageRunning(timeToStageEnd: number): void
    {
        if(timeToStageEnd > 0)
        {
            this._stageLength = timeToStageEnd;
            this.setState(SnowWarEngineState.STAGE_RUNNING);
        }
        else
        {
            this.setState(SnowWarEngineState.STAGE_ENDING);
        }

        this._currentSubTurn = 0;
        this._maxSubTurn = 0;
        this.emit({ type: 'stageRunning', stageLength: this._stageLength });
    }

    /** `handleGameStatus`: events of GameStatus(turn) run at turn + 1. */
    public gameStatus(turn: number, checksum: number, events: readonly (readonly SnowWarSimEventData[])[]): void
    {
        if(!this._stage) return;

        this._stage.queueGameStatus(turn, events);
        this.nextTurn(turn, checksum, false);
    }

    /** `onFullGameStatus`: rebuild the objects and seek to the server turn. */
    public fullGameStatus(objects: readonly SnowWarSimObjectData[], turn: number, checksum: number, events: readonly (readonly SnowWarSimEventData[])[]): void
    {
        if(!this._stage) return;

        this._stage.resetTiles();
        this.initializeGameObjects(objects);
        this._stage.seekToTurn(turn, checksum);
        this._stage.queueGameStatus(turn, events);
        this.nextTurn(turn, checksum, true);
        this.emit({ type: 'fullStatus', turn });
    }

    /** StageEnding(0) / exit: `resetGameSession` — stops the simulation and refreshes the games left. */
    public resetGameSession(): void
    {
        this.setState(SnowWarEngineState.STAGE_ENDING);
        this.stopTicker();
        this._stage = null;
        this.invalidate();
        this._dependencies.send(new Game2GetAccountGameStatusMessageComposer(0));
    }

    /** Leaves every game state (game cancelled / results closed). */
    public reset(): void
    {
        this.stopTicker();
        this._stage = null;
        this._level = null;
        this._players = [];
        this._ownId = -1;
        this.invalidate();
        this.setState(SnowWarEngineState.INACTIVE);
    }

    private initializeGameObjects(objects: readonly SnowWarSimObjectData[]): void
    {
        this._stage.initializeGameObjects(objects);

        const own = this._dependencies.getOwnUser();

        for(const object of this._stage.getGameObjects())
        {
            if((object instanceof SnowWarHumanObject) && (object.name === own.userName || object.userId === own.userId)) this._ownId = object.id;
        }

        this.invalidate();
    }

    /** `nextTurn`. */
    private nextTurn(turn: number, checksum: number, fullStatus: boolean): void
    {
        this._lastServerTurn = turn;
        this._serverChecksums.set(turn, checksum);
        this._serverChecksums.delete(turn - 64);
        this._maxSubTurn = (turn + 1) * SUBTURNS_PER_TURN;

        if(!fullStatus) return;

        this._currentSubTurn = this._maxSubTurn - SUBTURNS_PER_TURN;
        this._timeSinceLastUpdate = SUBTURN_MS;
        this._waitingForFullStatus = false;
    }

    // ---- lockstep loop (SnowWarEngine.update) ----

    private startTicker(): void
    {
        this.stopTicker();
        this._lastTickAt = performance.now();
        this._ticker = setInterval(() =>
        {
            const now = performance.now();
            const delta = now - this._lastTickAt;

            this._lastTickAt = now;
            this.update(delta);
        }, TICK_MS);
    }

    private stopTicker(): void
    {
        if(this._ticker !== null) clearInterval(this._ticker);

        this._ticker = null;
    }

    public update(delta: number): void
    {
        const stage = this._stage;

        if(!stage) return;

        this._timeSinceLastUpdate += delta;

        if(this._waitingForFullStatus || this._timeSinceLastUpdate <= SUBTURN_MS || this._currentSubTurn >= this._maxSubTurn) return;

        stage.pulse();
        this._timeSinceLastUpdate -= SUBTURN_MS;
        this._currentSubTurn++;

        if(this._timeSinceLastUpdate > SUBTURN_MS) this._timeSinceLastUpdate = 0;

        let behind = this._maxSubTurn - this._currentSubTurn;

        while(behind-- > SUBTURNS_PER_TURN)
        {
            stage.pulse();
            this._currentSubTurn++;
        }

        this.invalidate();

        if(this._currentSubTurn % SUBTURNS_PER_TURN === 0) this.validateTurn(stage);

        this.updateTimer();
    }

    private validateTurn(stage: SnowWarStage): void
    {
        const turn = stage.turn - 1;
        const clientChecksum = stage.getChecksum(turn);
        const serverChecksum = this._serverChecksums.get(turn) ?? 0;
        const tooFarBehind = turn < this._lastServerTurn - 3;
        const mismatch = serverChecksum !== clientChecksum;

        if(!tooFarBehind && !mismatch) return;

        const reason = tooFarBehind ? 0 : 1;

        this._dependencies.send(new Game2RequestFullStatusUpdateMessageComposer(reason));
        this._waitingForFullStatus = true;
        this.emit({ type: 'resync', reason, turn });
    }

    private updateTimer(): void
    {
        if(this._state !== SnowWarEngineState.STAGE_RUNNING) return;

        const seconds = this.secondsLeft;

        if(seconds === this._lastTimerSeconds) return;

        this._lastTimerSeconds = seconds;
        this.emit({ type: 'timer', secondsLeft: seconds, warning: seconds > 0 && seconds <= 5 });
    }

    private invalidate(): void
    {
        this._version++;
        this._objectsCache = null;
        this._humansCache = null;
    }

    private ownHuman(): SnowWarHumanObject
    {
        const own = this._stage?.getGameObject(this._ownId);

        return (own instanceof SnowWarHumanObject) ? own : null;
    }
}
