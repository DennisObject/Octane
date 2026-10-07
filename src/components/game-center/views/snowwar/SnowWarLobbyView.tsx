import { FC, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { SnowWarArenaVotes, SnowWarLobbyPlayer } from '../../../../api/snowwar';
import { SnowWarArenaVoteView } from './SnowWarArenaVoteView';
import { SnowWarAvatarImage } from './SnowWarAvatarImage';
import { SnowWarAnimation, SnowWarBitmap, SnowWarBox } from './SnowWarBitmap';
import { localizeSnowWar, SnowWarStrokeText, SnowWarText } from './SnowWarText';

interface SnowWarLobbyViewProps
{
    players: SnowWarLobbyPlayer[];
    maxPlayers: number;
    queuePosition: number;
    /** Wall-clock deadline of Game2StartCounter, null while waiting. */
    countdownDeadline: number | null;
    /** Plus arena voting; null hides the row. */
    arenaVotes: SnowWarArenaVotes | null;
    onVoteArena: (fieldType: number) => void;
    onCancel: () => void;
}

// itemgrid_vertical players_grid 335 wide, spacing 3: five 62x63 tiles per row.
const TILE_WIDTH = 62;
const TILE_HEIGHT = 63;
const GRID_SPACING = 3;
const GRID_COLUMNS = Math.floor((335 + GRID_SPACING) / (TILE_WIDTH + GRID_SPACING));

const secondsUntil = (deadline: number, now: number) => Math.max(0, Math.ceil((deadline - now) / 1000));

/** `snowwar_lobby_cont` inside games_main (GameLobbyWindowCtrl); `center()`ed in the 407x491 frame content. */
export const SnowWarLobbyView: FC<SnowWarLobbyViewProps> = ({ players, maxPlayers, queuePosition, countdownDeadline, arenaVotes, onVoteArena, onCancel }) =>
{
    const [ now, setNow ] = useState(Date.now);

    useEffect(() =>
    {
        if(!countdownDeadline) return;

        const timer = setInterval(() => setNow(Date.now()), 250);

        return () => clearInterval(timer);
    }, [ countdownDeadline ]);

    const seconds = countdownDeadline ? secondsUntil(countdownDeadline, now) : -1;

    // updateDialog: countdown first, then queue position, else waiting.
    const waitText = seconds >= 0
        ? localizeSnowWar('snowwar.lobby_game_start_countdown', { seconds })
        : queuePosition >= 0
            ? localizeSnowWar('snowwar.lobby_arena_queue_position', { position: queuePosition })
            : LocalizeText('snowwar.lobby_waiting_for_more_players');

    return (
        <SnowWarBox name="snowwar_lobby_cont" x={0} y={Math.trunc((491 - 436) / 2)} width={407} height={436}>
            <SnowWarStrokeText align="center" name="wait_text" size={18} strokeColor={0x1077ac} text={waitText} x={40} y={118} width={335} height={24} />
            <SnowWarBox name="players_grid" x={40} y={178} width={335} height={130}>
                {Array.from({ length: maxPlayers }, (_, index) =>
                {
                    const player = players[index];
                    const x = (index % GRID_COLUMNS) * (TILE_WIDTH + GRID_SPACING);
                    const y = Math.floor(index / GRID_COLUMNS) * (TILE_HEIGHT + GRID_SPACING);

                    return (
                        <SnowWarBox key={player ? `p${ player.userId }` : `s${ index }`} name="region" title={player?.name} x={x} y={y} width={TILE_WIDTH} height={TILE_HEIGHT}>
                            <SnowWarBitmap bitmap="blue_square" name="bg_image" x={0} y={0} width={TILE_WIDTH} height={TILE_HEIGHT} />
                            {player
                                ? <SnowWarAvatarImage direction={2} figure={player.figure} gender={player.gender} name="image" setType="head" x={0} y={0} width={TILE_WIDTH} height={TILE_HEIGHT} />
                                : <SnowWarAnimation frames={8} name="image" prefix="load_" x={0} y={0} width={TILE_WIDTH} height={TILE_HEIGHT} />}
                        </SnowWarBox>
                    );
                })}
            </SnowWarBox>
            {arenaVotes && arenaVotes.arenas.length > 0 && <SnowWarArenaVoteView arenaVotes={arenaVotes} onVote={onVoteArena} />}
            <SnowWarBox className="snowwar-clickable" name="cancel_link_region" x={178} y={385} width={63} height={23} onClick={onCancel}>
                <SnowWarText name="cancel_link" size={12} text={LocalizeText('generic.cancel')} underline x={0} y={0} width={83} height={17} />
            </SnowWarBox>
        </SnowWarBox>
    );
};
