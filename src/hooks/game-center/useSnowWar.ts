import {
    Game2AccountGameStatusMessageEvent,
    Game2CheckGameDirectoryStatusMessageComposer,
    Game2EnterArenaFailedMessageEvent,
    Game2EnterArenaMessageEvent,
    Game2ExitGameMessageComposer,
    Game2FriendsLeaderboardEvent,
    Game2FullGameStatusMessageEvent,
    Game2GameCancelledMessageEvent,
    Game2GameChatMessageComposer,
    Game2GameChatMessageEvent,
    Game2GameCreatedMessageEvent,
    Game2GameDirectoryStatusMessageEvent,
    Game2GameEndingMessageEvent,
    Game2GameLongDataMessageEvent,
    Game2GameStartedMessageEvent,
    Game2GameStatusMessageEvent,
    Game2GetAccountGameStatusMessageComposer,
    Game2GetFriendsLeaderboardComposer,
    Game2GetTotalGroupLeaderboardComposer,
    Game2GetTotalLeaderboardComposer,
    Game2GetWeeklyFriendsLeaderboardComposer,
    Game2GetWeeklyGroupLeaderboardComposer,
    Game2GetWeeklyLeaderboardComposer,
    Game2InArenaQueueMessageEvent,
    Game2VoteArenaMessageComposer,
    SnowStormArenaVotesMessageEvent,
    Game2JoiningGameFailedMessageEvent,
    Game2LeaveLobbyMessageComposer,
    Game2PlayAgainMessageComposer,
    Game2PlayerRematchesMessageEvent,
    Game2QuickJoinMessageComposer,
    Game2RejoinPreviousRoomMessageEvent,
    Game2StageEndingMessageEvent,
    Game2StageLoadMessageEvent,
    Game2StageRunningMessageEvent,
    Game2StageStartingMessageEvent,
    Game2StageStillLoadingMessageEvent,
    Game2StartCounterMessageEvent,
    Game2StartingGameFailedMessageEvent,
    Game2StopCounterMessageEvent,
    Game2TotalGroupLeaderboardEvent,
    Game2TotalLeaderboardEvent,
    Game2UserBlockedMessageEvent,
    Game2UserJoinedGameMessageEvent,
    Game2UserLeftGameMessageEvent,
    Game2WeeklyFriendsLeaderboardEvent,
    Game2WeeklyGroupLeaderboardEvent,
    Game2WeeklyLeaderboardEvent,
    GameLevelData,
    GameLobbyData,
    GameLobbyPlayerData,
    GetCommunication,
    GetSnowWarGameTokensOfferComposer,
    LeaderboardEntry,
    OctaneEventType,
    PurchaseSnowWarGameTokensOfferComposer,
    SnowWarGameTokensMessageEvent
} from '@octane/renderer';
import type { ConnectionStatePhase } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { CreateRoomSession, GetConfigurationValue, GetRoomSession, GetSessionDataManager, PlaySound, SendMessageComposer, TryVisitRoom, VisitDesktop } from '../../api';
import {
    consumeSnowWarReturnRoom,
    setSnowWarReturnRoom,
    SnowWarAccountStatus,
    SnowWarChatMessage,
    SnowWarDirectoryStatus,
    SnowWarEngine,
    SnowWarEngineState,
    SnowWarEngineStateId,
    SnowWarHookState,
    SnowWarLeaderboard,
    SnowWarLeaderboardEntry,
    SnowWarLeaderboardKind,
    SnowWarLeaderboardRequest,
    SnowWarLevel,
    SnowWarLoadingState,
    SnowWarLobbyData,
    SnowWarLobbyPlayer,
    SnowWarLobbyState,
    SnowWarResults,
    SnowWarTokenOffer
} from '../../api/snowwar';
import { useMessageEvent, useOctaneEvent } from '../events';

// SnowStormManager.VoteArena drops votes within 750 ms; the margin absorbs network jitter.
const VOTE_INTERVAL_MS = 1000;
const SNOWSTORM_GAME_TYPE = 0;
const CONNECTION_LOST_PHASES: readonly ConnectionStatePhase[] = [ 'disconnected', 'reconnecting', 'reauthenticating', 'failed' ];
const MAX_CHAT_MESSAGES = 50;

