import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { CSSProperties, FC, Ref, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    BadgeLeaderboardEntry,
    fetchBadgeLeaderboard,
    getCachedBadgeLeaderboard,
    GetConfigurationValue,
    GetUserProfile,
    localizeWithFallback
} from '../../api';
import {
    leaderboardButtonCloseSwf,
    leaderboardDropdownOpener,
    leaderboardEntryEven,
    leaderboardEntrySelf,
    leaderboardEntryUneven,
    leaderboardHeader,
    leaderboardRankDefault,
    leaderboardRankFirst,
    leaderboardRankSecond,
    leaderboardRankThird
} from '../../assets/images/leaderboard_badge';
import { DraggableWindow, DraggableWindowPosition } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { BadgeLeaderboardFace } from './BadgeLeaderboardFace';
import {
    getAssetsFor,
    getBoard,
    getRarityDescriptor,
    getSupportedRarities,
    LEADERBOARD_TEXT_FALLBACKS,
    LeaderboardRarity,
    LeaderboardTarget,
    normalizeTarget,
    PAGE_SIZE,
    parseLeaderboardLink
} from './badgeLeaderboardPages';

// BadgeLeaderboardDataServer: a chunk older than a minute is requested again.
const STALE_AFTER_MS = 60000;
const DEFAULT_TARGET: LeaderboardTarget = { type: 0, rarity: -1, page: 0 };
// hidden_dropdown: 19px per option inside 6px of padding and border, 139px for the default seven options and one row taller with the uncommon board.
const MENU_ITEM_HEIGHT = 19;
const MENU_CHROME = 6;

const text = (key: string, parameters: string[] = null, replacements: string[] = null) =>
    localizeWithFallback(key, LEADERBOARD_TEXT_FALLBACKS[key] ?? key, parameters, replacements);

// The official texts keep line breaks as a literal backslash-n; the v75 text loader turns them into real ones.
const lines = (value: string) => value.replace(/\\n/g, '\n').replace(/\n+$/, '');

const rankText = (rank: number) => (rank < 0 ? '--' : String(rank));

const rankImage = (rank: number) =>
    rank === 1 ? leaderboardRankFirst : rank === 2 ? leaderboardRankSecond : rank === 3 ? leaderboardRankThird : leaderboardRankDefault;

interface LeaderboardTextProps {
    value: string;
    x: number;
    y: number;
    /** Anchor the right edge of the text at `x` (inside a parent `parentWidth` wide) instead of its left edge. */
    parentWidth?: number;
    bold?: boolean;
    size?: number;
    color?: number;
    thickness?: number;
    blend?: 'multiply' | 'screen';
    maxWidth?: number;
    className?: string;
    innerRef?: Ref<HTMLDivElement>;
}

/** One v75 TextField at its layout rectangle. Black text multiplies over white, white text screens over black, so it can sit on any skin. */
const LeaderboardText: FC<LeaderboardTextProps> = ({
    value,
    x,
    y,
    parentWidth,
    bold = false,
    size,
    color,
    thickness,
    blend = 'multiply',
    maxWidth,
    className = '',
    innerRef
}) => (
    <div
        ref={innerRef}
        className={`octane-badge-leaderboard__text ${className}`}
        style={{ ...(parentWidth === undefined ? { left: x } : { right: parentWidth - x }), top: y, mixBlendMode: blend }}
    >
        <NativeText
            background={blend === 'screen' ? 0x000000 : 0xffffff}
            maxWidth={maxWidth}
            overrides={{ ...(size ? { size } : {}), ...(color !== undefined ? { color } : {}), ...(thickness !== undefined ? { thickness } : {}) }}
            text={value}
            textStyle={bold ? 'u_bold' : 'u_regular'}
        />
    </div>
);

