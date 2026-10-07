import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, GetGroupInformation, GetSessionDataManager, GetUserProfile } from '../../api';
import { SnowWarEngineState, SnowWarHookState } from '../../api/snowwar';
import { useGameCenter, useNotificationActions, useSnowWar } from '../../hooks';
import { SnowWarGamesMainView } from './views/snowwar/SnowWarGamesMainView';
import { SnowWarLeaderboardView } from './views/snowwar/SnowWarLeaderboardView';
import { buySnowWarTokens } from './views/snowwar/SnowWarTokenPurchase';

/**
 * Toolbar games entry: AIR opens the SnowStorm `games_main` window (GamesMainViewController)
 * while the player stays in their room; the lobby is shown inside it.
 */
export const GameCenterView = () =>
{
    const snowWar: SnowWarHookState = useSnowWar();
    const { state, account, blockLength, lobby, loading, results, leaderboard, refreshStatus, requestTokenOffers, play, leaveLobby, requestLeaderboard, closeLeaderboard } = snowWar;
    const { showConfirm } = useNotificationActions();
    const { isVisible: mainVisible, setIsVisible: setMainVisible } = useGameCenter();
    const [ leaderboardVisible, setLeaderboardVisible ] = useState(false);
    const lobbyVisible = !!lobby && !loading && !results;

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if(parts[1] === 'toggle') setMainVisible(value => !value);
            },
            eventUrlPrefix: 'games/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [ setMainVisible ]);

    // Opening the window checks the directory and the account's games (Game2CheckGameDirectoryStatus + GetAccountGameStatus).
    useEffect(() =>
    {
        if(!mainVisible) return;

        refreshStatus();
        requestTokenOffers();
    }, [ mainVisible, refreshStatus, requestTokenOffers ]);

    // createLobby opens the window on the lobby; gameStarted closes it.
    useEffect(() =>
    {
        if(lobbyVisible) setMainVisible(true);
    }, [ lobbyVisible, setMainVisible ]);

    useEffect(() =>
    {
        if(state !== SnowWarEngineState.INACTIVE) setMainVisible(false);
    }, [ state, setMainVisible ]);

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
            {mainVisible && (
                <SnowWarGamesMainView
                    blockLength={blockLength}
                    freeGamesLeft={account?.freeGamesLeft ?? -1}
                    hasUnlimitedGames={account?.hasUnlimitedGames ?? false}
                    leaderboardEnabled={GetConfigurationValue<boolean>('games.highscores.enabled', true)}
                    lobby={lobbyVisible ? { players: lobby.players, maxPlayers: lobby.data.maximumPlayers, queuePosition: lobby.queuePosition, countdownDeadline: lobby.countdownDeadline } : null}
                    onBuyTokens={offer => buySnowWarTokens(snowWar, showConfirm, offer)}
                    onCancelLobby={leaveLobby}
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
