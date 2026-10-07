import { FC, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { SnowWarLobbyPlayer } from '../../../../api/snowwar';
import { SnowWarAnimation, SnowWarBitmap, SnowWarBox } from './SnowWarBitmap';
import { SnowWarLobbyView } from './SnowWarLobbyView';
import { SnowWarStrokeText, SnowWarText, SnowWarThickButton } from './SnowWarText';

// GamesMainViewController.INSTRUCTION_ASSETS / INSTRUCTION_FRAME_COUNTS, 1000 ms per frame.
const INSTRUCTION_ASSETS = [ 'move_', 'throw_1_', 'throw_2_', 'throw_3_', 'balls_' ];
const INSTRUCTION_FRAME_COUNTS = [ 4, 4, 5, 5, 5 ];
const TOKEN_OFFERS = [ 'GET_SNOWWAR_TOKENS', 'GET_SNOWWAR_TOKENS2', 'GET_SNOWWAR_TOKENS3' ];
const BLUE = 0x1077ac;

export interface SnowWarGamesMainLobby
{
    players: SnowWarLobbyPlayer[];
    maxPlayers: number;
    queuePosition: number;
    countdownDeadline: number | null;
}

export interface SnowWarGamesMainViewProps
{
    freeGamesLeft: number;
    hasUnlimitedGames: boolean;
    /** Seconds the player is blocked from starting a game (Game2UserBlocked). */
    blockLength: number;
    leaderboardEnabled: boolean;
    /** Lobby container replaces the quick play container while set. */
    lobby: SnowWarGamesMainLobby | null;
    onClose: () => void;
    onPlay: () => void;
    onBuyTokens: (offer: string) => void;
    onOpenClubCenter: () => void;
    onShowLeaderboard: () => void;
    onCancelLobby: () => void;
}

/** AIR `games_main` (frame 413x530) driven like `GamesMainViewController`. */
export const SnowWarGamesMainView: FC<SnowWarGamesMainViewProps> = props =>
{
    const { freeGamesLeft, hasUnlimitedGames, blockLength, leaderboardEnabled, lobby, onClose, onPlay, onBuyTokens, onOpenClubCenter, onShowLeaderboard, onCancelLobby } = props;
    const [ instructionsVisible, setInstructionsVisible ] = useState(false);
    const [ page, setPage ] = useState(0);
    const [ hoveredOffer, setHoveredOffer ] = useState<string>(null);
    // changeBlockStatus: a one-second Timer counts the block down on the Play button.
    const [ blockTicks, setBlockTicks ] = useState<{ length: number; ticks: number }>({ length: 0, ticks: 0 });

    useEffect(() =>
    {
        if(blockLength <= 0) return;

        const timer = setInterval(() => setBlockTicks(value => ({ length: blockLength, ticks: value.length === blockLength ? value.ticks + 1 : 1 })), 1000);
        const stop = setTimeout(() => clearInterval(timer), blockLength * 1000);

        return () =>
        {
            clearInterval(timer);
            clearTimeout(stop);
        };
    }, [ blockLength ]);

    const blockSeconds = blockLength > 0 ? Math.max(0, blockLength - (blockTicks.length === blockLength ? blockTicks.ticks : 0)) : 0;

    // updateGameStartingStatus → checkGameAmountStatus / checkBlockStatus.
    const gamesLeftVisible = !hasUnlimitedGames && freeGamesLeft !== -1;
    const playVisible = freeGamesLeft !== 0;
    const checkBlock = hasUnlimitedGames || freeGamesLeft !== 0;
    const blocked = checkBlock && blockSeconds > 0;
    const playCaption = blocked
        ? `${ Math.floor(blockSeconds / 60) }:${ String(blockSeconds % 60).padStart(2, '0') }`
        : LocalizeText(!hasUnlimitedGames && freeGamesLeft === 0 ? 'catalog.vip.buy.title' : 'snowwar.play');
    const gamesLeftStroke = freeGamesLeft === 0 ? 0xff0000 : BLUE;

    const showPage = (next: number) =>
    {
        setPage((next + INSTRUCTION_ASSETS.length) % INSTRUCTION_ASSETS.length);
        setInstructionsVisible(true);
    };

    const play = () =>
    {
        // onPlay: with no games left the button is hidden; AIR then opens the token offer instead.
        if(freeGamesLeft !== 0) onPlay();
        else onBuyTokens(TOKEN_OFFERS[0]);
    };

    return (
        <OctaneCardView className="snowwar-window snowwar-games-main" frameStyle={3} isResizable={false} uniqueKey="snowwar-games-main" style={{ width: 413, height: 530 }}>
            <OctaneCardHeaderView headerText={LocalizeText('games.main.title')} onCloseClick={onClose} />
            <div className="snowwar-frame-content" style={{ width: 407, height: 491 }}>
                <SnowWarBitmap bitmap="quick_play_background" name="quick_play_background" x={0} y={0} width={407} height={355} />
                {!lobby && (
                    <SnowWarBox name="quick_play_container" x={0} y={0} width={407} height={485}>
                        {!instructionsVisible && (
                            <SnowWarBox name="teaser_container" x={0} y={0} width={407} height={436}>
                                <SnowWarBitmap bitmap="quick_play_teaser" name="quick_play_teaser" x={0} y={160} width={407} height={130} />
                                <SnowWarBox name="header_text_container" x={70} y={107} width={279} height={165}>
                                    <SnowWarStrokeText align="center" name="header" size={20} strokeColor={BLUE} text={LocalizeText('snowwar.descriptionHeader')} x={0} y={0} width={279} height={26} />
                                    <SnowWarText align="center" color={BLUE} size={13} text={LocalizeText('snowwar.descriptionBody')} wrap x={18} y={30} width={243} height={18} />
                                </SnowWarBox>
                                <SnowWarText align="center" bold color={BLUE} name="instructions_link" size={14} text={LocalizeText('snowwar.instructions.link')} underline x={0} y={280} width={407} height={19} onClick={() => showPage(page)} />
                                {leaderboardEnabled && <SnowWarText align="center" bold color={BLUE} name="leaderboard_link" size={14} text={LocalizeText('snowwar.leaderboards.link')} underline x={0} y={315} width={407} height={19} onClick={onShowLeaderboard} />}
                            </SnowWarBox>
                        )}
                        {instructionsVisible && (
                            <SnowWarBox name="instructions_container" x={0} y={0} width={407} height={436}>
                                <SnowWarAnimation key={page} frames={INSTRUCTION_FRAME_COUNTS[page]} interval={1000} name="instructions_image" prefix={INSTRUCTION_ASSETS[page]} x={78} y={80} width={250} height={166} />
                                <SnowWarText color={BLUE} name="instructions_back" size={13} text={LocalizeText('snowwar.instructions.back')} underline x={18} y={324} width={160} height={18} onClick={() => setInstructionsVisible(false)} />
                                <SnowWarBox className="snowwar-clickable" name="instructions_prev" x={10} y={140} width={50} height={50} onClick={() => showPage(page - 1)}>
                                    <SnowWarBitmap bitmap="scroll_left" x={0} y={0} width={50} height={50} />
                                </SnowWarBox>
                                <SnowWarBox className="snowwar-clickable" name="instructions_next" x={345} y={140} width={50} height={50} onClick={() => showPage(page + 1)}>
                                    <SnowWarBitmap bitmap="scroll_right" x={0} y={0} width={50} height={50} />
                                </SnowWarBox>
                                <SnowWarText align="center" bold className="snowwar-text--max-2" color={BLUE} name="instruction_text" size={16} text={LocalizeText(`snowwar.instructions.${ page + 1 }`)} wrap x={63} y={269} width={280} height={21} />
                                <SnowWarBox name="page_list" x={141} y={239} width={125} height={25}>
                                    {INSTRUCTION_ASSETS.map((_, index) => (
                                        <SnowWarBox key={index} className="snowwar-clickable" name={`page_${ index }`} x={index * 25} y={0} width={25} height={25} onClick={() => showPage(index)}>
                                            <SnowWarBitmap bitmap={index <= page ? 'pagination_ball_hilite' : 'pagination_ball'} x={0} y={0} width={25} height={25} />
                                        </SnowWarBox>
                                    ))}
                                </SnowWarBox>
                            </SnowWarBox>
                        )}
                        <SnowWarBox name="footer_container" x={0} y={364} width={407} height={124}>
                            {gamesLeftVisible && (
                                <SnowWarBox name="games_left_region" x={11} y={0} width={229} height={121}>
                                    <div className="snowwar-games-left-band">
                                        <SnowWarText size={14} text={LocalizeText('snowwar.games_left')} x={0} y={3} width={135} height={19} style={{ position: 'relative', left: 0, top: 3, width: 'auto' }} />
                                        <div className="snowwar-games-left-count">
                                            <SnowWarStrokeText name="games_left" size={20} strokeColor={gamesLeftStroke} text={String(freeGamesLeft)} x={0} y={0} width={15} height={26} style={{ width: 'auto' }} />
                                        </div>
                                    </div>
                                    <SnowWarText name="games.lobby.get.games" size={14} text={LocalizeText('snowwar.buy_more_games')} x={0} y={31} width={175} height={19} />
                                    {[ 'btn_more_games_10', 'btn_more_games_100', 'btn_more_games_300' ].map((bitmap, index) => (
                                        <SnowWarBox key={bitmap} className="snowwar-clickable" name={bitmap} x={index * 60} y={52} width={52} height={62} onClick={() => onBuyTokens(TOKEN_OFFERS[index])}>
                                            <div onMouseEnter={() => setHoveredOffer(bitmap)} onMouseLeave={() => setHoveredOffer(null)}>
                                                <SnowWarBitmap bitmap={hoveredOffer === bitmap ? `${ bitmap }_hi` : bitmap} x={0} y={0} width={52} height={62} />
                                            </div>
                                        </SnowWarBox>
                                    ))}
                                </SnowWarBox>
                            )}
                            <SnowWarBox className="snowwar-clickable" name="games_vip_region" x={202} y={-2} width={187} height={44} onClick={onOpenClubCenter}>
                                <SnowWarBitmap bitmap="hc_icon" name="hc_icon" x={0} y={6} width={24} height={24} />
                                <SnowWarText name="games.lobby.get.vip" size={14} text={LocalizeText('snowwar.get_more_games')} underline wrap x={31} y={2} width={158} height={35} />
                            </SnowWarBox>
                            {playVisible && (
                                <SnowWarThickButton className="snowwar-play-button" disabled={blocked} height={50} name="play.button" width={190} x={204} y={64} onClick={play}>
                                    <span className="snowwar-play-button__text">{playCaption}</span>
                                </SnowWarThickButton>
                            )}
                        </SnowWarBox>
                    </SnowWarBox>
                )}
                {lobby && <SnowWarLobbyView {...lobby} onCancel={onCancelLobby} />}
            </div>
        </OctaneCardView>
    );
};