/** rank_type_extended_img: a bitmap in the middle of its 65x47 box; the v75 runtime lands it 3px below the container top plus half the free height. */
/** rank_type_info: a 295x40 field whose text sits in the middle of its height. */
const InfoText: FC<{ value: string }> = ({ value }) =>
{
    const textRef = useRef<HTMLDivElement>(null);
    const { height } = useElementSize(textRef, value);

    return (
        <LeaderboardText
            color={0x222222}
            innerRef={textRef}
            maxWidth={295}
            size={11}
            value={value}
            x={74}
            y={6 + Math.max(0, Math.ceil((40 - (height || 28)) / 2))}
        />
    );
};

const HeaderEmblem: FC<{ src: string; yOffset: number }> = ({ src, yOffset }) =>
{
    const [size, setSize] = useState<[number, number]>([25, 25]);

    return (
        <img
            alt=""
            className="octane-badge-leaderboard__info-emblem"
            draggable={false}
            src={src}
            style={{ left: 4 + Math.floor((65 - size[0]) / 2), top: Math.ceil((54 - size[1]) / 2) + yOffset }}
            onLoad={(event) => setSize([event.currentTarget.naturalWidth, event.currentTarget.naturalHeight])}
        />
    );
};

/** Track an element's size: NativeText fills its field after the font has loaded, so the first layout pass is not the final one. */
const useElementSize = (ref: RefObject<HTMLElement>, dependency: unknown): { width: number; height: number } =>
{
    const [size, setSize] = useState({ width: 0, height: 0 });

    useLayoutEffect(() =>
    {
        const element = ref.current;

        if (!element) return;

        const measure = () =>
            setSize((previous) =>
                previous.width === element.offsetWidth && previous.height === element.offsetHeight
                    ? previous
                    : { width: element.offsetWidth, height: element.offsetHeight }
            );
        const observer = new ResizeObserver(measure);

        measure();
        observer.observe(element);

        return () => observer.disconnect();
    }, [ref, dependency]);

    return size;
};

/** rank_border (border style 14, 25x25) grows with its number so it always holds it, and stays centred in the 45px rank_container. */
const RankBubble: FC<{ rank: number; isOwn: boolean }> = ({ rank, isOwn }) =>
{
    const textRef = useRef<HTMLDivElement>(null);
    const { width: textWidth } = useElementSize(textRef, rank);
    const width = Math.max(25, (textWidth || 13) + 12);

    return (
        <div
            className="octane-badge-leaderboard__rank"
            style={{ left: 5 + Math.floor((45 - width) / 2), top: isOwn ? 9 : 8, width, ['--rank-image' as string]: `url(${rankImage(rank)})` }}
        >
            <LeaderboardText bold size={15} value={rankText(rank)} x={7} y={3} />
            <LeaderboardText blend="screen" bold color={0xffffff} innerRef={textRef} size={15} value={rankText(rank)} x={6} y={2} />
        </div>
    );
};

interface EntryRowProps {
    entry: BadgeLeaderboardEntry;
    emblem: string;
    isOwn: boolean;
    isEven: boolean;
    onProfile: (userId: number) => void;
}

// entry_template (362x41) and own_container (370x43): the rank bubble, the face region, the name and the right-aligned score + emblem.
const EntryRow: FC<EntryRowProps> = ({ entry, emblem, isOwn, isEven, onProfile }) =>
{
    const [emblemWidth, setEmblemWidth] = useState(25);
    const right = isOwn ? 359 : 351;

    return (
        <div className={`octane-badge-leaderboard__entry ${isOwn ? 'is-own' : ''}`} data-user-id={entry.userId}>
            <img
                alt=""
                className="octane-badge-leaderboard__entry-bg"
                draggable={false}
                src={isOwn ? leaderboardEntrySelf : isEven ? leaderboardEntryEven : leaderboardEntryUneven}
            />
            <RankBubble isOwn={isOwn} rank={entry.rank} />
            <button
                aria-label={entry.username}
                className="octane-badge-leaderboard__profile"
                style={{ left: 51, top: isOwn ? 4 : 3 }}
                type="button"
                onClick={() => onProfile(entry.userId)}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <span className="octane-badge-leaderboard__face-holder">
                    <BadgeLeaderboardFace figure={entry.figure} />
                </span>
            </button>
            <LeaderboardText value={entry.username} x={isOwn ? 97 : 98} y={isOwn ? 13 : 12} />
            <img
                alt=""
                className="octane-badge-leaderboard__emblem"
                draggable={false}
                src={emblem}
                style={{ left: right - emblemWidth, top: 7 }}
                onLoad={(event) => setEmblemWidth(event.currentTarget.naturalWidth)}
            />
            <LeaderboardText bold parentWidth={isOwn ? 370 : 362} value={String(entry.score)} x={right - emblemWidth - 7} y={12} />
        </div>
    );
};

