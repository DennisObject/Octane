import { BadgeLeaderboardBoard, BadgeLeaderboardResponse, BadgeRarityKey } from '../../api';
import {
    badgeEmblemAchievement,
    badgeEmblemAchievementExtended,
    badgeEmblemCommon,
    badgeEmblemCommonExtended,
    badgeEmblemDefault,
    badgeEmblemEpic,
    badgeEmblemEpicExtended,
    badgeEmblemLegendary,
    badgeEmblemLegendaryExtended,
    badgeEmblemMythical,
    badgeEmblemMythicalExtended,
    badgeEmblemRare,
    badgeEmblemRareExtended,
    badgeEmblemUnique,
    badgeEmblemUniqueExtended,
    frameLeaderboardAchievement,
    frameLeaderboardRarityCommon,
    frameLeaderboardRarityEpic,
    frameLeaderboardRarityLegendary,
    frameLeaderboardRarityMythical,
    frameLeaderboardRarityRare,
    frameLeaderboardRarityUnique,
    frameLeaderboardTotal
} from '../../assets/images/leaderboard_badge';

export const PAGE_SIZE = 10;

/** BadgeLeaderboardController types: 0 total badges, 1 one rarity, 2 achievement level. */
export type LeaderboardType = 0 | 1 | 2;

/** class_3472 rarity numbers the leaderboard knows: 1 uncommon, 2 rare, 3 epic (very rare), 4 mythical, 5 legendary, 6 unique. */
export type LeaderboardRarity = 1 | 2 | 3 | 4 | 5 | 6;

export interface LeaderboardTarget {
    type: LeaderboardType;
    /** -1 unless the type is 1. */
    rarity: number;
    page: number;
}

interface RarityDescriptor {
    key: BadgeRarityKey;
    textKey: string;
    infoKey: string;
    frame: string;
    emblem: string;
    extended: string;
    /** getHeaderAssetYOffset() asks for -9 (total, uncommon) and -7 (achievement level); the v75 runtime shows both as one pixel higher than centred, the rest centred. */
    extendedYOffset: number;
}

// getFrameStyle(): 10007 uncommon, 10002 rare, 10003 very rare, 10004 mythical, 10005 legendary, 10006 unique; each style is the habbo_skin_frame_leaderboard_rarity_<n> skin
// of that name, so the mythical frame is rarity_3 (frameLeaderboardRarityLegendary) and the legendary frame is rarity_4 (frameLeaderboardRarityMythical).
const RARITIES: Record<LeaderboardRarity, RarityDescriptor> = {
    1: {
        key: 'uncommon',
        textKey: 'badge.rarity.uncommon',
        infoKey: 'badge_leaderboard.info.rarity.uncommon',
        frame: frameLeaderboardRarityCommon,
        emblem: badgeEmblemCommon,
        extended: badgeEmblemCommonExtended,
        extendedYOffset: -1
    },
    2: {
        key: 'rare',
        textKey: 'badge.rarity.rare',
        infoKey: 'badge_leaderboard.info.rarity.rare',
        frame: frameLeaderboardRarityRare,
        emblem: badgeEmblemRare,
        extended: badgeEmblemRareExtended,
        extendedYOffset: 0
    },
    3: {
        key: 'epic',
        textKey: 'badge.rarity.epic',
        infoKey: 'badge_leaderboard.info.rarity.epic',
        frame: frameLeaderboardRarityEpic,
        emblem: badgeEmblemEpic,
        extended: badgeEmblemEpicExtended,
        extendedYOffset: 0
    },
    4: {
        key: 'mythical',
        textKey: 'badge.rarity.mythical',
        infoKey: 'badge_leaderboard.info.rarity.mythical',
        frame: frameLeaderboardRarityLegendary,
        emblem: badgeEmblemMythical,
        extended: badgeEmblemMythicalExtended,
        extendedYOffset: 0
    },
    5: {
        key: 'legendary',
        textKey: 'badge.rarity.legendary',
        infoKey: 'badge_leaderboard.info.rarity.legendary',
        frame: frameLeaderboardRarityMythical,
        emblem: badgeEmblemLegendary,
        extended: badgeEmblemLegendaryExtended,
        extendedYOffset: 0
    },
    6: {
        key: 'unique',
        textKey: 'badge.rarity.unique',
        infoKey: 'badge_leaderboard.info.rarity.unique',
        frame: frameLeaderboardRarityUnique,
        emblem: badgeEmblemUnique,
        extended: badgeEmblemUniqueExtended,
        extendedYOffset: 0
    }
};

