import type { IObjectData } from '@octane/renderer';

// Public contract of the SnowStorm engine (AIR `SnowWarEngine`) and of `useSnowWar`.
// Views read these shapes; the engine owns the deterministic lockstep simulation.

/** AIR `SnowWarEngine.STATE_*` (SnowWarEngine.as:78-92). */
export const SnowWarEngineState = {
    INACTIVE: 0,
    GAME_STARTING: 1,
    STAGE_LOADING: 2,
    STAGE_STARTING: 3,
    STAGE_RUNNING: 4,
    STAGE_ENDING: 5,
    GAME_OVER: 6,
    REJOIN_GAME: 7
} as const;

export type SnowWarEngineStateId = (typeof SnowWarEngineState)[keyof typeof SnowWarEngineState];

/** Game object type ids on the wire and in the checksum (`SnowWarGameObjectData.as:8-16`). */
export const SnowWarObjectType = {
    SNOWBALL: 1,
    TREE: 2,
    PILE: 3,
    MACHINE: 4,
    HUMAN: 5
} as const;

/** `HumanGameObject.ACTIVITY_STATE_*`. */
export const SnowWarActivityState = {
    NORMAL: 0,
    MAKING_SNOWBALL: 1,
    STUNNED: 2,
    INVINCIBLE: 3
} as const;

/** `SnowBallGameObject.TRAJECTORY_*`. */
export const SnowWarTrajectory = {
    QUICK: 0,
    SHORT_LOB: 1,
    LONG_LOB: 2,
    DEFAULT: 3
} as const;

export type SnowWarPosture = 'swthrow' | 'swpick' | 'swdieback' | 'swrun' | 'std';

/** World units: tile * 3200. Room coordinates for rendering: x / 3200, y / 3200, snowball z / 1600. */
export interface ISnowWarHuman
{
    readonly type: 5;
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly tileX: number;
    readonly tileY: number;
    readonly nextTileX: number;
    readonly nextTileY: number;
    readonly moveTargetX: number;
    readonly moveTargetY: number;
    /** Direction8 0..7, 0 = N(-y), 2 = E(+x). */
    readonly bodyDirection: number;
    readonly hitPoints: number;
    readonly snowballs: number;
    readonly activityState: number;
    readonly activityTimer: number;
    /** Subturns left on the throw pose (0..5); not part of the checksum. */
    readonly throwTimer: number;
    readonly isMoving: boolean;
    readonly posture: SnowWarPosture;
    readonly isStunned: boolean;
    readonly isInvincible: boolean;
    readonly score: number;
    readonly team: number;
    readonly userId: number;
    readonly name: string;
    readonly mission: string;
    readonly figure: string;
    readonly sex: string;
}

export interface ISnowWarSnowball
{
    readonly type: 1;
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly direction360: number;
    readonly trajectory: number;
    readonly timeToLive: number;
    readonly throwerId: number;
    readonly parabolaOffset: number;
    readonly planarVelocity: number;
}

export interface ISnowWarTree
{
    readonly type: 2;
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly direction: number;
    readonly height: number;
    readonly fuseObjectId: number;
    readonly maxHits: number;
    /** Furni visual state. */
    readonly hits: number;
}

export interface ISnowWarPile
{
    readonly type: 3;
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly maxSnowballs: number;
    readonly snowballCount: number;
    readonly fuseObjectId: number;
}

export interface ISnowWarMachine
{
    readonly type: 4;
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly direction: number;
    readonly maxSnowballs: number;
    readonly snowballCount: number;
    readonly fuseObjectId: number;
}

export type ISnowWarObject = ISnowWarHuman | ISnowWarSnowball | ISnowWarTree | ISnowWarPile | ISnowWarMachine;

/** AIR `FuseObjectData`; `state` is the legacy string stuff data (furni state). */
export interface SnowWarFuseObject
{
    name: string;
    id: number;
    x: number;
    y: number;
    xDimension: number;
    yDimension: number;
    height: number;
    direction: number;
    altitude: number;
    canStandOn: boolean;
    /** Legacy string of the stuff data (furni state). */
    state: string;
    /** The parsed stuff data, for creating the furni like room furni (e.g. MapStuffData branding). */
    stuffData: IObjectData;
}

