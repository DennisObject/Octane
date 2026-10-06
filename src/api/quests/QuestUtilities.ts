import type { DailyTaskData, QuestMessageData, RewardTrackData, RewardTrackPrizeData } from '@octane/renderer';
import { GetConfigurationValue } from '../octane';
import { LocalizeText, localizeWithFallback } from '../utils';

/** The official quest engine texts and image rules (HabboQuestEngine / QuestsList / QuestCompleted). */

export const QUEST_TIMER_IMAGE = 'quest_timer_questionmark';

/** The prompt-animated quests of the official client (their image carries an `_a` suffix). */
export const QUESTS_WITH_PROMPTS = ['MOVEITEM', 'ENTEROTHERSROOM', 'CHANGEFIGURE', 'FINDLIFEGUARDTOWER', 'SCRATCHAPET'];

/** `${image.library.questing.url}` with the generic image library as fallback. */
export const getQuestingImageBaseUrl = (): string => {
    const configured = GetConfigurationValue<string>('image.library.questing.url', '');

    if (configured && configured.length) return configured;

    return `${GetConfigurationValue<string>('image.library.url', '')}Quests/`;
};

export const getQuestingImageUrl = (name: string): string => `${getQuestingImageBaseUrl()}${name}.png`;

/** `<campaign>_<code><imageVersion>[_a]`, lower-cased, or the hourglass while the quest waits. */
export const getQuestImageName = (campaignCode: string, localizationCode: string, imageVersion: string, waiting: boolean = false): string => {
    if (waiting) return QUEST_TIMER_IMAGE;

    const prompt = QUESTS_WITH_PROMPTS.includes((localizationCode || '').toUpperCase()) ? '_a' : '';

    return `${campaignCode}_${localizationCode}${imageVersion || ''}${prompt}`.toLowerCase();
};

/** The quests list shows the plain `<campaign>_<code><imageVersion>` bitmap; only the tracker animates the prompt frames. */
export const getQuestListImageUrl = (quest: QuestMessageData): string =>
    getQuestingImageUrl(
        quest.waitPeriodSeconds > 0 ? QUEST_TIMER_IMAGE : `${quest.campaignCode}_${quest.localizationCode}${quest.imageVersion || ''}`.toLowerCase()
    );

/** The tracker's prompt animation cycles `<campaign>_<code><imageVersion>_a` to `_d`. */
export const getQuestPromptFrameUrl = (quest: QuestMessageData, frame: 'a' | 'b' | 'c' | 'd'): string =>
    getQuestingImageUrl(`${quest.campaignCode}_${quest.localizationCode}${quest.imageVersion || ''}_${frame}`.toLowerCase());

export const getQuestImageUrl = (quest: QuestMessageData): string =>
    getQuestingImageUrl(getQuestImageName(quest.campaignCode, quest.localizationCode, quest.imageVersion, quest.waitPeriodSeconds > 0));

export const getCampaignImageUrl = (campaignCode: string): string => getQuestingImageUrl(campaignCode);

export const getCampaignLocalizationKey = (campaignCode: string): string => `quests.${campaignCode}`;

export const getCampaignName = (campaignCode: string): string => localizeWithFallback(`${getCampaignLocalizationKey(campaignCode)}.name`, campaignCode);

export const getQuestLocalizationKey = (quest: QuestMessageData): string => `${getCampaignLocalizationKey(quest.campaignCode)}.${quest.localizationCode}`;

export const getQuestName = (quest: QuestMessageData): string => localizeWithFallback(`${getQuestLocalizationKey(quest)}.name`, quest.localizationCode);

export const getQuestDescription = (quest: QuestMessageData): string => localizeWithFallback(`${getQuestLocalizationKey(quest)}.desc`, '');

export const getQuestHint = (quest: QuestMessageData): string => localizeWithFallback(`${getQuestLocalizationKey(quest)}.hint`, '');

export const getQuestCompletedText = (quest: QuestMessageData): string =>
    localizeWithFallback(`${getQuestLocalizationKey(quest)}.completed`, getQuestDescription(quest));

/** The tracker bar: ceil(100 * completed / total), clamped. */
export const getQuestProgressPercent = (completedSteps: number, totalSteps: number): number => {
    if (!totalSteps || totalSteps <= 0) return 0;

    return Math.max(0, Math.min(100, Math.ceil((100 * completedSteps) / totalSteps)));
};

export type CampaignCounterStyle = 'red' | 'blue' | 'green';

/** quest_counterbkg_disabled / _active / _completed of the official campaign block. */
export const getCampaignCounterStyle = (completedQuests: number, completedCampaign: boolean): CampaignCounterStyle => {
    if (completedCampaign) return 'green';

    return completedQuests > 0 ? 'blue' : 'red';
};

