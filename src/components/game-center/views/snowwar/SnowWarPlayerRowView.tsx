import { FC, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { getSnowWarUniformFigure, SnowWarAvatarImage } from './SnowWarAvatarImage';
import { SnowWarAnimation, SnowWarBitmap, SnowWarBox, snowWarBitmapUrl } from './SnowWarBitmap';
import { SnowWarStrokeText, SnowWarText } from './SnowWarText';

export interface SnowWarPlayerRow
{
    userId: number;
    name: string;
    figure: string;
    gender: string;
    teamId: number;
    /** Results: hits / K.O.'s and the round score. */
    stats?: { hits: number; kills: number; score: number };
    /** Loading / rematch lobby: skill stars and the "total/next" tooltip. */
    skill?: { level: number; totalScore: number; scoreToNextLevel: number };
    /** Own row in the loading view gets green_square. */
    isOwn?: boolean;
    /** Loading view: load_ spinner until StageStillLoading lists the player. */
    loading?: boolean;
    /** Rematch glow (rematch_1..6 ping-pong). */
    rematching?: boolean;
    /** Add-friend corner icon (results, friend list allows a request). */
    onAddFriend?: () => void;
}

interface SnowWarPlayerRowViewProps
{
    row: SnowWarPlayerRow;
    /** Row column of `team<N>PlayersList`; 1 or 2. Rematch lobby rows alternate by join order. */
    team: number;
    /** `snowwar_lobby_player_team_N` (rematch lobby) instead of `snowwar_results_player_team_N`. */
    lobbyLayout?: boolean;
    y: number;
}

const STAR_SPACING = 15;

/** GameEndingViewController.getSkillLevelImage: 10 stars, bronze 1-10, silver 11-20, gold 21-30; team 2 fills from the right. */
const SkillStars: FC<{ level: number; team: number }> = ({ level, team }) =>
{
    const capped = Math.min(level, 30);
    const filled = capped > 0 ? ((capped - 1) % 10) + 1 : 0;
    const star = capped > 20 ? 'star_filled_gold' : capped > 10 ? 'star_filled_silver' : 'star_filled_bronze';

    return (
        <>
            {Array.from({ length: 10 }, (_, index) => (
                <img
                    key={index}
                    alt=""
                    draggable={false}
                    src={snowWarBitmapUrl(index < filled ? star : 'star_empty')}
                    style={{ position: 'absolute', left: (team === 1 ? index : 9 - index) * STAR_SPACING, top: 0, imageRendering: 'pixelated' }}
                />
            ))}
        </>
    );
};

/** One player row of the snowwar_ending team lists (289x62, mirrored for team 2). */
export const SnowWarPlayerRowView: FC<SnowWarPlayerRowViewProps> = ({ row, team, lobbyLayout = false, y }) =>
{
    const [ friendHover, setFriendHover ] = useState(false);
    const [ friendAsked, setFriendAsked ] = useState(false);
    const blue = team === 1;
    const colour = blue ? 'blue' : 'red';
    const imageX = blue ? 0 : 223;
    const dataX = blue ? 64 : 61;
    const scoreX = blue ? 226 : 0;
    const figure = getSnowWarUniformFigure(row.figure, row.teamId);

    return (
        <SnowWarBox name={`player${ row.userId }`} x={0} y={y} width={289} height={62}>
            <SnowWarBox name="playerImageContainer" x={imageX} y={0} width={64} height={62}>
                <SnowWarBitmap bitmap={row.isOwn ? 'green_square' : `${ colour }_square`} name="playerImageBackground" x={0} y={0} width={64} height={62} />
                <SnowWarAvatarImage direction={blue ? 2 : 4} figure={figure} gender={row.gender} half name="playerImage" setType="full" x={0} y={0} width={64} height={62} />
                {row.onAddFriend && !friendAsked && (
                    <SnowWarBox
                        className="snowwar-clickable"
                        name="addFriend"
                        title={LocalizeText('snowwar.add_friend.tooltip')}
                        x={0}
                        y={0}
                        width={64}
                        height={62}
                        onClick={() =>
                        {
                            setFriendAsked(true);
                            row.onAddFriend();
                        }}
                    >
                        <div onMouseEnter={() => setFriendHover(true)} onMouseLeave={() => setFriendHover(false)}>
                            <SnowWarBitmap bitmap={friendHover ? 'add_friend_icon_green' : `add_friend_icon_${ colour }`} x={blue ? 3 : 41} y={3} width={20} height={20} />
                        </div>
                    </SnowWarBox>
                )}
            </SnowWarBox>
            <SnowWarBox name="playerDataContainer" x={dataX} y={0} width={162} height={62}>
                <SnowWarBitmap bitmap={`${ colour }_infobox`} name="playerDataBackground" x={0} y={0} width={162} height={62} />
                <SnowWarStrokeText name="playerName" size={14} strokeColor={blue ? 0x336699 : 0x993333} text={row.name} x={lobbyLayout ? 46 : 47} y={3} width={lobbyLayout ? 71 : 68} height={19} style={{ width: 'auto', maxWidth: 150 }} />
                {row.stats && (
                    <SnowWarBox name="playerStats" x={20} y={26} width={135} height={35}>
                        <SnowWarText bold color={0xffffff} name="playerHitsLabel" size={11} text={LocalizeText('snowwar.results.hits')} x={0} y={0} width={112} height={16} style={{ width: 'auto' }} />
                        <SnowWarStrokeText align="right" name="playerHits" size={12} strokeColor={blue ? 0x6699cc : 0xcc6666} text={String(row.stats.hits)} x={62} y={0} width={60} height={17} />
                        <SnowWarText bold color={0xffffff} name="playerKillsLabel" size={11} text={LocalizeText('snowwar.results.kills')} x={0} y={14} width={114} height={16} style={{ width: 'auto' }} />
                        <SnowWarStrokeText align="right" name="playerKills" size={12} strokeColor={blue ? 0x6699cc : 0xcc6666} text={String(row.stats.kills)} x={62} y={14} width={60} height={17} />
                    </SnowWarBox>
                )}
                {row.skill && (
                    <SnowWarBox name="scoreTooltip" title={`${ row.skill.totalScore }/${ row.skill.scoreToNextLevel }`} x={7} y={33} width={150} height={13}>
                        <SkillStars level={row.skill.level} team={team} />
                    </SnowWarBox>
                )}
            </SnowWarBox>
            <SnowWarBox name="playerScoreContainer" x={scoreX} y={0} width={61} height={62}>
                <SnowWarBitmap bitmap={`${ colour }_ball`} name="playerScoreBackground" x={0} y={0} width={lobbyLayout ? 61 : 59} height={lobbyLayout ? 62 : 59} />
                {row.rematching && <SnowWarAnimation frames={6} name="playerScoreGlow" pingPong prefix="rematch_" x={0} y={0} width={61} height={62} />}
                {row.stats && <SnowWarStrokeText align="center" name="playerScore" size={18} strokeColor={blue ? 0x1077ac : 0xfd6859} text={String(row.stats.score)} x={0} y={17} width={60} height={24} />}
                {row.loading && <SnowWarAnimation frames={8} name="loadingIcon" prefix="load_" x={5} y={5} width={50} height={50} />}
            </SnowWarBox>
        </SnowWarBox>
    );
};