/** AIR `GameLevelData`; heightMap rows are split by `\r`. */
export interface SnowWarLevel
{
    width: number;
    height: number;
    heightMap: string;
    fuseObjects: SnowWarFuseObject[];
}

/** AIR `Game2PlayerData`. */
export interface SnowWarArenaPlayer
{
    referenceId: number;
    userName: string;
    figure: string;
    gender: string;
    teamId: number;
}

/** AIR `GameLobbyPlayerData`. */
export interface SnowWarLobbyPlayer
{
    userId: number;
    name: string;
    figure: string;
    gender: string;
    teamId: number;
    skillLevel: number;
    totalScore: number;
    scoreToNextLevel: number;
}

/** AIR `GameLobbyData`. */
export interface SnowWarLobbyData
{
    gameId: number;
    levelName: string;
    gameType: number;
    fieldType: number;
    numberOfTeams: number;
    maximumPlayers: number;
    owningPlayerName: string;
    levelEntryId: number;
    players: SnowWarLobbyPlayer[];
}

export interface SnowWarPlayerStats
{
    score: number;
    kills: number;
    deaths: number;
    snowballHits: number;
    snowballHitsTaken: number;
    snowballsThrown: number;
    snowballsCreated: number;
    snowballsFromMachine: number;
    friendlyHits: number;
    friendlyKills: number;
}

export interface SnowWarTeamPlayer
{
    userName: string;
    userId: number;
    figure: string;
    gender: string;
    score: number;
    teamId: number;
    stats: SnowWarPlayerStats;
}

export interface SnowWarTeamScore
{
    teamReference: number;
    score: number;
    players: SnowWarTeamPlayer[];
}

/** AIR `Game2GameResult`; resultType 2 = tie. */
export interface SnowWarGameResult
{
    isDeathMatch: boolean;
    resultType: number;
    winnerId: number;
}

/**
 * Results window mode, AIR `GameEndingViewController.var_65`:
 * results (rematch countdown) → rematchRequested → waiting → lobby (countdown), or afterSki when not rematching.
 */
export type SnowWarResultsMode = 'results' | 'rematchRequested' | 'waiting' | 'lobby' | 'afterSki';

export interface SnowWarResults
{
    mode: SnowWarResultsMode;
    result: SnowWarGameResult;
    teams: SnowWarTeamScore[];
    playerWithMostKills: number;
    playerWithMostHits: number;
    /** Wall-clock deadline (ms) of the results/rematch or lobby countdown; null when none runs. */
    countdownDeadline: number | null;
    rematchUserIds: number[];
    /** Players of the rematch lobby (mode 'waiting' | 'lobby'). */
    lobbyPlayers: SnowWarLobbyPlayer[];
    lobby: SnowWarLobbyData | null;
}

export interface SnowWarLobbyState
{
    data: SnowWarLobbyData;
    players: SnowWarLobbyPlayer[];
    /** -1 until Game2InArenaQueue arrives (AIR GameLobbyWindowCtrl shows "waiting for more players" then). */
    queuePosition: number;
    /** Wall-clock deadline (ms) of `Game2StartCounter`; null while waiting for players. */
    countdownDeadline: number | null;
}

export interface SnowWarLoadingState
{
    lobby: SnowWarLobbyData;
    percentage: number;
    finishedUserIds: number[];
}

export interface SnowWarDirectoryStatus
{
    /** 0 = available. */
    status: number;
    blockLength: number;
    gamesPlayed: number;
    freeGamesLeft: number;
}

export interface SnowWarAccountStatus
{
    gameTypeId: number;
    freeGamesLeft: number;
    gamesPlayedTotal: number;
    hasUnlimitedGames: boolean;
}

/** AIR leaderboard tables: all time = Total/Friends/TotalGroup, this week = Weekly/WeeklyFriends/WeeklyGroup. */
export type SnowWarLeaderboardKind = 'total' | 'friends' | 'totalGroup' | 'weekly' | 'weeklyFriends' | 'weeklyGroup';

export interface SnowWarLeaderboardEntry
{
    userId: number;
    score: number;
    rank: number;
    name: string;
    figure: string;
    gender: string;
}