/** The official list hides the reward when the type is unknown or the amount is empty. */
export const isQuestRewardVisible = (activityPointType: number, amount: number): boolean => activityPointType >= -1 && amount > 0;

/** activityPointType -1 is credits, every other value is a points type (0 duckets, 5 diamonds). */
export const getActivityPointName = (activityPointType: number): string => {
    if (activityPointType === -1) return localizeWithFallback('quests.currency.credits', 'Credits');

    if (activityPointType === 0) return localizeWithFallback('quests.currency.duckets', 'Duckets');

    if (activityPointType === 5) return localizeWithFallback('quests.currency.diamonds', 'Diamonds');

    return localizeWithFallback(`activitypoint.name.${activityPointType}`, 'Points');
};

/** The currency icon type of `LayoutCurrencyIcon`: credits use -1 in the client sprite set. */
export const getActivityPointIconType = (activityPointType: number): number => activityPointType;

// ---------------------------------------------------------------- daily tasks

export type DailyTaskStyle = 'orange' | 'green' | 'yellow';

/** Orange while in progress, green once claimable or claimed; bonus rows stay yellow. */
export const getDailyTaskStyle = (status: number, isBonus: boolean): DailyTaskStyle => {
    if (isBonus) return 'yellow';

    return status === 0 ? 'orange' : 'green';
};

export const getDailyTaskProgressPercent = (repeats: number, requiredRepeats: number): number => {
    if (!requiredRepeats || requiredRepeats <= 0) return 100;

    return Math.max(0, Math.min(100, Math.floor((repeats / requiredRepeats) * 100)));
};

export const getDailyTaskImageUrl = (task: DailyTaskData): string => {
    const configured = GetConfigurationValue<string>('image.library.dailytasks.url', '');
    const base = configured && configured.length ? configured : `${GetConfigurationValue<string>('image.library.url', '')}dailytasks/`;

    return `${base}${task.taskCode}${task.imageVersion || ''}.png`;
};

/** Bonus tasks go last, the official controller order. */
export const sortDailyTasks = (tasks: DailyTaskData[]): DailyTaskData[] => [...tasks.filter((task) => !task.isBonus), ...tasks.filter((task) => task.isBonus)];

export const getDailyTasksWindowCaption = (maxSecondsLeft: number): string => {
    const title = localizeWithFallback('dailytasks.title', 'Daily rewards');

    if (maxSecondsLeft <= 0) return title;

    const refresh = localizeWithFallback('dailytasks.refreshes', 'Refresh in %time%', ['time'], [formatFriendlySeconds(maxSecondsLeft)]);

    return `${title} - ${refresh}`;
};

/** "2h 5m" style countdowns; the official client uses FriendlyTime, this keeps it self-contained. */
export const formatFriendlySeconds = (seconds: number): string => {
    const total = Math.max(0, Math.floor(seconds));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (days > 0) return `${days}d ${hours}h`;

    if (hours > 0) return `${hours}h ${minutes}m`;

    if (minutes > 0) return `${minutes}m ${secs}s`;

    return `${secs}s`;
};

// ---------------------------------------------------------------- reward track

export type RewardTrackPrizeState = 'claimed' | 'premium_locked' | 'not_enough_points' | 'claimable';

/** The four tooltip states of RewardTrackPrizeView.refreshState(). */
export const getRewardTrackPrizeState = (prize: RewardTrackPrizeData, track: RewardTrackData): RewardTrackPrizeState => {
    if (prize.claimed) return 'claimed';

    if (prize.isPremiumLocked(track)) return 'premium_locked';

    if (!prize.hasEnoughPoints(track)) return 'not_enough_points';

    return 'claimable';
};

export const getRewardTrackPrizeTooltip = (state: RewardTrackPrizeState): string => {
    switch (state) {
        case 'claimed':
            return localizeWithFallback('reward_track.rewards.reward_tooltip.claimed', 'You already claimed this reward');
        case 'premium_locked':
            return localizeWithFallback('reward_track.rewards.reward_tooltip.premium', 'Upgrade to premium to claim this reward');
        case 'not_enough_points':
            return localizeWithFallback('reward_track.rewards.reward_tooltip.not_enough_points', 'You do not have enough points to claim this reward');
        default:
            return localizeWithFallback('reward_track.rewards.reward_tooltip.claim', 'Click to claim this reward');
    }
};

export interface RewardTrackTheme {
    dark: string;
    medium: string;
    light: string;
    active: string;
}