// One engine per client: the arena view reads it every frame; the hook drives its state machine.
const SNOWWAR_ENGINE = new SnowWarEngine({
    send: composer => SendMessageComposer(composer),
    playSound: name => PlaySound(name),
    getOwnUser: () => ({ userId: GetSessionDataManager().userId, userName: GetSessionDataManager().userName })
});

const toLobbyPlayer = (player: GameLobbyPlayerData): SnowWarLobbyPlayer => ({
    userId: player.userId,
    name: player.name,
    figure: player.figure,
    gender: player.gender,
    teamId: player.teamId,
    skillLevel: player.skillLevel,
    totalScore: player.totalScore,
    scoreToNextLevel: player.scoreToNextLevel
});

const toLobbyData = (data: GameLobbyData): SnowWarLobbyData => ({
    gameId: data.gameId,
    levelName: data.levelName,
    gameType: data.gameType,
    fieldType: data.fieldType,
    numberOfTeams: data.numberOfTeams,
    maximumPlayers: data.maximumPlayers,
    owningPlayerName: data.owningPlayerName,
    levelEntryId: data.levelEntryId,
    players: data.players.map(toLobbyPlayer)
});

const toLevel = (level: GameLevelData): SnowWarLevel => ({
    width: level.width,
    height: level.height,
    heightMap: level.heightMap,
    fuseObjects: level.fuseObjects.map(fuse => ({
        name: fuse.name,
        id: fuse.id,
        x: fuse.x,
        y: fuse.y,
        xDimension: fuse.xDimension,
        yDimension: fuse.yDimension,
        height: fuse.height,
        direction: fuse.direction,
        altitude: fuse.altitude,
        canStandOn: fuse.canStandOn,
        state: fuse.stuffData?.getLegacyString() ?? '',
        stuffData: fuse.stuffData
    }))
});

const toLeaderboardEntries = (entries: LeaderboardEntry[]): SnowWarLeaderboardEntry[] =>
    entries.map(entry => ({ userId: entry.userId, score: entry.score, rank: entry.rank, name: entry.name, figure: entry.figure, gender: entry.gender }));

const emptyLeaderboard = (kind: SnowWarLeaderboardKind): SnowWarLeaderboard => ({
    kind,
    entries: [],
    totalListSize: 0,
    year: 0,
    week: 0,
    maxOffset: 0,
    currentOffset: 0,
    minutesUntilReset: 0,
    favouriteGroupId: 0
});

/** `class_1951.onJoiningGameFailed`. */
const joiningFailedKey = (reason: number): string =>
{
    switch(reason)
    {
        case 2: return 'snowwar.error.duplicate_machineid';
        case 6:
        case 7: return 'snowwar.error.has_active_instance';
        case 8: return 'snowwar.error.no_free_games_left';
        default: return 'snowwar.error.generic';
    }
};

/** `GameEndingViewController.changeToWaitState`: rematching players stay, the rest leave the screen. */
const toWaitState = (results: SnowWarResults, rematching: boolean): SnowWarResults =>
{
    if(!rematching) return { ...results, mode: 'afterSki', rematchUserIds: [] };

    return {
        ...results,
        mode: 'waiting',
        countdownDeadline: null,
        teams: results.teams.map(team => ({ ...team, players: team.players.filter(player => results.rematchUserIds.includes(player.userId)) }))
    };
};