export interface SnowWarLeaderboard
{
    kind: SnowWarLeaderboardKind;
    entries: SnowWarLeaderboardEntry[];
    totalListSize: number;
    year: number;
    week: number;
    maxOffset: number;
    currentOffset: number;
    minutesUntilReset: number;
    favouriteGroupId: number;
}

export interface SnowWarLeaderboardRequest
{
    kind: SnowWarLeaderboardKind;
    /** -1 = around me. */
    startRank?: number;
    /** 0 down, 1 up. */
    direction?: number;
    /** Weekly kinds only. */
    weekOffset?: number;
    viewSize?: number;
    windowSize?: number;
}

export interface SnowWarTokenOffer
{
    offerId: number;
    localizationId: string;
    priceCredits: number;
    pricePoints: number;
    pointsType: number;
}

export interface SnowWarChatMessage
{
    id: number;
    userId: number;
    name: string;
    figure: string;
    gender: string;
    teamId: number;
    message: string;
    receivedAt: number;
}

export interface SnowWarClickModifiers
{
    altKey: boolean;
    shiftKey: boolean;
}

export interface SnowWarTileInfo
{
    x: number;
    y: number;
    height: number;
    walkable: boolean;
    occupantId: number | null;
}

/** View events, emitted when the simulation applies them (not when the packet lands). */
export type SnowWarEngineEvent =
    | { type: 'stateChanged'; state: SnowWarEngineStateId; previous: SnowWarEngineStateId }
    /** StageStarting: objects are in place, the explosion countdown (≈5.5 s) starts. */
    | { type: 'countdown'; countDown: number }
    | { type: 'stageRunning'; stageLength: number }
    | { type: 'throw'; humanId: number; targetHumanId: number | null; targetX: number; targetY: number; trajectory: number }
    | { type: 'snowballCreated'; snowballId: number; humanId: number }
    /** Any snowball hit on a human, including a teammate absorbing it (damaged = false). */
    | { type: 'hit'; humanId: number; byHumanId: number; damaged: boolean; knockedDown: boolean; snowballId: number }
    | { type: 'knockdown'; humanId: number; byHumanId: number }
    | { type: 'objectHit'; objectId: number; objectType: number; snowballId: number }
    /** Snowball removed by a collision; the view shows the splash for 500 ms at (x, y, z). */
    | { type: 'splash'; snowballId: number; x: number; y: number; z: number; ground: boolean }
    | { type: 'miss'; snowballId: number; x: number; y: number; z: number }
    | { type: 'pickup'; humanId: number; sourceId: number; count: number }
    | { type: 'machineRefill'; machineId: number; snowballCount: number }
    /** Own avatar: snowball request accepted locally (AIR startWaitingForSnowball) / finished or cancelled. */
    | { type: 'makeStart'; humanId: number }
    | { type: 'makeEnd'; humanId: number }
    | { type: 'scoreChange'; humanId: number; team: number; delta: number; score: number; teamScores: readonly number[] }
    | { type: 'humanLeft'; humanId: number }
    /** Object entered/left the stage (CreateSnowball, full status rebuild, delete list). */
    | { type: 'objectAdded'; objectId: number; objectType: number }
    | { type: 'objectRemoved'; objectId: number; objectType: number }
    /** Whole seconds left changed; warning = 0 < seconds <= 5 (beep + blink). */
    | { type: 'timer'; secondsLeft: number; warning: boolean }
    | { type: 'resync'; reason: number; turn: number }
    | { type: 'fullStatus'; turn: number };

export type SnowWarEngineEventType = SnowWarEngineEvent['type'];

export type SnowWarEngineListener<T extends SnowWarEngineEventType = SnowWarEngineEventType> =
    (event: Extract<SnowWarEngineEvent, { type: T }>) => void;