// English texts of the official external texts; used only when the hotel's texts do not carry the key.
export const LEADERBOARD_TEXT_FALLBACKS: Record<string, string> = {
    'badge_leaderboard.title.total_badges': 'Top Badges',
    'badge_leaderboard.title.achievement_level': 'Achievement Level',
    'badge_leaderboard.title.rarity': 'Top %rarity%',
    'badge_leaderboard.option.total_badges': 'Total badges',
    'badge_leaderboard.option.achievement_level': 'Achievement level',
    'badge_leaderboard.option.rarity': '%rarity% badges',
    'badge_leaderboard.info.total_badges': 'Overview of players with the most badges.\\nThese users are on a grind!',
    'badge_leaderboard.info.achievement_level':
        'Players with the highest achievement level.\\nThe achievement level is the sum of all the user\'s achievement badge levels combined.',
    'badge_leaderboard.info.rarity.uncommon': 'Players with the most uncommon badges.\\nUncommon badges are awarded to 200 or less users.',
    'badge_leaderboard.info.rarity.rare': 'Players with the most rare badges.\\nRare badges are awarded to 50 or less users.',
    'badge_leaderboard.info.rarity.epic': 'Players with the most epic badges.\\nEpic badges are awarded to 10 or less users.',
    'badge_leaderboard.info.rarity.mythical':
        'Players with the most mythical badges.\\nMythical badges are exceptionally scarce and held by only a handful of users.',
    'badge_leaderboard.info.rarity.legendary': 'Players with the most legendary badges.\\nLegendary badges are extremely scarce and held by only 2 or 3 users.',
    'badge_leaderboard.info.rarity.unique':
        'Players with the most unique badges.\\nUnique badges can be obtained from exceptional events where only a single user is awarded the badge.',
    'badge_leaderboard.previous': 'Previous',
    'badge_leaderboard.next': 'Next',
    'badge.rarity.uncommon': 'Uncommon',
    'badge.rarity.rare': 'Rare',
    'badge.rarity.epic': 'Epic',
    'badge.rarity.mythical': 'Mythical',
    'badge.rarity.legendary': 'Legendary',
    'badge.rarity.unique': 'Unique'
};

const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

/** getSupportedRarities(): rare..unique always, plus the uncommon tier when the hotel enables it (or the backend reports players in it). */
export const getSupportedRarities = (hasUncommon: boolean): LeaderboardRarity[] => (hasUncommon ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6]);

/** normalizeType() / normalizeRarity(): an unknown type or an unsupported rarity falls back to the total board. */
export const normalizeTarget = (type: unknown, rarity: unknown, page: unknown, supported: LeaderboardRarity[]): LeaderboardTarget =>
{
    const safePage = isInteger(page) && page > 0 ? page : 0;

    if (type === 2) return { type: 2, rarity: -1, page: safePage };
    if (type === 1 && isInteger(rarity) && (supported as number[]).includes(rarity)) return { type: 1, rarity, page: safePage };

    return { type: 0, rarity: -1, page: safePage };
};

/** linkReceived(): badge_leaderboard/<type>/<rarity>/<page>, every part optional and numeric. */
export const parseLeaderboardLink = (url: string): { type: number; rarity: number; page: number } | null =>
{
    const parts = url.split('/');

    if (parts[0] !== 'badge_leaderboard') return null;

    const read = (index: number, fallback: number) =>
    {
        const value = Number(parts[index]);

        return parts[index] === undefined || parts[index] === '' || Number.isNaN(value) ? fallback : Math.trunc(value);
    };

    return { type: read(1, 0), rarity: read(2, -1), page: Math.max(0, read(3, 0)) };
};

export interface LeaderboardPageInfo {
    frame: string;
    emblem: string;
    extended: string;
    extendedYOffset: number;
    titleText: string;
    infoText: string;
    optionText: string;
    board: BadgeLeaderboardBoard | null;
}

export const getRarityDescriptor = (rarity: number): RarityDescriptor | null => RARITIES[rarity as LeaderboardRarity] ?? null;

export const getBoard = (response: BadgeLeaderboardResponse | null, target: LeaderboardTarget): BadgeLeaderboardBoard | null =>
{
    if (!response?.leaderboards) return null;
    if (target.type === 2) return response.leaderboards.achievementLevel ?? null;
    if (target.type === 1) return response.leaderboards.rarity?.[getRarityDescriptor(target.rarity)?.key] ?? null;

    return response.leaderboards.totalBadges ?? null;
};

export const getAssetsFor = (target: LeaderboardTarget) =>
{
    if (target.type === 2)
        return { frame: frameLeaderboardAchievement, emblem: badgeEmblemAchievement, extended: badgeEmblemAchievementExtended, extendedYOffset: -1 };
    if (target.type === 1)
    {
        const descriptor = getRarityDescriptor(target.rarity);

        return { frame: descriptor.frame, emblem: descriptor.emblem, extended: descriptor.extended, extendedYOffset: descriptor.extendedYOffset };
    }

    // The total board: badge_rarity_badges_emblem for the rows, the same bitmap (no _extended variant) for the header.
    return { frame: frameLeaderboardTotal, emblem: badgeEmblemDefault, extended: badgeEmblemDefault, extendedYOffset: -1 };
};
