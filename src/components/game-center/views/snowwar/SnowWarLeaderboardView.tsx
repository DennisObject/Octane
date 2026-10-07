import { FC, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../api';
import { SnowWarLeaderboard, SnowWarLeaderboardEntry, SnowWarLeaderboardKind, SnowWarLeaderboardRequest } from '../../../../api/snowwar';
import { LayoutBadgeImageView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { SnowWarAvatarImage } from './SnowWarAvatarImage';
import { SnowWarBitmap, SnowWarBox } from './SnowWarBitmap';
import { localizeSnowWar, SnowWarStrokeText, SnowWarText } from './SnowWarText';

/** LeaderboardViewController.var_65 → table. */
const STATE_KINDS: SnowWarLeaderboardKind[] = [ 'friends', 'total', 'weekly', 'weeklyFriends', 'weeklyGroup', 'totalGroup' ];
const ENTRY_HEIGHT = 42;
const BLUE = 0x1077ac;

interface TableState
{
    /** var_65 */
    state: number;
    weekOffset: number;
    /** Visible window start (LeaderboardTable.var_110); -1 until the first response. */
    index: number;
    /** var_501: a request is in flight. */
    waiting: boolean;
}

export interface SnowWarLeaderboardViewProps
{
    leaderboard: SnowWarLeaderboard | null;
    ownUserId: number;
    onRequest: (request: SnowWarLeaderboardRequest) => void;
    onOpenProfile: (userId: number) => void;
    onOpenGroup: (groupId: number) => void;
    onClose: () => void;
}

const isWeekly = (state: number) => state >= 2 && state <= 4;

/** `snowwar_leaderboard` frame (437x511), LeaderboardViewController + LeaderboardTable. */
export const SnowWarLeaderboardView: FC<SnowWarLeaderboardViewProps> = ({ leaderboard, ownUserId, onRequest, onOpenProfile, onOpenGroup, onClose }) =>
{
    const viewSize = GetConfigurationValue<number>('games.highscores.viewSize', 8);
    const windowSize = GetConfigurationValue<number>('games.highscores.windowSize', 50);
    const scrolling = GetConfigurationValue<boolean>('games.highscores.scrolling.enabled', true);
    // showLeaderboard → showFriendsAllTime.
    const [ table, setTable ] = useState<TableState>({ state: 0, weekOffset: 0, index: -1, waiting: true });
    const [ scrollImages, setScrollImages ] = useState({ up: 'normal', down: 'normal' });
    const [ resetMinutes, setResetMinutes ] = useState(0);
    const appliedRef = useRef<SnowWarLeaderboard>(null);

    const show = (state: number, weekOffset = 0) =>
    {
        // revertToDefaultView: drop the table and ask for the rows around me.
        appliedRef.current = null;
        setTable({ state, weekOffset, index: -1, waiting: true });
        onRequest({ kind: STATE_KINDS[state], startRank: -1, direction: 0, weekOffset, viewSize, windowSize });
    };

    // showLeaderboard → showFriendsAllTime: the initial table state is already state 0.
    useEffect(() => onRequest({ kind: STATE_KINDS[0], startRank: -1, direction: 0, weekOffset: 0, viewSize, windowSize }), [ onRequest, viewSize, windowSize ]);

    const current = leaderboard && leaderboard.kind === STATE_KINDS[table.state] ? leaderboard : null;
    const entries = current?.entries ?? [];

    // addEntries: first response → initializeList, later windows → updateCurrentIndex.
    useEffect(() =>
    {
        if(!current || appliedRef.current === current) return;

        const first = appliedRef.current === null;

        appliedRef.current = current;
        setTable(previous =>
        {
            let index = previous.index;

            if(first)
            {
                const own = current.entries.findIndex(entry => (entry.gender === 'g' ? entry.userId === current.favouriteGroupId : entry.userId === ownUserId));

                index = own >= viewSize ? own - (viewSize / 2) : 0;
            }
            else index = index < 0 ? index + windowSize : index - windowSize;

            return { ...previous, index, waiting: false };
        });

        if(isWeekly(table.state)) setResetMinutes(current.minutesUntilReset);
    }, [ current, ownUserId, table.state, viewSize, windowSize ]);

    // startWeeklyResetTimer: one tick per minute.
    useEffect(() =>
    {
        if(!isWeekly(table.state)) return;

        const timer = setInterval(() => setResetMinutes(value => Math.max(0, value - 1)), 60000);

        return () => clearInterval(timer);
    }, [ table.state, current ]);

    const visible = table.index >= 0 ? entries.slice(table.index, Math.min(entries.length, table.index + viewSize)) : [];
    const canScrollUp = !table.waiting && entries.length > 0 && !(entries[0].rank === 1 && table.index <= 0);
    const canScrollDown = !table.waiting && entries.length > 0 && !(entries[entries.length - 1].rank >= current.totalListSize && table.index + viewSize >= entries.length);

    const scrollUp = () =>
    {
        if(table.waiting) return;

        const index = table.index - viewSize;

        if(index < 0 && entries[0].rank > 1)
        {
            setTable({ ...table, index, waiting: true });
            onRequest({ kind: STATE_KINDS[table.state], startRank: Math.max(1, entries[0].rank - windowSize), direction: 1, weekOffset: table.weekOffset, viewSize, windowSize });
            return;
        }

        setTable({ ...table, index: Math.max(0, index) });
    };

    const scrollDown = () =>
    {
        if(table.waiting) return;

        const index = table.index + viewSize;

        if(index + viewSize >= entries.length && entries[entries.length - 1].rank < current.totalListSize)
        {
            setTable({ ...table, index, waiting: true });
            onRequest({ kind: STATE_KINDS[table.state], startRank: entries[entries.length - 1].rank + 1, direction: 0, weekOffset: table.weekOffset, viewSize, windowSize });
            return;
        }

        setTable({ ...table, index });
    };

    // updateWeekSelection.
    const weekly = isWeekly(table.state);
    const nextWeekVisible = weekly && table.weekOffset > 0;
    const previousWeekVisible = weekly && !!current && table.weekOffset < current.maxOffset;
    const resetVisible = weekly && !nextWeekVisible && !!current;
    const allTimeActive = !weekly;
    const caption = LocalizeText(table.state === 0 || table.state === 3 ? 'snowwar.leaderboard.friends' : 'snowwar.leaderboard.all');

    // populateList: own row highlight (global all-time tables only when it is the appended last row),
    // dividers survive only between highlighted rows, and the global tables pad short pages before the last row.
    const allTime = table.state === 1 || table.state === 5;
    const highlightVisible = visible.map((entry, index) =>
    {
        const own = entry.gender === 'g' ? entry.userId === current.favouriteGroupId : entry.userId === ownUserId;

        return own && !(allTime && index < visible.length - 1);
    });
    const rows: { entry: SnowWarLeaderboardEntry | null; highlight: boolean }[] = visible.map((entry, index) => ({ entry, highlight: highlightVisible[index] }));
    const globalTable = allTime || table.state === 2 || table.state === 4;

    if(globalTable && rows.length % viewSize !== 0)
    {
        const last = rows.pop();

        for(let i = 0; i < (visible.length % viewSize) - 1; i++) rows.push({ entry: null, highlight: false });
        rows.push(last);
    }

    const scrollImage = (direction: 'up' | 'down', state: string) => setScrollImages(images => ({ ...images, [direction]: state }));

    return (
        <OctaneCardView className="snowwar-window snowwar-leaderboard-window" frameStyle={3} isResizable={false} uniqueKey="snowwar-leaderboard" style={{ width: 437, height: 511 }}>
            <OctaneCardHeaderView headerText={caption} onCloseClick={onClose} />
            <div className="snowwar-frame-content" style={{ width: 431, height: 472 }}>
                <SnowWarBitmap bitmap="leaderboard_bg" name="background" x={0} y={0} width={431} height={472} />
                <SnowWarBox className="snowwar-clickable" name="this_week_region" x={107} y={0} width={119} height={28} onClick={() => table.state === 0 ? show(3) : table.state === 1 ? show(2) : table.state === 5 ? show(4) : null}>
                    <SnowWarBitmap bitmap={allTimeActive ? 'left_blue' : 'left_black'} name="this_week_image" x={0} y={0} width={119} height={28} />
                    <SnowWarText align="center" bold color={allTimeActive ? 0 : 0xffffff} name="this_week_text" size={12} text={nextWeekVisible && current ? `${ current.year }/${ current.week }` : LocalizeText('snowwar.leaderboard.this_week')} x={0} y={5} width={119} height={17} />
                </SnowWarBox>
                <SnowWarBox className="snowwar-clickable" name="all_time_region" x={226} y={0} width={119} height={28} onClick={() => table.state === 2 ? show(1) : table.state === 3 ? show(0) : table.state === 4 ? show(5) : null}>
                    <SnowWarBitmap bitmap={allTimeActive ? 'right_black' : 'right_blue'} name="all_time_image" x={0} y={0} width={119} height={28} />
                    <SnowWarText align="center" bold color={allTimeActive ? 0xffffff : 0} name="all_time_text" size={12} text={LocalizeText('snowwar.leaderboard.all_time')} x={0} y={5} width={119} height={17} />
                </SnowWarBox>
                <SnowWarBox name="borderContainer" x={40} y={30} width={350} height={389}>
                    {visible.length > 0 && <SnowWarBox className="snowwar-list-border" name="listBorder" x={0} y={28} width={350} height={336} />}
                    {scrolling && canScrollUp && (
                        <SnowWarBox className="snowwar-clickable" name="scrollUp" x={146} y={1} width={58} height={28} onClick={scrollUp}>
                            <div onMouseDown={() => scrollImage('up', 'click')} onMouseEnter={() => scrollImage('up', 'hilite')} onMouseLeave={() => scrollImage('up', 'normal')} onMouseUp={() => scrollImage('up', 'normal')}>
                                <SnowWarBitmap bitmap={`scroll_up_${ scrollImages.up }`} x={0} y={0} width={58} height={28} />
                            </div>
                        </SnowWarBox>
                    )}
                    {scrolling && canScrollDown && (
                        <SnowWarBox className="snowwar-clickable" name="scrollDown" x={146} y={361} width={58} height={28} onClick={scrollDown}>
                            <div onMouseDown={() => scrollImage('down', 'click')} onMouseEnter={() => scrollImage('down', 'hilite')} onMouseLeave={() => scrollImage('down', 'normal')} onMouseUp={() => scrollImage('down', 'normal')}>
                                <SnowWarBitmap bitmap={`scroll_down_${ scrollImages.down }`} x={0} y={0} width={58} height={28} />
                            </div>
                        </SnowWarBox>
                    )}
                </SnowWarBox>
                <SnowWarText align="center" name="changeView" size={13} text={LocalizeText('snowwar.leaderboard.all')} underline x={0} y={445} width={150} height={18} onClick={() => show(table.state === 1 ? 1 : 2)} />
                {visible.length > 0 && (
                    <SnowWarBox name="list" x={37} y={58} width={356} height={336}>
                        {rows.map(({ entry, highlight }, index) => (
                            <SnowWarBox key={entry ? `${ entry.userId }-${ entry.rank }` : `filler-${ index }`} name="entry" x={0} y={index * ENTRY_HEIGHT} width={356} height={ENTRY_HEIGHT}>
                                {highlight && <SnowWarBitmap bitmap="leaderboard_highlighter" name="highlight" x={0} y={0} width={356} height={42} />}
                                {entry && (
                                    <>
                                        <SnowWarText align="center" bold color={BLUE} name="rank" size={15} text={String(entry.rank)} x={7} y={9} width={50} height={20} style={{ letterSpacing: 0.5 }} />
                                        <SnowWarBox className="snowwar-clickable" name="imageRegion" x={53} y={1} width={44} height={40} onClick={() => (entry.gender === 'g' ? onOpenGroup(entry.userId) : onOpenProfile(entry.userId))} />
                                        {entry.gender === 'g'
                                            ? <SnowWarBox name="avatarImage" x={50} y={1} width={44} height={40}><LayoutBadgeImageView badgeCode={entry.figure} isGroup /></SnowWarBox>
                                            : <SnowWarAvatarImage direction={2} figure={entry.figure} gender={entry.gender} name="avatarImage" setType="head" x={50} y={1} width={44} height={40} style={{ pointerEvents: 'none' }} />}
                                        <SnowWarText color={BLUE} name="name" size={15} text={entry.name} x={98} y={9} width={88} height={20} style={{ width: 'auto' }} />
                                        {/* score: auto_size left with on_resize_align_right, so it keeps its right edge (342). */}
                                        <SnowWarText bold color={BLUE} name="score" size={15} text={String(entry.score)} x={0} y={9} width={58} height={20} style={{ left: 'auto', right: 356 - 342, width: 'auto', letterSpacing: 0.5 }} />
                                    </>
                                )}
                                {highlight && index < rows.length - 1 && rows[index + 1].highlight && <SnowWarBitmap bitmap="leaderboard_divider" name="divider" x={0} y={40} width={350} height={2} />}
                            </SnowWarBox>
                        ))}
                    </SnowWarBox>
                )}
                {previousWeekVisible && (
                    <SnowWarBox className="snowwar-clickable" name="previousWeek" x={17} y={199} width={14} height={18} onClick={() => show(table.state, table.weekOffset + 1)}>
                        <SnowWarBitmap bitmap="scroll_left" x={0} y={0} width={14} height={18} />
                    </SnowWarBox>
                )}
                {nextWeekVisible && (
                    <SnowWarBox className="snowwar-clickable" name="nextWeek" x={400} y={199} width={14} height={18} onClick={() => show(table.state, table.weekOffset - 1)}>
                        <SnowWarBitmap bitmap="scroll_right" x={0} y={0} width={14} height={18} />
                    </SnowWarBox>
                )}
                {resetVisible && (
                    <SnowWarStrokeText
                        name="reset_text"
                        size={14}
                        strokeColor={BLUE}
                        text={localizeSnowWar('snowwar.leaderboard.weekly_reset', {
                            days: Math.floor(resetMinutes / 60 / 24),
                            hours: Math.floor((resetMinutes - (Math.floor(resetMinutes / 60 / 24) * 24 * 60)) / 60),
                            minutes: resetMinutes % 60
                        })}
                        x={251}
                        y={397}
                        width={49}
                        height={19}
                        style={{ width: 'auto' }}
                    />
                )}
                <SnowWarText align="center" name="changeGroupView" size={13} text={LocalizeText('people.groups.title')} underline x={280} y={445} width={150} height={18} onClick={() => show(table.state === 5 ? 5 : 4)} />
                <SnowWarText align="center" name="changeFriendsView" size={13} text={LocalizeText('snowwar.leaderboard.friends')} underline x={135} y={445} width={150} height={18} onClick={() => show(table.state === 0 ? 0 : 3)} />
            </div>
        </OctaneCardView>
    );
};