/** Read + input surface of the SnowStorm engine (AIR `SnowWarEngine` + `SynchronizedGameArena`). */
export interface ISnowWarEngine
{
    readonly state: SnowWarEngineStateId;
    /** Own human game object id, -1 until StageStarting. */
    readonly ownId: number;
    readonly gameType: number;
    readonly fieldType: number;
    readonly numberOfTeams: number;
    readonly isDeathMatch: boolean;
    readonly level: SnowWarLevel | null;
    readonly players: readonly SnowWarArenaPlayer[];
    readonly turn: number;
    readonly subturn: number;
    /** Simulated subturns since StageRunning (AIR currentSubTurn). */
    readonly currentSubTurn: number;
    /** Seconds from StageRunning. */
    readonly stageLength: number;
    /** AIR HUD timer: stageLength - currentSubTurn * 50 / 1000, floored at 0. */
    readonly secondsLeft: number;
    /** Index = team id - 1. */
    readonly teamScores: readonly number[];
    /** Increments after every simulated subturn and every object rebuild; cheap change detector for render loops. */
    readonly version: number;
    /** Increments on every EnterArena; identifies the arena (game) the stage and level belong to. 0 before the first. */
    readonly arenaId: number;
    /** 0..1 progress towards the next simulated subturn, for interpolating positions between pulses. */
    readonly subturnFraction: number;

    getObjects(): readonly ISnowWarObject[];
    getObject(id: number): ISnowWarObject | null;
    getHumans(): readonly ISnowWarHuman[];
    getOwnHuman(): ISnowWarHuman | null;
    getTile(x: number, y: number): SnowWarTileInfo | null;

    /** Tile click: plain = move, Shift = quick, Alt = long lob, Alt+Shift = short lob. */
    clickTile(tileX: number, tileY: number, modifiers: SnowWarClickModifiers): void;
    /** Human click: own = make snowball, opponent = throw (plain = default), teammates ignored. */
    clickHuman(humanId: number, modifiers: SnowWarClickModifiers): void;
    /** Plain tile click (Game2SetUserMoveTarget at tile * 3200). */
    moveTo(tileX: number, tileY: number): void;
    /** Throw at a tile (Game2ThrowSnowballAtPosition at tile * 3200); ignored when the own human cannot throw. */
    throwAtPosition(tileX: number, tileY: number, trajectory: number): void;
    /** Throw at an opponent (Game2ThrowSnowballAtHuman); ignored when the own human cannot throw. */
    throwAtHuman(humanId: number, trajectory: number): void;
    makeSnowball(): boolean;
    canThrow(): boolean;
    canMakeSnowball(): boolean;
    isOpponent(humanId: number): boolean;
    /** Arena view finished initialising the room objects: sends Game2LoadStageReady(100). */
    notifyStageLoaded(): void;

    on<T extends SnowWarEngineEventType>(type: T, listener: SnowWarEngineListener<T>): () => void;
    subscribe(listener: (event: SnowWarEngineEvent) => void): () => void;
}

/** Return value of `useSnowWar()`. */
export interface SnowWarHookState
{
    engine: ISnowWarEngine;
    state: SnowWarEngineStateId;
    directory: SnowWarDirectoryStatus | null;
    account: SnowWarAccountStatus | null;
    /** Seconds the user is blocked from playing (Game2UserBlocked / directory blockLength). */
    blockLength: number;
    lobby: SnowWarLobbyState | null;
    loading: SnowWarLoadingState | null;
    results: SnowWarResults | null;
    leaderboard: SnowWarLeaderboard | null;
    tokenOffers: SnowWarTokenOffer[];
    chatMessages: SnowWarChatMessage[];
    /** Localization key of the last error alert (`snowwar.error.*`), null when none. */
    error: string | null;
    /** Room id from RejoinPreviousRoom, -1 when unknown. */
    roomBeforeGame: number;
    /** `engine.arenaId` once StageLoad arrived for it (AIR builds the game room then, `initView`), else 0. Key the arena view on it. */
    arenaViewId: number;

    /** games_main opened: Game2CheckGameDirectoryStatus + Game2GetAccountGameStatus(0). */
    refreshStatus(): void;
    /** Play button (QuickJoin). */
    play(): void;
    /** Lobby cancel link (LeaveLobby). */
    leaveLobby(): void;
    /** Results rematch button (PlayAgain). */
    rematch(): void;
    /** Results "play again" after the rematch window (QuickJoin from the results screen). */
    playAgain(): void;
    /** Exit confirmation yes (Game2ExitGame(true)). */
    exitGame(): void;
    /** Close the results/rematch screen and return to the room before the game. */
    closeResults(): void;
    sendChat(message: string): void;
    requestLeaderboard(request: SnowWarLeaderboardRequest): void;
    closeLeaderboard(): void;
    requestTokenOffers(): void;
    purchaseTokenOffer(offerId: number): void;
    clearError(): void;
}