/** RewardTrackTheme.resolve(): the five uint themes, blue is the fallback. */
export const REWARD_TRACK_THEMES: Record<string, RewardTrackTheme> = {
    blue: { dark: '#3576B9', medium: '#CFE2F9', light: '#DDEBF9', active: '#BDD6EF' },
    orange: { dark: '#C97918', medium: '#FFDFB2', light: '#FFEFD6', active: '#FFCF91' },
    forest_green: { dark: '#3F8A45', medium: '#CDEACB', light: '#E1F3DF', active: '#B8DFB6' },
    red: { dark: '#B84B4B', medium: '#F1CCCC', light: '#F8DDDD', active: '#E7B8B8' },
    cyan: { dark: '#1F9EB3', medium: '#C7EFF5', light: '#DCF7FB', active: '#B5E9F1' }
};

export const resolveRewardTrackTheme = (theme: string): RewardTrackTheme => REWARD_TRACK_THEMES[theme] ?? REWARD_TRACK_THEMES.blue;

/**
 * Hint buttons exist only when `reward_track.{track}.task.{id}.hint.internal_link`
 * is set. The introduction track's nine links are keyed on the task id.
 */
const REWARD_TRACK_TASK_HINTS: Record<string, { fallbackText: string; link: string }> = {
    buy_catalog_furni: { fallbackText: 'Open Catalog', link: 'catalog/open' },
    change_outfit: { fallbackText: 'Open Clothes Editor', link: 'avatareditor/open' },
    chat_with_users: { fallbackText: 'Find Rooms', link: 'navigator/tab/popular' },
    create_room: { fallbackText: 'Open Navigator', link: 'navigator/tab/me' },
    make_friends: { fallbackText: 'Find Friends', link: 'friendbar/findfriends' },
    place_furniture: { fallbackText: 'Open Inventory', link: 'inventory/open/furni' },
    publish_picture: { fallbackText: 'Open Camera', link: 'camera/open' },
    visit_rooms: { fallbackText: 'Open Navigator', link: 'navigator/tab/popular' },
    wear_badge: { fallbackText: 'Open Inventory', link: 'inventory/open/badges' }
};

export const getRewardTrackTaskHintLink = (taskId: string): { fallbackText: string; link: string } | null =>
    REWARD_TRACK_TASK_HINTS[(taskId || '').toLowerCase()] ?? null;

export const getRewardTrackText = (trackId: string, suffix: string, fallback: string): string =>
    localizeWithFallback(`reward_track.${trackId}.${suffix}`, fallback);

export const getRewardTrackTaskText = (trackId: string, taskId: string, suffix: string, fallback: string): string =>
    localizeWithFallback(`reward_track.${trackId}.task.${taskId}.${suffix}`, fallback);

export type RewardTrackTaskFilter = 'all' | 'in_progress' | 'completed';

export const filterRewardTrackTasks = <T extends { hasProgress: boolean; isComplete: boolean }>(tasks: T[], filter: RewardTrackTaskFilter): T[] => {
    switch (filter) {
        case 'in_progress':
            return tasks.filter((task) => task.hasProgress && !task.isComplete);
        case 'completed':
            return tasks.filter((task) => task.isComplete);
        default:
            return tasks;
    }
};

/** Splits a single tier into pages of `perPage` prizes, ordered by required points. */
export const paginatePrizes = <T extends { requiredPoints: number }>(prizes: T[], perPage: number): T[][] => {
    const ordered = [...prizes].sort((a, b) => a.requiredPoints - b.requiredPoints);
    const pages: T[][] = [];

    for (let i = 0; i < ordered.length; i += Math.max(1, perPage)) pages.push(ordered.slice(i, i + Math.max(1, perPage)));

    return pages.length ? pages : [[]];
};

/** The premium confirmation shows the boost as a percentage: round((boost - 1) * 100). */
/**
 * One page per span of points milestones, so the free and the premium row stay
 * column-aligned: the Nth column of both rows is the same milestone, and a
 * milestone that only one tier rewards leaves the other row's column empty
 * instead of shifting every prize after it.
 */