export const BadgeLeaderboardView: FC<{}> = () =>
{
    const [isVisible, setIsVisible] = useState(false);
    // The board asked for (a link, the menu or the pager); it is normalized against the rarities known now, so a link that names the uncommon board before the
    // response says the hotel has one shows it as soon as that is known.
    const [request, setRequest] = useState<{ type: number; rarity: number; page: number }>(DEFAULT_TARGET);
    const [version, setVersion] = useState(0);
    const [loadError, setLoadError] = useState<string>(null);
    const [, setLoadedAt] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const lastFetchRef = useRef(0);
    const titleRef = useRef<HTMLDivElement>(null);

    const response = getCachedBadgeLeaderboard();
    const hasUncommon = GetConfigurationValue<boolean>('badge_rarity.uncommon', false) || (response?.leaderboards?.rarity?.uncommon?.totalPlayers ?? 0) > 0;
    const supported = useMemo(() => getSupportedRarities(hasUncommon), [hasUncommon]);
    const target = useMemo(() => normalizeTarget(request.type, request.rarity, request.page, supported), [request, supported]);

    // Opening, switching category and paging all go through native showBadgeLeaderboard(type, rarity, page).
    const show = useCallback(
        (type: number, rarity: number, page: number) =>
        {
            setRequest({ type, rarity, page });
            setIsMenuOpen(false);
            setIsVisible(true);
            setVersion((value) => value + 1);
        },
        []
    );

    useEffect(() =>
    {
        const linkReceived = (url: string) =>
        {
            const nativeLink = parseLeaderboardLink(url);

            if (nativeLink)
            {
                show(nativeLink.type, nativeLink.rarity, nativeLink.page);

                return;
            }

            const parts = url.split('/');

            if (parts.length < 2) return;

            switch (parts[1])
            {
                case 'show':
                    show(0, -1, 0);
                    return;
                case 'hide':
                    setIsVisible(false);
                    return;
                case 'toggle':
                    setIsVisible((value) => !value);
                    return;
                case 'refresh':
                    lastFetchRef.current = 0;
                    setVersion((value) => value + 1);
                    return;
            }
        };
        const trackers: ILinkEventTracker[] = [
            { linkReceived, eventUrlPrefix: 'badge-leaderboard/' },
            { linkReceived, eventUrlPrefix: 'badge_leaderboard/' }
        ];

        for (const tracker of trackers) AddLinkEventTracker(tracker);

        return () =>
        {
            for (const tracker of trackers) RemoveLinkEventTracker(tracker);
        };
    }, [show]);

    useEffect(() =>
    {
        if (!isVisible) return;

        let cancelled = false;

        if (getCachedBadgeLeaderboard() && Date.now() - lastFetchRef.current <= STALE_AFTER_MS) return;

        fetchBadgeLeaderboard(true)
            .then(() =>
            {
                lastFetchRef.current = Date.now();

                if (!cancelled)
                {
                    setLoadError(null);
                    setLoadedAt(Date.now());
                }
            })
            .catch((error) =>
            {
                if (!cancelled) setLoadError(String((error as Error)?.message || error));
            });

        return () =>
        {
            cancelled = true;
        };
    }, [isVisible, version]);

    useEffect(() =>
    {
        if (!isMenuOpen) return;

        const close = () => setIsMenuOpen(false);

        window.addEventListener('pointerdown', close);

        return () => window.removeEventListener('pointerdown', close);
    }, [isMenuOpen]);

    const assets = getAssetsFor(target);
    const board = getBoard(response, target);
    const entries = board?.entries ?? [];
    // The pager follows what the data holds: the server's totalEntries, never more than the entries that reached the client.
    const totalEntries = board ? Math.min(board.totalPlayers ?? entries.length, entries.length) : 0;
    const canGoNext = (target.page + 1) * PAGE_SIZE < totalEntries;
    const canGoPrevious = target.page > 0;
    const pageEntries = entries.slice(target.page * PAGE_SIZE, target.page * PAGE_SIZE + PAGE_SIZE);
    const ownEntry = board?.viewerEntry?.userId ? (board.viewerEntry as BadgeLeaderboardEntry) : null;

    const rarityName = (rarity: number) => text(getRarityDescriptor(rarity)?.textKey ?? '');
    const titleText =
        target.type === 1
            ? text('badge_leaderboard.title.rarity', ['rarity'], [rarityName(target.rarity)])
            : target.type === 2
                ? text('badge_leaderboard.title.achievement_level')
                : text('badge_leaderboard.title.total_badges');
    const infoText =
        target.type === 1
            ? text(getRarityDescriptor(target.rarity).infoKey)
            : target.type === 2
                ? text('badge_leaderboard.info.achievement_level')
                : text('badge_leaderboard.info.total_badges');
    const options = [
        { label: text('badge_leaderboard.option.total_badges'), type: 0, rarity: -1 },
        { label: text('badge_leaderboard.option.achievement_level'), type: 2, rarity: -1 },
        ...supported.map((rarity) => ({ label: text('badge_leaderboard.option.rarity', ['rarity'], [rarityName(rarity)]), type: 1, rarity }))
    ];
    const selectedIndex = target.type === 0 ? 0 : target.type === 2 ? 1 : Math.max(0, supported.indexOf(target.rarity as LeaderboardRarity)) + 2;

    // The title and its arrow are one centred row (itemlist_horizontal, spacing 6).
    const { width: titleWidth } = useElementSize(titleRef, isVisible);
    const titleLeft = titleWidth > 0 ? Math.ceil((412 - titleWidth) / 2) : null;

    const openProfile = useCallback((userId: number) =>
    {
        if (userId > 0) GetUserProfile(userId);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="octane-badge-leaderboard fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <DraggableWindow
                handleSelector=".octane-badge-leaderboard__drag-handle"
                uniqueKey="badge-leaderboard"
                windowPosition={DraggableWindowPosition.CENTER}
            >
                <div
                    className="octane-badge-leaderboard__window pointer-events-auto"
                    role="dialog"
                    style={{ '--badge-leaderboard-frame': `url(${assets.frame})` } as CSSProperties}
                >
                    <div aria-hidden="true" className="octane-badge-leaderboard__frame" />
                    <div className="octane-badge-leaderboard__drag-handle" />
                    <div
                        ref={titleRef}
                        className="octane-badge-leaderboard__title"
                        style={{ left: titleLeft ?? 0, visibility: titleLeft === null ? 'hidden' : 'visible' }}
                    >
                        <button
                            className="octane-badge-leaderboard__title-text"
                            type="button"
                            onClick={() => setIsMenuOpen((value) => !value)}
                            onPointerDown={(event) => event.stopPropagation()}
                        >
                            {[
                                [0, 5],
                                [1, 4],
                                [2, 5],
                                [1, 6]
                            ].map(([x, y]) => (
                                <LeaderboardText key={`${x}-${y}`} bold size={16} value={titleText} x={x} y={y} />
                            ))}
                            <LeaderboardText blend="screen" bold color={0xffffff} size={16} thickness={50} value={titleText} x={1} y={5} />
                            <span className="octane-badge-leaderboard__title-sizer">
                                <NativeText background={0xffffff} overrides={{ size: 16 }} text={titleText} textStyle="u_bold" />
                            </span>
                        </button>
                        <button
                            aria-label={options[selectedIndex]?.label}
                            className="octane-badge-leaderboard__opener"
                            type="button"
                            onClick={() => setIsMenuOpen((value) => !value)}
                            onPointerDown={(event) => event.stopPropagation()}
                        >
                            <img alt="" draggable={false} src={leaderboardDropdownOpener} />
                        </button>
                    </div>
                    <button
                        aria-label="Close"
                        className="octane-badge-leaderboard__close"
                        type="button"
                        onClick={() => setIsVisible(false)}
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        <span style={{ backgroundImage: `url(${leaderboardButtonCloseSwf})` }} />
                    </button>
                    {isMenuOpen && (
                        <div className="octane-badge-leaderboard__menu" role="listbox" style={{ height: MENU_CHROME + options.length * MENU_ITEM_HEIGHT }} onPointerDown={(event) => event.stopPropagation()}>
                            {options.map((option, index) => (
                                <button
                                    key={`${option.type}-${option.rarity}`}
                                    aria-selected={index === selectedIndex}
                                    className={`octane-badge-leaderboard__menu-item ${index === selectedIndex ? 'is-selected' : ''}`}
                                    role="option"
                                    type="button"
                                    onClick={() => show(option.type, option.rarity, 0)}
                                >
                                    <LeaderboardText size={11} value={option.label} x={4} y={1} />
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="octane-badge-leaderboard__info">
                        <img alt="" className="octane-badge-leaderboard__info-bg" draggable={false} src={leaderboardHeader} />
                        <HeaderEmblem src={assets.extended} yOffset={assets.extendedYOffset} />
                        <InfoText value={lines(infoText)} />
                    </div>
                    <div className="octane-badge-leaderboard__list">
                        {pageEntries.map((entry, index) => (
                            <div
                                key={`${target.type}-${target.rarity}-${target.page}-${entry.userId}-${index}`}
                                className="octane-badge-leaderboard__slot"
                                style={{ top: index * 43 }}
                            >
                                <EntryRow
                                    emblem={assets.emblem}
                                    entry={entry}
                                    isEven={(target.page * PAGE_SIZE + index) % 2 === 0}
                                    isOwn={false}
                                    onProfile={openProfile}
                                />
                            </div>
                        ))}
                        {loadError && !board && <div className="octane-badge-leaderboard__state">{loadError}</div>}
                    </div>
                    {ownEntry && (
                        <div className="octane-badge-leaderboard__own">
                            <EntryRow isEven isOwn emblem={assets.emblem} entry={ownEntry} onProfile={openProfile} />
                        </div>
                    )}
                    <button
                        className="octane-badge-leaderboard__button is-previous"
                        disabled={!canGoPrevious}
                        type="button"
                        onClick={() => show(target.type, target.rarity, target.page - 1)}
                    >
                        <NativeText
                            background={0xffffff}
                            className="octane-badge-leaderboard__button-label"
                            overrides={!canGoPrevious ? { color: 0x777777 } : undefined}
                            text={text('badge_leaderboard.previous')}
                            textStyle="u_regular"
                        />
                    </button>
                    <button
                        className="octane-badge-leaderboard__button is-next"
                        disabled={!canGoNext}
                        type="button"
                        onClick={() => show(target.type, target.rarity, target.page + 1)}
                    >
                        <NativeText
                            background={0xffffff}
                            className="octane-badge-leaderboard__button-label"
                            overrides={!canGoNext ? { color: 0x777777 } : undefined}
                            text={text('badge_leaderboard.next')}
                            textStyle="u_regular"
                        />
                    </button>
                </div>
            </DraggableWindow>
        </div>
    );
};
