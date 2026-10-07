import { FC } from 'react';
import { LocalizeText, SnowWarArenaVotes } from '../../../../api';
import { SnowWarBitmap, SnowWarBox, snowWarBitmapUrl } from './SnowWarBitmap';
import { SnowWarStrokeText, SnowWarText } from './SnowWarText';

// Plus arena voting (CONTRACT §8). The row sits in the free band of snowwar_lobby_cont between
// players_grid (ends at y 308) and cancel_link_region (y 385), so the AIR lobby geometry stays as is.
const ROW_Y = 310;
const ROW_WIDTH = 387;
const CARD_MAX_WIDTH = 129;
const PREVIEW_WIDTH = 115;
const PREVIEW_HEIGHT = 58;
const BLUE = 0x1077ac;

interface SnowWarArenaVoteViewProps
{
    arenaVotes: SnowWarArenaVotes;
    onVote: (fieldType: number) => void;
}

/** Offered arenas as their official previews and names, with votes, the leader and the own vote. */
export const SnowWarArenaVoteView: FC<SnowWarArenaVoteViewProps> = ({ arenaVotes, onVote }) =>
{
    const { arenas, leadingFieldType, ownVote } = arenaVotes;
    const cardWidth = Math.min(CARD_MAX_WIDTH, Math.floor(ROW_WIDTH / Math.max(1, arenas.length)));
    const left = Math.trunc((407 - (cardWidth * arenas.length)) / 2);

    return (
        <SnowWarBox name="arena_votes" x={left} y={ROW_Y} width={cardWidth * arenas.length} height={75}>
            {arenas.map((arena, index) => (
                <SnowWarBox
                    key={arena.fieldType}
                    className={`snowwar-clickable snowwar-arena-vote ${ arena.fieldType === ownVote ? 'snowwar-arena-vote--own' : '' }`}
                    name={`arena_${ arena.fieldType }`}
                    title={LocalizeText(`snowwar.field.name.${ arena.fieldType }`)}
                    x={index * cardWidth}
                    y={0}
                    width={cardWidth}
                    height={75}
                    onClick={() => onVote(arena.fieldType)}
                >
                    <img
                        alt=""
                        className="snowwar-arena-vote__preview"
                        draggable={false}
                        src={snowWarBitmapUrl(`arena_${ arena.fieldType }_preview`)}
                        style={{ left: Math.trunc((cardWidth - PREVIEW_WIDTH) / 2), width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
                    />
                    {arena.fieldType === leadingFieldType && <SnowWarBitmap bitmap="star_filled_gold" name="leading" x={Math.trunc((cardWidth - PREVIEW_WIDTH) / 2) + 4} y={4} width={14} height={14} />}
                    <SnowWarStrokeText align="right" name="votes" size={16} strokeColor={BLUE} text={String(arena.votes)} x={Math.trunc((cardWidth - PREVIEW_WIDTH) / 2) + PREVIEW_WIDTH - 44} y={PREVIEW_HEIGHT - 24} width={40} height={22} />
                    <SnowWarText align="center" bold color={BLUE} name="arena_name" size={12} text={LocalizeText(`snowwar.field.name.${ arena.fieldType }`)} x={0} y={PREVIEW_HEIGHT} width={cardWidth} height={17} />
                </SnowWarBox>
            ))}
        </SnowWarBox>
    );
};
