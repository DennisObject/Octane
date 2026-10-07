import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { useEffect, useEffectEvent, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, GetGroupInformation, GetSessionDataManager, GetUserProfile } from '../../api';
import { buySnowWarTokens, SnowWarEngineState, SnowWarHookState } from '../../api/snowwar';
import { useNotificationActions, useSnowWar } from '../../hooks';
import { SnowWarGamesMainView } from './views/snowwar/SnowWarGamesMainView';
import { SnowWarLeaderboardView } from './views/snowwar/SnowWarLeaderboardView';

/**
 * Toolbar games entry: AIR opens the SnowStorm `games_main` window (GamesMainViewController)
 * while the player stays in their room; the lobby is shown inside it.
 */
export const GameCenterView = () =>
{
    const snowWar: SnowWarHookState = useSnowWar();
    const { state, account, blockLength, lobby, loading, results, leaderboard, refreshStatus, requestTokenOffers, play, leaveLobby, voteArena, requestLeaderboard, closeLeaderboard } = snowWar;
    const { showConfirm } = useNotificationActions();
    const [ mainVisible, setMainVisible ] = useState(false);
    const [ leaderboardVisible, setLeaderboardVisible ] = useState(false);
    const lobbyVisible = !!lobby && !loading && !results;
    const inGame = state !== SnowWarEngineState.INACTIVE || !!loading || !!results;
    const [ phase, setPhase ] = useState({ lobbyVisible, inGame });

    // createLobby opens the window on the lobby; gameStarted / gameOver close it (adjusted while rendering).
    if(phase.lobbyVisible !== lobbyVisible || phase.inGame !== inGame)
    {
        setPhase({ lobbyVisible, inGame });

        if(inGame && !phase.inGame) setMainVisible(false);
        else if(lobbyVisible && !phase.lobbyVisible) setMainVisible(true);
    }

    // toggleVisibility; opening checks the directory and the account's games
    // (Game2CheckGameDirectoryStatus + Game2GetAccountGameStatus) and fetches the token offers.
    const toggleMain = useEffectEvent(() =>
    {
        if(!mainVisible)
        {
            refreshStatus();
            requestTokenOffers();
        }

        setMainVisible(!mainVisible);
    });

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                if(url.split('/')[1] === 'toggle') toggleMain();
            },
            eventUrlPrefix: 'games/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    const closeMain = () =>
    {
        // GamesMainViewController.close(true): an open lobby is left.
        if(lobbyVisible) leaveLobby();
        setMainVisible(false);
    };

    const closeLeaderboardWindow = () =>
    {
        setLeaderboardVisible(false);
        closeLeaderboard();
    };

    return (
        <>
            {mainVisible && !inGame && (
                <SnowWarGamesMainView
                    blockLength={blockLength}
                    freeGamesLeft={account?.freeGamesLeft ?? -1}
                    hasUnlimitedGames={account?.hasUnlimitedGames ?? false}
                    leaderboardEnabled={GetConfigurationValue<boolean>('games.highscores.enabled', true)}
                    lobby={lobbyVisible ? { players: lobby.players, maxPlayers: lobby.data.maximumPlayers, queuePosition: lobby.queuePosition, countdownDeadline: lobby.countdownDeadline, arenaVotes: lobby.arenaVotes } : null}
                    onBuyTokens={offer => buySnowWarTokens(snowWar, showConfirm, offer)}
                    onCancelLobby={leaveLobby}
                    onVoteArena={voteArena}
                    onClose={closeMain}
                    onOpenClubCenter={() => CreateLinkEvent('habboUI/open/hccenter')}
                    onPlay={play}
                    onShowLeaderboard={() => setLeaderboardVisible(true)}
                />
            )}
            {leaderboardVisible && (
                <SnowWarLeaderboardView
                    leaderboard={leaderboard}
                    ownUserId={GetSessionDataManager().userId}
                    onClose={closeLeaderboardWindow}
                    onOpenGroup={GetGroupInformation}
                    onOpenProfile={GetUserProfile}
                    onRequest={requestLeaderboard}
                />
            )}
        </>
    );
};
