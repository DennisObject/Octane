import { FC, ReactNode, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { SnowWarAvatarImage, getSnowWarUniformFigure } from './SnowWarAvatarImage';
import { SnowWarAnimation, SnowWarBitmap, SnowWarBox, SnowWarImage, snowWarBitmapSize, snowWarBitmapUrl } from './SnowWarBitmap';
import { SnowWarPlayerRow, SnowWarPlayerRowView } from './SnowWarPlayerRowView';
import { localizeSnowWar, SnowWarStrokeText, SnowWarText, SnowWarThickButton } from './SnowWarText';

export const SNOWWAR_TEAM_COLOURS: Record<number, number> = { 1: 0x1077ac, 2: 0xfd6859 };
export const SNOWWAR_NEUTRAL_COLOUR = 0x7d8a9a;

const ROW_HEIGHT = 62;
const ROW_SPACING = 2;

/** `snowwar_loading_background_xml` stretched over the desktop (BackgroundViewController). */
export const SnowWarBackgroundView: FC = () =>
{
    const vista = (name: string, y: number) => (
        <div className="snowwar-backdrop__vista" style={{ top: y, height: snowWarBitmapSize(name)[1], backgroundImage: `url(${ snowWarBitmapUrl(name) })` }} />
    );

    return (
        <div className="snowwar-backdrop">
            <div className="snowwar-backdrop__sky" style={{ backgroundImage: `url(${ snowWarBitmapUrl('bg_sky') })` }} />
            <img alt="" className="snowwar-backdrop__sunshine" draggable={false} src={snowWarBitmapUrl('bg_sunshine')} />
            {vista('bg_vista_1', 90)}
            {vista('bg_vista_2', 125)}
            {vista('bg_vista_3', 163)}
        </div>
    );
};

/** Desktop placement from GameEndingViewController.createMainView / GameLoadingViewController.createMainWindow. */
const useEndingPosition = () =>
{
    const read = () => ({ x: Math.trunc((window.innerWidth - 882) / 2), y: window.innerHeight > 685 ? 115 : 10 });
    const [ position, setPosition ] = useState(read);

    useEffect(() =>
    {
        const onResize = () => setPosition(read());

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return position;
};

interface EndingFrameProps
{
    header: string;
    headerColour: number;
    headerSize?: number;
    team1Score?: number;
    team2Score?: number;
    rows: SnowWarPlayerRow[];
    /** Rematch lobby: rows use snowwar_lobby_player_team_N (callers pass the join-order team as teamId). */
    lobbyRows?: boolean;
    onLeave: () => void;
    children?: ReactNode;
}

/** The shared `snowwar_ending` container (882x510) with backdrop, logo, gloves, header, team lists and leave link. */
const SnowWarEndingFrame: FC<EndingFrameProps> = ({ header, headerColour, headerSize = 28, team1Score, team2Score, rows, lobbyRows = false, onLeave, children }) =>
{
    const { x, y } = useEndingPosition();
    const columns: Record<number, SnowWarPlayerRow[]> = { 1: [], 2: [] };

    rows.forEach(row => columns[row.teamId]?.push(row));

    return (
        <div className="snowwar-ending-layer">
            <SnowWarBackgroundView />
            <SnowWarBox className="snowwar-ending" name="snowwar_ending" x={x} y={y} width={882} height={510}>
                <SnowWarBitmap bitmap="snowstorm_logo" name="snowwar_logo" x={287} y={0} width={308} height={83} />
                {[ 1, 2 ].map(team => (
                    <SnowWarBox key={team} name={`team${ team }PlayersList`} x={team === 1 ? 0 : 593} y={115} width={289} height={318}>
                        {columns[team].map((row, index) => <SnowWarPlayerRowView key={row.userId} lobbyLayout={lobbyRows} row={row} team={team} y={index * (ROW_HEIGHT + ROW_SPACING)} />)}
                    </SnowWarBox>
                ))}
                {children}
                <SnowWarBox name="team1ScoreContainer" x={203} y={10} width={80} height={101}>
                    <SnowWarBitmap bitmap="blue_glove" name="team1ScoreBackground" x={0} y={0} width={80} height={101} />
                    {team1Score !== undefined && <SnowWarStrokeText align="center" name="team1Score" size={24} strokeColor={SNOWWAR_TEAM_COLOURS[1]} text={String(team1Score)} x={13} y={41} width={49} height={30} />}
                </SnowWarBox>
                <SnowWarBox name="team2ScoreContainer" x={598} y={10} width={80} height={101}>
                    <SnowWarBitmap bitmap="red_glove" name="team2ScoreBackground" x={0} y={0} width={80} height={101} />
                    {team2Score !== undefined && <SnowWarStrokeText align="center" name="team2Score" size={24} strokeColor={SNOWWAR_TEAM_COLOURS[2]} text={String(team2Score)} x={20} y={41} width={49} height={30} />}
                </SnowWarBox>
                <SnowWarBox name="headerContainer" x={216} y={118} width={450} height={35}>
                    <SnowWarStrokeText align="center" name="endingInformation" size={headerSize} strokeColor={headerColour} text={header} x={0} y={0} width={450} height={35} />
                </SnowWarBox>
                {/* leave_link_region resizes to its children and keeps its centre (on_resize_align_center). */}
                <div className="snowwar-leave-link" data-air-name="leave_link_region" style={{ left: 378 + (127 / 2), top: 405 }} onClick={onLeave}>
                    <span className="snowwar-leave-link__icon" />
                    <span className="snowwar-leave-link__text">{LocalizeText('snowwar.leave_game')}</span>
                </div>
            </SnowWarBox>
        </div>
    );
};

/** `loadingContainer`: waiting text, arena preview, arena name, and the main spinner once everyone is in. */
const SnowWarLoadingContainer: FC<{ fieldType: number; showText: boolean; allReady?: boolean }> = ({ fieldType, showText, allReady = false }) => (
    <SnowWarBox name="loadingContainer" x={337} y={167} width={208} height={235}>
        {showText && <SnowWarStrokeText align="center" name="loadingText" size={17} strokeColor={0x1077ac} text={LocalizeText(allReady ? 'snowwar.loading_arena' : 'snowwar.waiting_players')} x={0} y={0} width={208} height={23} />}
        {/* arenaPreview.bitmap is assigned directly (not setElementImage), so the 191x97 asset stretches to the 208x100 window. */}
        <SnowWarImage imageHeight={100} imageWidth={208} name="arenaPreview" src={snowWarBitmapUrl(`arena_${ fieldType }_preview`)} x={0} y={35} width={208} height={100} />
        {/* arenaName: a 4px auto-size field at x=102 kept centred by its relative_horizontal_scale_center params. */}
        <SnowWarText align="center" bold color={0x1077ac} name="arenaName" size={14} text={LocalizeText(`snowwar.field.name.${ fieldType }`)} x={0} y={140} width={208} height={4} />
        {allReady && <SnowWarAnimation frames={8} name="mainLoadingIcon" prefix="load_" x={79} y={180} width={50} height={50} />}
    </SnowWarBox>
);

export interface SnowWarLoadingViewProps
{
    fieldType: number;
    rows: SnowWarPlayerRow[];
    /** Every player reported in StageStillLoading. */
    allReady: boolean;
    onLeave: () => void;
}

/** GameLoadingViewController: snowwar_ending reused with player rows, skill stars and load spinners. */
export const SnowWarLoadingView: FC<SnowWarLoadingViewProps> = ({ fieldType, rows, allReady, onLeave }) => (
    <SnowWarEndingFrame header={LocalizeText('snowwar.loading.title')} headerColour={0x1077ac} rows={rows} onLeave={onLeave}>
        <SnowWarLoadingContainer allReady={allReady} fieldType={fieldType} showText />
    </SnowWarEndingFrame>
);

interface MostContainerProps
{
    name: 'mostKills' | 'mostHits';
    x: number;
    player: { name: string; figure: string; gender: string; teamId: number } | null;
}

/** mostKillsContainer / mostHitsContainer, coloured with colorStrokes(teamColour). */
const SnowWarMostContainer: FC<MostContainerProps> = ({ name, x, player }) =>
{
    if(!player) return null;

    const colour = SNOWWAR_TEAM_COLOURS[player.teamId] ?? SNOWWAR_TEAM_COLOURS[1];

    return (
        <SnowWarBox name={`${ name }Container`} x={x} y={180} width={130} height={117}>
            <SnowWarBitmap bitmap={player.teamId === 2 ? 'red_square' : 'blue_square'} name="backgroundImage" x={30} y={26} width={70} height={70} />
            {/* mostKills texts carry text_style u_bold after their font settings, which sets 12px (the stroke keeps UbuntuThick); mostHits keeps 17 / 14. */}
            <SnowWarStrokeText align="center" name={`${ name }Label`} size={name === 'mostKills' ? 12 : 17} strokeColor={colour} text={LocalizeText(name === 'mostKills' ? 'snowwar.most_kills' : 'snowwar.most_hits')} x={8} y={2} width={115} height={23} />
            <SnowWarText align="center" bold color={colour} name="playerName" size={name === 'mostKills' ? 12 : 14} text={player.name} x={0} y={92} width={130} height={19} />
            <SnowWarAvatarImage direction={player.teamId === 2 ? 4 : 2} figure={getSnowWarUniformFigure(player.figure, player.teamId)} gender={player.gender} half name="playerImage" setType="full" x={30} y={26} width={70} height={70} />
        </SnowWarBox>
    );
};

export interface SnowWarResultsViewProps
{
    mode: 'results' | 'rematchRequested' | 'waiting' | 'lobby' | 'afterSki';
    /** null = tie (resultType 2). */
    winnerTeam: number | null;
    team1Score: number;
    team2Score: number;
    rows: SnowWarPlayerRow[];
    mostKills: MostContainerProps['player'];
    mostHits: MostContainerProps['player'];
    /** Seconds left on the rematch / lobby countdown. */
    seconds: number;
    freeGamesLeft: number;
    hasUnlimitedGames: boolean;
    /** Rematch lobby (mode 'lobby'): arena of the next game. */
    lobbyFieldType: number | null;
    onRematch: () => void;
    onPlayAgain: () => void;
    onBuyTokens: () => void;
    onLeave: () => void;
}

/** GameEndingViewController: results, rematch countdown, rematch lobby and "after ski". */
export const SnowWarResultsView: FC<SnowWarResultsViewProps> = props =>
{
    const { mode, winnerTeam, team1Score, team2Score, rows, mostKills, mostHits, seconds, freeGamesLeft, hasUnlimitedGames, lobbyFieldType, onRematch, onPlayAgain, onBuyTokens, onLeave } = props;
    const [ statusHidden, setStatusHidden ] = useState(false);
    const [ playAgainUsed, setPlayAgainUsed ] = useState(false);
    const noGames = freeGamesLeft === 0;
    const scoresVisible = mode === 'results' || mode === 'rematchRequested' || mode === 'afterSki';

    let header = winnerTeam === null ? LocalizeText('snowwar.result.tie') : LocalizeText(`snowwar.team_${ winnerTeam }_wins`);
    let headerColour = winnerTeam === null ? SNOWWAR_NEUTRAL_COLOUR : (SNOWWAR_TEAM_COLOURS[winnerTeam] ?? SNOWWAR_TEAM_COLOURS[1]);
    let headerSize = 28;

    if(mode === 'waiting')
    {
        header = LocalizeText('snowwar.lobby_waiting_for_more_players');
        headerSize = 22;
    }
    else if(mode === 'lobby')
    {
        header = localizeSnowWar('snowwar.lobby_game_start_countdown', { seconds });
        headerColour = SNOWWAR_TEAM_COLOURS[1];
        headerSize = 22;
    }

    const rematchCaption = localizeSnowWar(mode === 'rematchRequested' ? 'snowwar.please_wait' : 'snowwar.rematch', { seconds });

    // updateGamesLeft / updateGettingMoreGamesOption with _buyButtonMode 1.
    const statusVisible = scoresVisible && !hasUnlimitedGames && freeGamesLeft !== -1 && !statusHidden && mode !== 'rematchRequested';
    const showRematch = (mode === 'results' || mode === 'rematchRequested') && !noGames;
    const showBuy = (mode === 'results' || mode === 'rematchRequested' || mode === 'afterSki') && noGames;
    const showPlayAgain = mode === 'afterSki' && !noGames && !playAgainUsed;

    return (
        <SnowWarEndingFrame
            header={header}
            headerColour={headerColour}
            headerSize={headerSize}
            lobbyRows={mode === 'lobby'}
            rows={rows}
            team1Score={scoresVisible ? team1Score : undefined}
            team2Score={scoresVisible ? team2Score : undefined}
            onLeave={onLeave}
        >
            {scoresVisible && <SnowWarMostContainer name="mostKills" player={mostKills} x={300} />}
            {scoresVisible && <SnowWarMostContainer name="mostHits" player={mostHits} x={450} />}
            {mode === 'lobby' && lobbyFieldType !== null && <SnowWarLoadingContainer fieldType={lobbyFieldType} showText={false} />}
            {statusVisible && (
                <SnowWarBox className="snowwar-clickable" name="statusContainer" x={293} y={321} width={297} height={61} onClick={onBuyTokens}>
                    <div className="snowwar-status-games-left">
                        <SnowWarText size={13} text={LocalizeText('snowwar.games_left')} x={0} y={3} width={127} height={18} />
                        <div className="snowwar-status-games-left__count">
                            <SnowWarStrokeText name="games_left" size={20} strokeColor={noGames ? 0xff0000 : 0x1077ac} text={String(freeGamesLeft)} x={0} y={0} width={15} height={26} style={{ width: 'auto' }} />
                        </div>
                    </div>
                    <SnowWarText align="center" name="status.text_get_more_games" size={13} text={LocalizeText('snowwar.buy_x_games')} underline x={0} y={27} width={297} height={18} />
                </SnowWarBox>
            )}
            {(showRematch || showBuy || showPlayAgain) && (
                <SnowWarBox name="buttonsContainer" x={351} y={430} width={180} height={50}>
                    {showPlayAgain && (
                        <SnowWarThickButton height={50} name="button_play_again" width={180} x={0} y={0} onClick={() =>
                        {
                            setPlayAgainUsed(true);
                            setStatusHidden(true);
                            onPlayAgain();
                        }}>
                            <span className="snowwar-thick-button__label">{LocalizeText('snowwar.new_game')}</span>
                        </SnowWarThickButton>
                    )}
                    {showRematch && (
                        <SnowWarThickButton disabled={mode === 'rematchRequested'} height={50} name="button_rematch" width={180} x={0} y={0} onClick={() =>
                        {
                            setStatusHidden(true);
                            onRematch();
                        }}>
                            <span className="snowwar-thick-button__label">{rematchCaption}</span>
                        </SnowWarThickButton>
                    )}
                    {showBuy && (
                        <SnowWarThickButton height={50} name="button_buy_games" width={180} x={0} y={0} onClick={onBuyTokens}>
                            <span className="snowwar-thick-button__label">{LocalizeText('snowwar.buy_x_games')}</span>
                        </SnowWarThickButton>
                    )}
                </SnowWarBox>
            )}
        </SnowWarEndingFrame>
    );
};
