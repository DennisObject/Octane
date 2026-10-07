import { FC, useEffect, useState } from 'react';
import { GetSessionDataManager, LocalizeText } from '../../../../api';
import { SnowWarEngineState, SnowWarHookState, SnowWarResults } from '../../../../api/snowwar';
import { useFriendsActions, useFriendsState, useNotificationActions, useSnowWar } from '../../../../hooks';
import { SnowWarArenaView } from './SnowWarArenaView';
import { SnowWarLoadingView, SnowWarResultsView } from './SnowWarEndingView';
import { SnowWarHudView } from './SnowWarHudView';
import { SnowWarPlayerRow } from './SnowWarPlayerRowView';
import { buySnowWarTokens } from './SnowWarTokenPurchase';

const secondsUntil = (deadline: number | null) => (deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0);

/** One-second countdown text for GameEndingViewController's Timer. */
const useCountdown = (deadline: number | null) =>
{
    const [ seconds, setSeconds ] = useState(() => secondsUntil(deadline));

    useEffect(() =>
    {
        setSeconds(secondsUntil(deadline));

        if(!deadline) return;

        const timer = setInterval(() => setSeconds(secondsUntil(deadline)), 250);

        return () => clearInterval(timer);
    }, [ deadline ]);

    return seconds;
};

const SnowWarResultsContainer: FC<{ snowWar: SnowWarHookState; results: SnowWarResults }> = ({ snowWar, results }) =>
{
    const { account, rematch, playAgain, closeResults } = snowWar;
    const { canRequestFriend } = useFriendsState();
    const { requestFriend } = useFriendsActions();
    const { showConfirm } = useNotificationActions();
    const seconds = useCountdown(results.countdownDeadline);
    const ownUserId = GetSessionDataManager().userId;
    const players = results.teams.flatMap(team => team.players.map(player => ({ ...player, teamId: player.teamId || team.teamReference })));
    const findPlayer = (userId: number) =>
    {
        const player = players.find(entry => entry.userId === userId);

        return player ? { name: player.userName, figure: player.figure, gender: player.gender, teamId: player.teamId } : null;
    };
    const mostKills = players.find(entry => entry.userId === results.playerWithMostKills);
    const mostHits = players.find(entry => entry.userId === results.playerWithMostHits);

    let rows: SnowWarPlayerRow[];

    if(results.mode === 'lobby')
    {
        // renderLobbyPlayers: sorted by skill, column (and uniform) by join order.
        rows = [ ...results.lobbyPlayers ].sort((a, b) => b.skillLevel - a.skillLevel).map(player => ({
            userId: player.userId,
            name: player.name,
            figure: player.figure,
            gender: player.gender,
            teamId: (results.lobbyPlayers.indexOf(player) % 2) + 1,
            skill: { level: player.skillLevel, totalScore: player.totalScore, scoreToNextLevel: player.scoreToNextLevel }
        }));
    }
    else
    {
        // changeToWaitState drops everyone who is not rejoining and hides their stats.
        const waiting = results.mode === 'waiting';

        rows = players
            .filter(player => !waiting || results.rematchUserIds.includes(player.userId))
            .map(player => ({
                userId: player.userId,
                name: player.userName,
                figure: player.figure,
                gender: player.gender,
                teamId: player.teamId,
                stats: waiting ? undefined : { hits: player.stats.snowballHits, kills: player.stats.kills, score: player.score },
                rematching: results.mode !== 'afterSki' && results.rematchUserIds.includes(player.userId),
                onAddFriend: player.userId !== ownUserId && canRequestFriend(player.userId) ? () => requestFriend(player.userId, player.userName) : undefined
            }));
    }

    return (
        <SnowWarResultsView
            freeGamesLeft={account?.freeGamesLeft ?? -1}
            hasUnlimitedGames={account?.hasUnlimitedGames ?? false}
            lobbyFieldType={results.lobby?.fieldType ?? null}
            mode={results.mode}
            mostHits={mostHits && mostHits.stats.snowballHits > 0 ? findPlayer(mostHits.userId) : null}
            mostKills={mostKills && mostKills.stats.kills > 0 ? findPlayer(mostKills.userId) : null}
            rows={rows}
            seconds={seconds}
            team1Score={results.teams.find(team => team.teamReference === 1)?.score ?? 0}
            team2Score={results.teams.find(team => team.teamReference === 2)?.score ?? 0}
            winnerTeam={results.result.resultType === 2 ? null : results.result.winnerId}
            onBuyTokens={() => buySnowWarTokens(snowWar, showConfirm, 'GET_SNOWWAR_TOKENS')}
            onLeave={closeResults}
            onPlayAgain={playAgain}
            onRematch={rematch}
        />
    );
};

/**
 * SnowStorm game overlays: loading screen, arena + HUD, results/rematch.
 * games_main and the leaderboard live in GameCenterView (the toolbar entry).
 */
export const SnowWarView: FC = () =>
{
    const snowWar: SnowWarHookState = useSnowWar();
    const { engine, state, loading, results, error, clearError, exitGame } = snowWar;
    const { simpleAlert } = useNotificationActions();
    const ownUserId = GetSessionDataManager().userId;

    // SnowWarEngine.alert: one "SnowWar Alert" window per error.
    useEffect(() =>
    {
        if(!error) return;

        simpleAlert(LocalizeText(error), null, null, null, 'SnowWar Alert');
        clearError();
    }, [ error, simpleAlert, clearError ]);

    const inGame = state >= SnowWarEngineState.GAME_STARTING && state <= SnowWarEngineState.STAGE_ENDING;
    const loadingVisible = !!loading && !results && (state === SnowWarEngineState.GAME_STARTING || state === SnowWarEngineState.STAGE_LOADING);
    const hudVisible = !results && state >= SnowWarEngineState.STAGE_STARTING && state <= SnowWarEngineState.STAGE_ENDING;

    return (
        <>
            {/* The arena gates itself: AIR builds the room on StageLoad and the server waits for its LoadStageReady. */}
            <div className={`snowwar-arena-layer ${ inGame ? 'snowwar-arena-layer--active' : '' }`}>
                <SnowWarArenaView />
                {hudVisible && <SnowWarHudView engine={engine} onExit={exitGame} />}
            </div>
            {loadingVisible && (
                <SnowWarLoadingView
                    allReady={loading.lobby.players.every(player => loading.finishedUserIds.includes(player.userId))}
                    fieldType={loading.lobby.fieldType}
                    rows={[ ...loading.lobby.players ]
                        .sort((a, b) => b.skillLevel - a.skillLevel)
                        .map(player => ({
                            userId: player.userId,
                            name: player.name,
                            figure: player.figure,
                            gender: player.gender,
                            teamId: player.teamId,
                            isOwn: player.userId === ownUserId,
                            loading: !loading.finishedUserIds.includes(player.userId),
                            skill: { level: player.skillLevel, totalScore: player.totalScore, scoreToNextLevel: player.scoreToNextLevel }
                        }))}
                    onLeave={exitGame}
                />
            )}
            {results && <SnowWarResultsContainer results={results} snowWar={snowWar} />}
        </>
    );
};