const useSnowWarState = (): SnowWarHookState =>
{
    const [ state, setState ] = useState<SnowWarEngineStateId>(SNOWWAR_ENGINE.state);
    const [ directory, setDirectory ] = useState<SnowWarDirectoryStatus>(null);
    const [ account, setAccount ] = useState<SnowWarAccountStatus>(null);
    const [ blockLength, setBlockLength ] = useState(0);
    const [ lobby, setLobby ] = useState<SnowWarLobbyState>(null);
    const [ loading, setLoading ] = useState<SnowWarLoadingState>(null);
    const [ results, setResultsState ] = useState<SnowWarResults>(null);
    const [ leaderboard, setLeaderboard ] = useState<SnowWarLeaderboard>(null);
    const [ tokenOffers, setTokenOffers ] = useState<SnowWarTokenOffer[]>([]);
    const [ chatMessages, setChatMessages ] = useState<SnowWarChatMessage[]>([]);
    const [ error, setError ] = useState<string>(null);
    const [ roomBeforeGame, setRoomBeforeGameState ] = useState(-1);
    const [ arenaViewId, setArenaViewId ] = useState(0);

    // AIR `var_475`: the player asked for a rematch (or the server opened the rematch lobby).
    const rematchRequestedRef = useRef(false);
    const lastVoteRef = useRef<{ fieldType: number; at: number }>(null);
    const resultsRef = useRef<SnowWarResults>(null);
    const roomBeforeGameRef = useRef(-1);
    const returnedToRoomRef = useRef(true);
    const playersRef = useRef(new Map<number, SnowWarLobbyPlayer>());
    const chatIdRef = useRef(0);
    const connectionLostRef = useRef(false);

    useEffect(() => SNOWWAR_ENGINE.on('stateChanged', event => setState(event.state)), []);

    const setResults = useCallback((update: (current: SnowWarResults) => SnowWarResults) =>
    {
        resultsRef.current = update(resultsRef.current);
        setResultsState(resultsRef.current);
    }, []);

    const setRoomBeforeGame = useCallback((roomId: number) =>
    {
        roomBeforeGameRef.current = roomId;
        setRoomBeforeGameState(roomId);
    }, []);

    /** Back to the room the player was in before the arena (AIR class_2142 = GetGuestRoom(room, false, true)). */
    const returnToRoom = useCallback((reconnected: boolean = false) =>
    {
        const remembered = consumeSnowWarReturnRoom();

        if(returnedToRoomRef.current) return;

        returnedToRoomRef.current = true;

        const roomId = (roomBeforeGameRef.current > 0) ? roomBeforeGameRef.current : remembered;

        if(roomId <= 0) return;

        // After a reconnect the room is entered at once, as the renderer re-enters a normal room, so the
        // home-room entry that follows every login finds a room session and does not enter a second time.
        if(reconnected) CreateRoomSession(roomId);
        else TryVisitRoom(roomId);
    }, []);

    /** `SnowWarEngine.resetSession` (game cancelled, results closed). */
    const clearSession = useCallback(() =>
    {
        SNOWWAR_ENGINE.reset();
        rematchRequestedRef.current = false;
        setResults(() => null);
        setLoading(null);
        setLobby(null);
        setArenaViewId(0);
    }, [ setResults ]);

    const resetSession = useCallback(() =>
    {
        SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(SNOWSTORM_GAME_TYPE));
        clearSession();
    }, [ clearSession ]);

    // The server drops the player from lobby and game when the socket goes, so no message ends this session:
    // clear it as soon as the connection is lost (the state ReconnectView shows), and once the session is
    // authenticated again go back to the room the arena replaced.
    useOctaneEvent(OctaneEventType.CONNECTION_STATE_CHANGED, useCallback(() =>
    {
        if(!CONNECTION_LOST_PHASES.includes(GetCommunication().connection.connectionState.phase)) return;

        connectionLostRef.current = true;
        clearSession();
    }, [ clearSession ]));

    useOctaneEvent(OctaneEventType.SOCKET_REAUTHENTICATED, useCallback(() =>
    {
        if(!connectionLostRef.current) return;

        connectionLostRef.current = false;
        returnToRoom(true);
    }, [ returnToRoom ]));

    // ---- directory / account ----

    useMessageEvent<Game2GameDirectoryStatusMessageEvent>(Game2GameDirectoryStatusMessageEvent, useCallback(event =>
    {
        const parser = event.getParser();

        setDirectory({ status: parser.status, blockLength: parser.blockLength, gamesPlayed: parser.gamesPlayed, freeGamesLeft: parser.freeGamesLeft });

        if(parser.status !== 0) return;

        setBlockLength(parser.blockLength);
        setAccount(previous => ({
            gameTypeId: SNOWSTORM_GAME_TYPE,
            freeGamesLeft: parser.freeGamesLeft,
            gamesPlayedTotal: previous?.gamesPlayedTotal ?? parser.gamesPlayed,
            hasUnlimitedGames: parser.freeGamesLeft === -1
        }));
    }, []));

    useMessageEvent<Game2AccountGameStatusMessageEvent>(Game2AccountGameStatusMessageEvent, useCallback(event =>
    {
        const parser = event.getParser();

        if(parser.gameTypeId !== SNOWSTORM_GAME_TYPE) return;

        setAccount({ gameTypeId: parser.gameTypeId, freeGamesLeft: parser.freeGamesLeft, gamesPlayedTotal: parser.gamesPlayedTotal, hasUnlimitedGames: parser.hasUnlimitedGames });
    }, []));

    useMessageEvent<Game2UserBlockedMessageEvent>(Game2UserBlockedMessageEvent, useCallback(event => setBlockLength(event.getParser().playerBlockLength), []));

    useMessageEvent<Game2JoiningGameFailedMessageEvent>(Game2JoiningGameFailedMessageEvent, useCallback(event => setError(joiningFailedKey(event.getParser().reason)), []));

    useMessageEvent<Game2StartingGameFailedMessageEvent>(Game2StartingGameFailedMessageEvent, useCallback(() => setError('snowwar.error.generic'), []));

    useMessageEvent<Game2GameCancelledMessageEvent>(Game2GameCancelledMessageEvent, useCallback(() =>
    {
        resetSession();
        returnToRoom();
    }, [ resetSession, returnToRoom ]));

    // ---- lobby (SnowWarEngine.createLobby / userJoined / userLeft / lobby counters) ----

    const inRematchLobby = () => (SNOWWAR_ENGINE.state === SnowWarEngineState.REJOIN_GAME) && !!resultsRef.current;

    const createLobby = useCallback((parserData: GameLobbyData) =>
    {
        const data = toLobbyData(parserData);

        if(SNOWWAR_ENGINE.state === SnowWarEngineState.GAME_OVER) rematchRequestedRef.current = true;

        if(resultsRef.current && SNOWWAR_ENGINE.state !== SnowWarEngineState.REJOIN_GAME)
        {
            const rematching = rematchRequestedRef.current;

            setResults(current => toWaitState(current, rematching));
            SNOWWAR_ENGINE.setState(SnowWarEngineState.REJOIN_GAME);
            rematchRequestedRef.current = false;
        }

        if(inRematchLobby())
        {
            setResults(current => ({ ...current, mode: 'lobby', lobby: data, lobbyPlayers: [ ...data.players ], teams: [] }));

            return;
        }

        SNOWWAR_ENGINE.setState(SnowWarEngineState.INACTIVE);
        lastVoteRef.current = null;
        setLobby({ data, players: [ ...data.players ], queuePosition: -1, countdownDeadline: null, arenaVotes: null });
    }, [ setResults ]);

    useMessageEvent<Game2GameCreatedMessageEvent>(Game2GameCreatedMessageEvent, useCallback(event => createLobby(event.getParser().gameLobbyData), [ createLobby ]));

    useMessageEvent<Game2GameLongDataMessageEvent>(Game2GameLongDataMessageEvent, useCallback(event => createLobby(event.getParser().gameLobbyData), [ createLobby ]));

    useMessageEvent<Game2UserJoinedGameMessageEvent>(Game2UserJoinedGameMessageEvent, useCallback(event =>
    {
        const player = toLobbyPlayer(event.getParser().user);
        const join = (players: SnowWarLobbyPlayer[]) => [ ...players.filter(existing => existing.userId !== player.userId), player ];

        if(inRematchLobby())
        {
            setResults(current => ({ ...current, lobbyPlayers: join(current.lobbyPlayers) }));

            return;
        }

        SNOWWAR_ENGINE.setState(SnowWarEngineState.INACTIVE);
        setLobby(current => current && { ...current, players: join(current.players) });
    }, [ setResults ]));

    useMessageEvent<Game2UserLeftGameMessageEvent>(Game2UserLeftGameMessageEvent, useCallback(event =>
    {
        const userId = event.getParser().userId;

        if(inRematchLobby())
        {
            setResults(current => ({ ...current, lobbyPlayers: current.lobbyPlayers.filter(player => player.userId !== userId) }));

            return;
        }

        SNOWWAR_ENGINE.setState(SnowWarEngineState.INACTIVE);
        setLobby(current => current && { ...current, players: current.players.filter(player => player.userId !== userId) });
    }, [ setResults ]));

    useMessageEvent<SnowStormArenaVotesMessageEvent>(SnowStormArenaVotesMessageEvent, useCallback(event =>
    {
        const parser = event.getParser();
        const arenas = parser.arenas.map(arena => ({ fieldType: arena.fieldType, votes: arena.votes }));

        setLobby(current => current && {
            ...current,
            arenaVotes: { arenas, leadingFieldType: parser.leadingFieldType, ownVote: current.arenaVotes?.ownVote ?? 0 }
        });
    }, []));

    useMessageEvent<Game2InArenaQueueMessageEvent>(Game2InArenaQueueMessageEvent, useCallback(event =>
    {
        const position = event.getParser().position;

        setLobby(current => current && { ...current, queuePosition: position });
    }, []));

    useMessageEvent<Game2StartCounterMessageEvent>(Game2StartCounterMessageEvent, useCallback(event =>
    {
        const deadline = Date.now() + (event.getParser().countDownLength * 1000);

        if(inRematchLobby())
        {
            setResults(current => ({ ...current, mode: 'lobby', countdownDeadline: deadline }));

            return;
        }

        setLobby(current => current && { ...current, countdownDeadline: deadline });
    }, [ setResults ]));

    useMessageEvent<Game2StopCounterMessageEvent>(Game2StopCounterMessageEvent, useCallback(() =>
    {
        if(inRematchLobby())
        {
            rematchRequestedRef.current = true;
            setResults(current => toWaitState(current, true));

            return;
        }

        setLobby(current => current && { ...current, countdownDeadline: null });
    }, [ setResults ]));

    // ---- loading and arena ----

    useMessageEvent<Game2GameStartedMessageEvent>(Game2GameStartedMessageEvent, useCallback(event =>
    {
        const data = toLobbyData(event.getParser().lobbyData);

        rematchRequestedRef.current = false;
        playersRef.current = new Map(data.players.map(player => [ player.userId, player ]));
        setChatMessages([]);
        setResults(() => null);
        setLobby(null);
        setLoading({ lobby: data, percentage: 0, finishedUserIds: [] });
        setArenaViewId(0);
        SNOWWAR_ENGINE.gameStarted();
    }, [ setResults ]));

    useMessageEvent<Game2EnterArenaMessageEvent>(Game2EnterArenaMessageEvent, useCallback(event =>
    {
        const parser = event.getParser();

        // The player stays in their room while browsing; the arena replaces it (AIR initArena disposes the session).
        setSnowWarReturnRoom(GetRoomSession()?.roomId ?? null);
        returnedToRoomRef.current = false;
        VisitDesktop();

        SNOWWAR_ENGINE.enterArena(parser.gameType, parser.fieldType, parser.numberOfTeams, parser.players.map(player => ({
            referenceId: player.referenceId,
            userName: player.userName,
            figure: player.figure,
            gender: player.gender,
            teamId: player.teamId
        })), toLevel(parser.gameLevel));
    }, []));

    useMessageEvent<Game2EnterArenaFailedMessageEvent>(Game2EnterArenaFailedMessageEvent, useCallback(event =>
        setError((event.getParser().reason === 1) ? 'snowwar.error.game_already_started' : 'snowwar.error.generic'), []));

    // AIR `initView`: the game room is built on StageLoad, from the level of the arena just entered.
    useMessageEvent<Game2StageLoadMessageEvent>(Game2StageLoadMessageEvent, useCallback(() =>
    {
        SNOWWAR_ENGINE.stageLoad();
        setArenaViewId(SNOWWAR_ENGINE.arenaId);
    }, []));

    useMessageEvent<Game2StageStillLoadingMessageEvent>(Game2StageStillLoadingMessageEvent, useCallback(event =>
    {
        const parser = event.getParser();

        SNOWWAR_ENGINE.stageLoading();
        setLoading(current => current && { ...current, percentage: parser.percentage, finishedUserIds: [ ...parser.finishedPlayers ] });
    }, []));

    useMessageEvent<Game2StageStartingMessageEvent>(Game2StageStartingMessageEvent, useCallback(event =>
    {
        const parser = event.getParser();

        SNOWWAR_ENGINE.stageStarting(parser.countDown, parser.gameObjects.gameObjects);
        setLoading(null);
    }, []));

    useMessageEvent<Game2StageRunningMessageEvent>(Game2StageRunningMessageEvent, useCallback(event => SNOWWAR_ENGINE.stageRunning(event.getParser().timeToStageEnd), []));

    useMessageEvent<Game2GameStatusMessageEvent>(Game2GameStatusMessageEvent, useCallback(event =>
    {
        const status = event.getParser().status;

        SNOWWAR_ENGINE.gameStatus(status.turn, status.checksum, status.events);
    }, []));

    useMessageEvent<Game2FullGameStatusMessageEvent>(Game2FullGameStatusMessageEvent, useCallback(event =>
    {
        const fullStatus = event.getParser().fullStatus;

        SNOWWAR_ENGINE.fullGameStatus(fullStatus.gameObjects.gameObjects, fullStatus.gameStatus.turn, fullStatus.gameStatus.checksum, fullStatus.gameStatus.events);
    }, []));

    useMessageEvent<Game2StageEndingMessageEvent>(Game2StageEndingMessageEvent, useCallback(event =>
    {
        if(event.getParser().timeToNextState === 0) SNOWWAR_ENGINE.resetGameSession();
    }, []));

    useMessageEvent<Game2GameChatMessageEvent>(Game2GameChatMessageEvent, useCallback(event =>
    {
        const parser = event.getParser();
        const player = playersRef.current.get(parser.userId);

        if(!player) return;

        const message: SnowWarChatMessage = {
            id: ++chatIdRef.current,
            userId: player.userId,
            name: player.name,
            figure: player.figure,
            gender: player.gender,
            teamId: player.teamId,
            message: parser.chatMessage,
            receivedAt: Date.now()
        };

        setChatMessages(current => [ ...current, message ].slice(-MAX_CHAT_MESSAGES));
    }, []));

    // ---- results (gameOver / rejoinGame / playerRematches) ----

    useMessageEvent<Game2GameEndingMessageEvent>(Game2GameEndingMessageEvent, useCallback(event =>
    {
        const parser = event.getParser();

        SNOWWAR_ENGINE.setState(SnowWarEngineState.GAME_OVER);
        setResults(() => ({
            mode: 'results',
            result: { isDeathMatch: parser.gameResult.isDeathMatch, resultType: parser.gameResult.resultType, winnerId: parser.gameResult.winnerId },
            teams: parser.teams.map(team => ({
                teamReference: team.teamReference,
                score: team.score,
                players: team.players.map(player => ({
                    userName: player.userName,
                    userId: player.userId,
                    figure: player.figure,
                    gender: player.gender,
                    score: player.score,
                    teamId: player.teamId,
                    stats: { ...player.playerStats }
                }))
            })),
            playerWithMostKills: parser.generalStats.playerWithMostKills,
            playerWithMostHits: parser.generalStats.playerWithMostHits,
            countdownDeadline: Date.now() + (parser.timeToNextState * 1000),
            rematchUserIds: [],
            lobbyPlayers: [],
            lobby: null
        }));
    }, [ setResults ]));

    useMessageEvent<Game2PlayerRematchesMessageEvent>(Game2PlayerRematchesMessageEvent, useCallback(event =>
    {
        const userId = event.getParser().userId;

        setResults(current => current && { ...current, rematchUserIds: current.rematchUserIds.includes(userId) ? current.rematchUserIds : [ ...current.rematchUserIds, userId ] });
    }, [ setResults ]));

    useMessageEvent<Game2RejoinPreviousRoomMessageEvent>(Game2RejoinPreviousRoomMessageEvent, useCallback(event =>
    {
        const rematching = rematchRequestedRef.current;

        setRoomBeforeGame(event.getParser().roomBeforeGame);

        if(!resultsRef.current)
        {
            // Left from the arena or the loading screen: nothing else keeps the player here.
            returnToRoom();

            return;
        }

        SNOWWAR_ENGINE.setState(rematching ? SnowWarEngineState.REJOIN_GAME : SnowWarEngineState.GAME_OVER);
        setResults(current => toWaitState(current, rematching));
        rematchRequestedRef.current = false;
    }, [ setResults, setRoomBeforeGame, returnToRoom ]));

    // ---- leaderboards and tokens ----

    useMessageEvent<Game2TotalLeaderboardEvent>(Game2TotalLeaderboardEvent, useCallback(event =>
    {
        const parser = event.getParser();

        setLeaderboard({ ...emptyLeaderboard('total'), entries: toLeaderboardEntries(parser.leaderboard), totalListSize: parser.totalListSize });
    }, []));

    useMessageEvent<Game2FriendsLeaderboardEvent>(Game2FriendsLeaderboardEvent, useCallback(event =>
    {
        const parser = event.getParser();

        setLeaderboard({ ...emptyLeaderboard('friends'), entries: toLeaderboardEntries(parser.leaderboard), totalListSize: parser.totalListSize });
    }, []));

    useMessageEvent<Game2TotalGroupLeaderboardEvent>(Game2TotalGroupLeaderboardEvent, useCallback(event =>
    {
        const parser = event.getParser();

        setLeaderboard({ ...emptyLeaderboard('totalGroup'), entries: toLeaderboardEntries(parser.leaderboard), totalListSize: parser.totalListSize, favouriteGroupId: parser.favouriteGroupId });
    }, []));

    useMessageEvent<Game2WeeklyLeaderboardEvent>(Game2WeeklyLeaderboardEvent, useCallback(event =>
    {
        const parser = event.getParser();

        setLeaderboard({ kind: 'weekly', entries: toLeaderboardEntries(parser.leaderboard), totalListSize: parser.totalListSize, year: parser.year, week: parser.week, maxOffset: parser.maxOffset, currentOffset: parser.currentOffset, minutesUntilReset: parser.minutesUntilReset, favouriteGroupId: 0 });
    }, []));

    useMessageEvent<Game2WeeklyFriendsLeaderboardEvent>(Game2WeeklyFriendsLeaderboardEvent, useCallback(event =>
    {
        const parser = event.getParser();

        setLeaderboard({ kind: 'weeklyFriends', entries: toLeaderboardEntries(parser.leaderboard), totalListSize: parser.totalListSize, year: parser.year, week: parser.week, maxOffset: parser.maxOffset, currentOffset: parser.currentOffset, minutesUntilReset: parser.minutesUntilReset, favouriteGroupId: 0 });
    }, []));

    useMessageEvent<Game2WeeklyGroupLeaderboardEvent>(Game2WeeklyGroupLeaderboardEvent, useCallback(event =>
    {
        const parser = event.getParser();

        setLeaderboard({ kind: 'weeklyGroup', entries: toLeaderboardEntries(parser.leaderboard), totalListSize: parser.totalListSize, year: parser.year, week: parser.week, maxOffset: parser.maxOffset, currentOffset: parser.currentOffset, minutesUntilReset: parser.minutesUntilReset, favouriteGroupId: parser.favouriteGroupId });
    }, []));

    useMessageEvent<SnowWarGameTokensMessageEvent>(SnowWarGameTokensMessageEvent, useCallback(event =>
    {
        setTokenOffers(event.getParser().offers.map(offer => ({
            offerId: offer.offerId,
            localizationId: offer.localizationId,
            priceCredits: offer.priceInCredits,
            pricePoints: offer.priceInActivityPoints,
            pointsType: offer.activityPointType
        })));
    }, []));

    // ---- actions ----

    const refreshStatus = useCallback(() =>
    {
        SendMessageComposer(new Game2CheckGameDirectoryStatusMessageComposer());
        SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(SNOWSTORM_GAME_TYPE));
    }, []);

    const play = useCallback(() =>
    {
        setError(null);
        SendMessageComposer(new Game2QuickJoinMessageComposer());
    }, []);

    const leaveLobby = useCallback(() =>
    {
        SendMessageComposer(new Game2LeaveLobbyMessageComposer());
        setLobby(null);
    }, []);

    const voteArena = useCallback((fieldType: number) =>
    {
        const now = Date.now();
        const last = lastVoteRef.current;

        // The server ignores a vote within 750 ms of the previous one; only send votes it will apply,
        // so the own-vote outline never moves to an arena the server did not count.
        if(last && ((last.fieldType === fieldType) || ((now - last.at) < VOTE_INTERVAL_MS))) return;

        lastVoteRef.current = { fieldType, at: now };
        SendMessageComposer(new Game2VoteArenaMessageComposer(fieldType));
        setLobby(current => current?.arenaVotes ? { ...current, arenaVotes: { ...current.arenaVotes, ownVote: fieldType } } : current);
    }, []);

    /** `GameEndingViewController.onJoinRematch`. */
    const rematch = useCallback(() =>
    {
        rematchRequestedRef.current = true;
        SendMessageComposer(new Game2PlayAgainMessageComposer());
        setResults(current => current && { ...current, mode: 'rematchRequested' });
    }, [ setResults ]);

    /** `GameEndingViewController.onPlayAgain` (after the rematch window). */
    const playAgain = useCallback(() => SendMessageComposer(new Game2QuickJoinMessageComposer()), []);

    /** `GameEndingViewController.onClose(true)`. */
    const closeResults = useCallback(() =>
    {
        const mode = resultsRef.current?.mode;

        resetSession();

        if(mode === 'lobby' || mode === 'waiting')
        {
            SendMessageComposer(new Game2LeaveLobbyMessageComposer());
            returnToRoom();

            return;
        }

        if(mode === 'afterSki' && roomBeforeGameRef.current > -1)
        {
            returnToRoom();

            return;
        }

        SendMessageComposer(new Game2ExitGameMessageComposer(true));
    }, [ resetSession, returnToRoom ]);

    const exitGame = useCallback(() =>
    {
        const engineState = SNOWWAR_ENGINE.state;

        if(resultsRef.current)
        {
            closeResults();

            return;
        }

        if(engineState === SnowWarEngineState.INACTIVE)
        {
            leaveLobby();

            return;
        }

        SendMessageComposer(new Game2ExitGameMessageComposer(true));

        if(engineState === SnowWarEngineState.GAME_STARTING || engineState === SnowWarEngineState.STAGE_LOADING)
        {
            // GameLoadingViewController leave link: cancel, exit, back to the previous room.
            resetSession();
            returnToRoom();

            return;
        }

        // SnowWarUI exit confirmation: resetGameSession + resetRoomSession; RejoinPreviousRoom brings the player back.
        SNOWWAR_ENGINE.resetGameSession();
        SNOWWAR_ENGINE.reset();
        returnToRoom();
    }, [ closeResults, leaveLobby, resetSession, returnToRoom ]);

    const sendChat = useCallback((message: string) =>
    {
        if(message.trim().length) SendMessageComposer(new Game2GameChatMessageComposer(message));
    }, []);

    const requestLeaderboard = useCallback((request: SnowWarLeaderboardRequest) =>
    {
        const startRank = request.startRank ?? -1;
        const direction = request.direction ?? 0;
        const weekOffset = request.weekOffset ?? 0;
        const viewSize = request.viewSize ?? GetConfigurationValue<number>('games.highscores.viewSize', 8);
        const windowSize = request.windowSize ?? GetConfigurationValue<number>('games.highscores.windowSize', 50);

        switch(request.kind)
        {
            case 'total':
                SendMessageComposer(new Game2GetTotalLeaderboardComposer(SNOWSTORM_GAME_TYPE, startRank, direction, viewSize, windowSize));
                return;
            case 'friends':
                SendMessageComposer(new Game2GetFriendsLeaderboardComposer(SNOWSTORM_GAME_TYPE, startRank, direction, viewSize, windowSize));
                return;
            case 'totalGroup':
                SendMessageComposer(new Game2GetTotalGroupLeaderboardComposer(SNOWSTORM_GAME_TYPE, startRank, direction, viewSize, windowSize));
                return;
            case 'weekly':
                SendMessageComposer(new Game2GetWeeklyLeaderboardComposer(SNOWSTORM_GAME_TYPE, weekOffset, startRank, direction, viewSize, windowSize));
                return;
            case 'weeklyFriends':
                SendMessageComposer(new Game2GetWeeklyFriendsLeaderboardComposer(SNOWSTORM_GAME_TYPE, weekOffset, startRank, direction, viewSize, windowSize));
                return;
            case 'weeklyGroup':
                SendMessageComposer(new Game2GetWeeklyGroupLeaderboardComposer(SNOWSTORM_GAME_TYPE, weekOffset, startRank, direction, viewSize, windowSize));
                return;
        }
    }, []);

    const closeLeaderboard = useCallback(() => setLeaderboard(null), []);

    const requestTokenOffers = useCallback(() => SendMessageComposer(new GetSnowWarGameTokensOfferComposer()), []);

    const purchaseTokenOffer = useCallback((offerId: number) => SendMessageComposer(new PurchaseSnowWarGameTokensOfferComposer(offerId)), []);

    const clearError = useCallback(() => setError(null), []);

    return {
        engine: SNOWWAR_ENGINE,
        state,
        directory,
        account,
        blockLength,
        lobby,
        loading,
        results,
        leaderboard,
        tokenOffers,
        chatMessages,
        error,
        roomBeforeGame,
        arenaViewId,
        refreshStatus,
        play,
        leaveLobby,
        voteArena,
        rematch,
        playAgain,
        exitGame,
        closeResults,
        sendChat,
        requestLeaderboard,
        closeLeaderboard,
        requestTokenOffers,
        purchaseTokenOffer,
        clearError
    };
};

export const useSnowWar = () => useSharedHook(useSnowWarState);

registerSharedHook(useSnowWarState);