export const paginatePrizeTiers = <T extends { premium: boolean; requiredPoints: number }>(
    prizes: T[],
    milestonesPerPage: number
): { free: T[][]; milestones: number[][]; premium: T[][] } => {
    const perPage = Math.max(1, milestonesPerPage);
    const milestones = [...new Set(prizes.map((prize) => prize.requiredPoints))].sort((a, b) => a - b);
    const free: T[][] = [];
    const premium: T[][] = [];
    const pageMilestones: number[][] = [];

    for (let index = 0; index < milestones.length; index += perPage) {
        const page = milestones.slice(index, index + perPage);
        const span = new Set(page);

        pageMilestones.push(page);
        const ofPage = (tier: boolean) =>
            prizes.filter((prize) => prize.premium === tier && span.has(prize.requiredPoints)).sort((a, b) => a.requiredPoints - b.requiredPoints);

        free.push(ofPage(false));
        premium.push(ofPage(true));
    }

    return free.length ? { free, milestones: pageMilestones, premium } : { free: [[]], milestones: [[]], premium: [[]] };
};

const PAGE_BOUNDARY_EPSILON = 0.0001;

const minimumGapForTier = (prizes: { premium: boolean; requiredPoints: number }[], premium: boolean): number => {
    let previous = -1;
    let gap = 0;

    for (const prize of prizes) {
        if (prize.premium !== premium) continue;

        if (previous !== -1) {
            const delta = prize.requiredPoints - previous;

            if (delta > 0 && (gap === 0 || delta < gap)) gap = delta;
        }

        previous = prize.requiredPoints;
    }

    return gap;
};

export interface RewardTrackPrizeLayout {
    pageCount: number;
    xForPoints: (points: number, page: number) => number;
    pageForPoints: (points: number) => number;
}

/**
 * RewardTrackPrizeLayout.rebuild. Pages follow the point gap, prize width 80
 * and spacing 15 across the 598px prize content. The page span is fixed from
 * the first distance, then the distance grows until that span still fits.
 */
export const layoutRewardTrackPrizes = (
    prizes: { premium: boolean; requiredPoints: number }[],
    visibleWidth = 598,
    prizeWidth = 80,
    spacing = 15
): RewardTrackPrizeLayout => {
    const edge = prizeWidth / 2 + spacing;
    let minRequired = -1;
    let maxRequired = 0;

    for (const prize of prizes) {
        if (minRequired === -1 || prize.requiredPoints < minRequired) minRequired = prize.requiredPoints;

        if (prize.requiredPoints > maxRequired) maxRequired = prize.requiredPoints;
    }

    minRequired = Math.max(0, minRequired);

    const freeGap = minimumGapForTier(prizes, false);
    const premiumGap = minimumGapForTier(prizes, true);
    let gap = freeGap;

    if (freeGap <= 0) gap = premiumGap;
    else if (premiumGap > 0) gap = Math.min(freeGap, premiumGap);

    if (gap <= 0) gap = Math.max(1, maxRequired);

    let distance = (prizeWidth + spacing) / gap;

    if (distance <= 0) distance = 1;

    const zeroOffsetFor = (value: number) => Math.max(0, edge - minRequired * value);
    const usableWidthFor = (value: number) => Math.max(1, visibleWidth - edge - zeroOffsetFor(value));
    const pagePointSpan = Math.max(1, Math.max(1, Math.floor(usableWidthFor(distance) / distance / gap)) * gap);
    const fits = (value: number) => pagePointSpan * value <= usableWidthFor(value) + PAGE_BOUNDARY_EPSILON;
    let low = distance;
    let high = distance;

    for (let step = 0; step < 32; step++) {
        high *= 2;

        if (!fits(high)) break;

        low = high;
    }

    for (let step = 0; step < 24; step++) {
        const mid = (low + high) / 2;

        if (fits(mid)) low = mid;
        else high = mid;
    }

    distance = low;

    const zeroOffset = zeroOffsetFor(distance);
    const pageForSpan = (points: number) => (points <= 0 ? 0 : Math.max(0, Math.ceil((points - PAGE_BOUNDARY_EPSILON) / pagePointSpan) - 1));
    let maxPage = 0;

    for (const prize of prizes) maxPage = Math.max(maxPage, pageForSpan(prize.requiredPoints));

    const pageCount = Math.max(1, maxPage + 1);

    return {
        pageCount,
        xForPoints: (points, page) => zeroOffset + (points - Math.max(0, page * pagePointSpan)) * distance,
        pageForPoints: (points) => Math.max(0, Math.min(pageCount - 1, pageForSpan(points)))
    };
};

export const getPremiumBoostPercent = (taskPointsBoost: number): number => Math.round((taskPointsBoost - 1) * 100);

/** The official client localizes non-zero result codes as `<prefix><code>`. */
export const getRewardTrackResultText = (prefix: string, resultCode: number, fallback: string): string => {
    if (resultCode === 0) return localizeWithFallback(`${prefix}success`, fallback);

    return localizeWithFallback(`${prefix}fail.${resultCode}`, LocalizeText(`${prefix}fail.${resultCode}`) || fallback);
};
