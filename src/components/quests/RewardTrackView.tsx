import {
    AddLinkEventTracker,
    CreateLinkEvent,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RewardTrackData,
    RewardTrackPrizeData,
    RewardTrackTaskData
} from '@octane/renderer';
import { CSSProperties, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FaCog } from 'react-icons/fa';
import {
    filterRewardTrackTasks,
    getPremiumBoostPercent,
    getRewardTrackPrizeState,
    getRewardTrackPrizeTooltip,
    getRewardTrackTaskHintLink,
    getRewardTrackTaskText,
    getRewardTrackText,
    layoutRewardTrackPrizes,
    localizeWithFallback,
    NotificationAlertType,
    REWARD_TRACK_THEMES,
    RewardTrackTaskFilter,
    resolveRewardTrackTheme
} from '../../api';
import { Permission } from '../../api/permissions';
import availableIcon from '../../assets/images/reward-track/air/available-icon.png';
import checkIcon from '../../assets/images/reward-track/air/checkmark.png';
import creditBigIcon from '../../assets/images/reward-track/air/credit-big.png';
import diamondBigIcon from '../../assets/images/reward-track/air/diamond-big.png';
import frankAndPiccolo from '../../assets/images/reward-track/air/frank-and-piccolo.png';
import frankTips from '../../assets/images/reward-track/air/frank-tips.png';
import freeTrackIcon from '../../assets/images/reward-track/air/free-track.png';
import iconsBack from '../../assets/images/reward-track/air/icons-back.png';
import iconsForward from '../../assets/images/reward-track/air/icons-forward.png';
import lockedReward from '../../assets/images/reward-track/air/locked-reward.png';
import notAvailableIcon from '../../assets/images/reward-track/air/not-available-icon.png';
import pointLarge from '../../assets/images/reward-track/air/point-large.png';
import pointSmall from '../../assets/images/reward-track/air/point-small.png';
import premiumTrackIcon from '../../assets/images/reward-track/air/premium-track.png';
import prizesBackground from '../../assets/images/reward-track/air/prizes-background.png';
import prizesStars from '../../assets/images/reward-track/air/prizes-background-stars.png';
import rewardGift from '../../assets/images/reward-track/air/reward-gift.png';
import rewardGiftPremium from '../../assets/images/reward-track/air/reward-gift-premium.png';
import taskListIcon from '../../assets/images/reward-track/air/task-list.png';
import { DraggableWindowPosition, LayoutAvatarImageView, LayoutBadgeImageView, LayoutCurrencyIcon, LayoutFurniIconImageView } from '../../common';
import { nativeTextStyles } from '../../common/native-text/NativeTextStyles';
import { useHasPermission, useNotification, useRewardTracks } from '../../hooks';
import { OctaneCard } from '../../layout';
import { useAirFieldWidth } from '../achievements/AchievementText';
import { RewardTrackAdminView } from './RewardTrackAdminView';

const CURRENCY_TYPES: Record<string, number> = { credits: -1, duckets: 0, diamonds: 5 };
const FILTERS: RewardTrackTaskFilter[] = ['all', 'in_progress', 'completed'];
const MAIN_BAR_WIDTH = 602;
const TASK_BAR_WIDTH = 200;
const LEVEL_BAR_WIDTH = 260;
const taskIconModules = import.meta.glob('../../assets/images/reward-track/air/task-*.png', { eager: true, import: 'default' }) as Record<string, string>;

/** Native pixel size of reward_track_tasks_<action>. The row shows this size; the detail doubles it. */
const TASK_ICON_SIZE: Record<string, { w: number; h: number }> = {
    buy_from_catalogue: { w: 44, h: 52 },
    change_figure: { w: 53, h: 51 },
    change_motto: { w: 53, h: 47 },
    chat_with_someone: { w: 48, h: 48 },
    create_room: { w: 53, h: 40 },
    dance: { w: 49, h: 46 },
    enter_other_users_room: { w: 37, h: 25 },
    find_hand_item: { w: 46, h: 50 },
    follow_friend: { w: 44, h: 45 },
    friend_furni_locked: { w: 48, h: 48 },
    give_respect: { w: 34, h: 37 },
    move_item: { w: 43, h: 45 },
    pet_eat: { w: 42, h: 49 },
    pet_level: { w: 46, h: 45 },
    pet_respect: { w: 46, h: 45 },
    place_item: { w: 24, h: 50 },
    publish_picture: { w: 52, h: 50 },
    replenish_respect: { w: 42, h: 45 },
    request_friend: { w: 49, h: 48 },
    rotate_item: { w: 43, h: 46 },
    send_messenger_invite: { w: 52, h: 33 },
    send_messenger_message: { w: 39, h: 50 },
    set_relationship_status: { w: 40, h: 50 },
    switch_item_state: { w: 43, h: 45 },
    swim: { w: 52, h: 42 },
    teleport: { w: 52, h: 51 },
    use_habbicon: { w: 26, h: 50 },
    wave: { w: 51, h: 49 },
    wear_badge: { w: 40, h: 49 }
};

const taskIcon = (actionType: string): { src: string; w: number; h: number } | null => {
    const key = (actionType || '').toLowerCase();
    const size = TASK_ICON_SIZE[key];
    const src = taskIconModules[`../../assets/images/reward-track/air/task-${key.replace(/_/g, '-')}.png`];

    return size && src ? { src, ...size } : null;
};

const rewardText = (key: string, fallback: string, tokens?: Record<string, string | number>): string => {
    const resolved = tokens ? localizeWithFallback(key, fallback, Object.keys(tokens), Object.values(tokens).map(String)) : localizeWithFallback(key, fallback);

    if (!tokens) return resolved;

    return Object.entries(tokens).reduce((current, [name, value]) => current.split(`%${name}%`).join(String(value)), resolved);
};

const trackFallback = (trackId: string, suffix: 'name' | 'desc' | 'info'): string => {
    if (trackId !== 'introduction') return suffix === 'name' ? trackId : '';

    if (suffix === 'name') return 'Introduction Track';

    if (suffix === 'desc') return 'Learn all about Habbo!';

    return 'Complete tasks to earn points and unlock rewards';
};

const RewardIcon: FC<{ rewardTypeId: string; extraParams: string; productItemTypeId: number }> = ({ rewardTypeId, extraParams, productItemTypeId }) => {
    const type = (rewardTypeId || '').toLowerCase();

    if (type in CURRENCY_TYPES) return <LayoutCurrencyIcon type={CURRENCY_TYPES[type]} className="octane-reward-track-prize-currency" />;

    if (type === 'badge') return <LayoutBadgeImageView badgeCode={extraParams} />;

    if (type === 'furni')
        return (
            <LayoutFurniIconImageView
                productType={extraParams.startsWith('i:') ? 'i' : 's'}
                productClassId={productItemTypeId}
                className="octane-reward-track-prize-furni"
            />
        );

    return <div className="octane-reward-track-prize-generic">{rewardTypeId}</div>;
};

/** RewardTrackTaskProgressBarView: the fill is round(width * ratio) wide and turns green once complete. */
const TaskProgressBar: FC<{ ratio: number; width: number }> = ({ ratio, width }) => {
    const fill = Math.round(width * Math.max(0, Math.min(1, ratio)));

    return (
        <span className="octane-reward-track-mini-bar">
            {fill > 0 && (
                <span className="octane-reward-track-mini-bar-fill" data-complete={ratio >= 1} style={{ width: fill }}>
                    <span className="octane-reward-track-mini-bar-gloss" />
                </span>
            )}
        </span>
    );
};

/** task_image / task_info_img use pivot_point center: int((box - size) / 2) inside the 52x50 or 104x100 slot. */
const TaskGlyph: FC<{ actionType: string; boxWidth: number; boxHeight: number; zoom?: number }> = ({ actionType, boxWidth, boxHeight, zoom = 1 }) => {
    const icon = taskIcon(actionType);

    if (!icon) return null;

    const width = icon.w * zoom;
    const height = icon.h * zoom;

    return (
        <img
            src={icon.src}
            alt=""
            width={width}
            height={height}
            draggable={false}
            className={zoom > 1 ? 'is-scaled' : undefined}
            style={{ left: Math.trunc((boxWidth - width) / 2), top: Math.trunc((boxHeight - height) / 2) }}
        />
    );
};

const RewardTrackPrizeView: FC<{
    track: RewardTrackData;
    prize: RewardTrackPrizeData;
    left: number;
    onClaim: (prize: RewardTrackPrizeData) => void;
    onPremium: () => void;
}> = ({ track, prize, left, onClaim, onPremium }) => {
    const state = getRewardTrackPrizeState(prize, track);
    const dimmed = !prize.hasEnoughPoints(track);

    const onClick = () => {
        if (prize.claimed || dimmed) return;

        if (prize.isPremiumLocked(track)) {
            onPremium();

            return;
        }

        if (prize.isClaimable(track)) onClaim(prize);
    };

    return (
        <div
            className="octane-reward-track-prize"
            data-tier={prize.premium ? 'premium' : 'free'}
            data-state={state}
            data-dimmed={dimmed}
            style={{ left, opacity: dimmed ? 0.75 : 1 }}
            title={getRewardTrackPrizeTooltip(state)}
        >
            <button type="button" className="octane-reward-track-prize-hit" disabled={dimmed} onClick={onClick}>
                <span className="octane-reward-track-prize-shadow" />
                <span className="octane-reward-track-prize-plate">
                    <span className="octane-reward-track-prize-product" data-shifted={prize.rewardAmount > 1}>
                        <RewardIcon rewardTypeId={prize.rewardTypeId} extraParams={prize.extraParams} productItemTypeId={prize.productItemTypeId} />
                    </span>
                    {prize.rewardAmount > 1 && (
                        <span className="octane-reward-track-prize-amount">
                            <span>{prize.rewardAmount}</span>
                        </span>
                    )}
                </span>
            </button>
            <span className="octane-reward-track-prize-stem" />
            {state === 'premium_locked' && (
                <img src={lockedReward} alt="" width={18} height={22} draggable={false} className="octane-reward-track-prize-lock" />
            )}
            {state === 'claimed' && <img src={checkIcon} alt="" width={17} height={15} draggable={false} className="octane-reward-track-prize-check" />}
        </div>
    );
};

// task_hint_button (471,16,109 wide): the official shiny button is as wide as its label field plus 15 and keeps the right edge of its layout rect.
const HINT_BUTTON_RIGHT = 580;
const HINT_LABEL_SIZE = nativeTextStyles.button_shiny_regular.size;

const RewardTrackHintButton: FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => {
    const fieldWidth = useAirFieldWidth(label, HINT_LABEL_SIZE, false, 'button_shiny_regular');
    const width = fieldWidth === undefined ? 109 : fieldWidth + 15;

    return (
        <button type="button" className="octane-reward-track-btn" style={{ left: HINT_BUTTON_RIGHT - width, width }} onClick={onClick}>
            {label}
        </button>
    );
};

// the official list collapses every hidden benefit row (24px + 5px gap) and the window shrinks with it
const countHiddenPremiumBenefits = (track: RewardTrackData): number =>
    5 - [track.taskPointsBoost > 1, track.hasPremiumPrizes, track.instantPoints > 0, track.hasPremiumTasks, track.hasPremiumLevels].filter(Boolean).length;

const RewardTrackPremiumConfirmView: FC<{ track: RewardTrackData; pending: boolean; onConfirm: () => void; onCancel: () => void }> = ({
    track,
    pending,
    onConfirm,
    onCancel
}) => (
    <OctaneCard
        className={`octane-reward-track-premium resize-none${pending ? ' is-pending' : ''}`}
        uniqueKey="reward-track-premium"
        windowPosition={DraggableWindowPosition.CENTER}
        data-hidden-benefits={countHiddenPremiumBenefits(track)}
    >
        <OctaneCard.Header headerText={rewardText('reward_track.premium.confirm.title', 'Unlock Premium Track')} onCloseClick={() => !pending && onCancel()} />
        <OctaneCard.Content className="octane-reward-track-premium-content">
            <div className="octane-reward-track-premium-body">
                <div className="octane-reward-track-premium-panel">
                    <div className="octane-reward-track-premium-frame">
                        <img src={premiumTrackIcon} alt="" width={58} height={45} draggable={false} />
                    </div>
                    <div className="octane-reward-track-premium-panel-name">{rewardText('reward_track.rewards.premium', 'Premium')}</div>
                    <div className="octane-reward-track-premium-panel-info">{rewardText('reward_track.rewards.premium.info', 'Extra rewards')}</div>
                </div>
                <div className="octane-reward-track-premium-benefits">
                    <div className="octane-reward-track-premium-gap" />
                    <p className="octane-reward-track-premium-desc">
                        {rewardText('reward_track.premium.confirm.desc', 'Get PREMIUM rewards and faster progress on this track!')}
                    </p>
                    <div className="octane-reward-track-premium-gap" />
                    {track.taskPointsBoost > 1 && (
                        <div className="octane-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>
                                {rewardText('reward_track.premium.confirm.benefit.boost', '%percent%% faster progression', {
                                    percent: getPremiumBoostPercent(track.taskPointsBoost)
                                })}
                            </span>
                        </div>
                    )}
                    {track.hasPremiumPrizes && (
                        <div className="octane-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>{rewardText('reward_track.premium.confirm.benefit.rewards', 'More premium rewards!')}</span>
                        </div>
                    )}
                    {track.instantPoints > 0 && (
                        <div className="octane-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>
                                {rewardText('reward_track.premium.confirm.benefit.instant_points', 'Instantly gain %points% points', {
                                    points: track.instantPoints
                                })}
                            </span>
                        </div>
                    )}
                    {track.hasPremiumTasks && (
                        <div className="octane-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>{rewardText('reward_track.premium.confirm.benefit.tasks', 'Exclusive premium tasks')}</span>
                        </div>
                    )}
                    {track.hasPremiumLevels && (
                        <div className="octane-reward-track-premium-benefit">
                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                            <span>{rewardText('reward_track.premium.confirm.benefit.levels', 'Exclusive premium levels')}</span>
                        </div>
                    )}
                </div>
                <div className="octane-reward-track-premium-cost">
                    <span>{rewardText('catalog.purchase.confirmation.dialog.cost', 'Cost')}</span>
                    <span className="octane-reward-track-premium-price">
                        {track.costCredits > 0 && (
                            <>
                                <span>{track.costCredits}</span>
                                <img src={creditBigIcon} alt="" width={22} height={22} draggable={false} />
                            </>
                        )}
                        {track.costCredits > 0 && track.costDiamonds > 0 && <span>+</span>}
                        {track.costDiamonds > 0 && (
                            <>
                                <span>{track.costDiamonds}</span>
                                <span className="octane-reward-track-premium-diamond">
                                    <img src={diamondBigIcon} alt="" width={19} height={19} draggable={false} />
                                </span>
                            </>
                        )}
                    </span>
                </div>
            </div>
            <div className="octane-reward-track-premium-buttons">
                <button type="button" className="octane-reward-track-btn" disabled={pending} onClick={onCancel}>
                    {rewardText('reward_track.premium.confirm.cancel', 'Cancel')}
                </button>
                <button type="button" className="octane-reward-track-btn octane-reward-track-btn-premium" disabled={pending} onClick={onConfirm}>
                    {rewardText('reward_track.premium.confirm.buy', 'Unlock')}
                </button>
            </div>
        </OctaneCard.Content>
    </OctaneCard>
);

/**
 * Official reward track window (main_xml 1103x722). `reward_track/open/<id>` opens one track.
 * The frame caption stays "Reward Track"; the track name is the profile title.
 */
export const RewardTrackView: FC<{}> = () => {
    const [trackId, setTrackId] = useState<string>(null);
    const [filter, setFilter] = useState<RewardTrackTaskFilter>('all');
    const [selectedTaskId, setSelectedTaskId] = useState<string>(null);
    const [premiumConfirm, setPremiumConfirm] = useState(false);
    const [page, setPage] = useState(0);
    const [pageKey, setPageKey] = useState('');
    const isEditor = useHasPermission(Permission.RewardTrackManage);
    const [editMode, setEditMode] = useState(false);
    const { tracks = [], reloadCount = 0, pendingPurchase = null, requestTracks = null, claimPrize = null, purchasePremium = null } = useRewardTracks();
    const { simpleAlert = null } = useNotification();
    const track = useMemo(() => tracks.find((existing) => existing.id === trackId) ?? null, [tracks, trackId]);
    const layout = useMemo(() => layoutRewardTrackPrizes(track?.prizes ?? []), [track]);
    const nextPageKey = track ? `${track.id}:${layout.pageCount}` : '';

    if (nextPageKey !== pageKey) {
        setPageKey(nextPageKey);

        if (track) setPage(layout.pageForPoints(track.points));
    }

    const open = useCallback(
        (id: string) => {
            setTrackId(id);
            setEditMode(false);
            setFilter('all');
            setSelectedTaskId(null);
            requestTracks && requestTracks();
        },
        [requestTracks]
    );

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'open':
                        open(parts.length >= 3 ? parts[2] : (tracks[0]?.id ?? 'introduction'));
                        return;
                    case 'hide':
                        setTrackId(null);
                        return;
                    case 'toggle':
                        if (trackId) setTrackId(null);
                        else open(tracks[0]?.id ?? 'introduction');
                        return;
                }
            },
            eventUrlPrefix: 'reward_track/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [open, tracks, trackId]);

    useEffect(() => {
        if (trackId && !track && tracks.length && !tracks.some((existing) => existing.id === trackId)) setTrackId(tracks[0].id);
    }, [trackId, track, tracks]);

    useEffect(() => {
        if (reloadCount > 0 && trackId && simpleAlert) {
            simpleAlert(
                rewardText('reward_track.reload.desc', 'The reward track was updated and has been reloaded.'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                rewardText('reward_track.reload.title', 'Reward track updated')
            );
        }
        // the alert belongs to the reload, not to the open track
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadCount]);

    useEffect(() => {
        if (pendingPurchase === null) setPremiumConfirm(false);
    }, [pendingPurchase]);

    const theme = resolveRewardTrackTheme(track?.theme ?? 'blue');
    const themeKey = track && REWARD_TRACK_THEMES[track.theme] ? track.theme : 'blue';
    const safePage = Math.max(0, Math.min(layout.pageCount - 1, page));
    const themeStyle = {
        '--rt-dark': theme.dark,
        '--rt-medium': theme.medium,
        '--rt-light': theme.light,
        '--rt-active': theme.active,
        '--rt-prizes-bg': `url("${prizesBackground}")`
    } as CSSProperties;

    const pagePrizes = useMemo(() => {
        const free: RewardTrackPrizeData[][] = Array.from({ length: layout.pageCount }, () => []);
        const premium: RewardTrackPrizeData[][] = Array.from({ length: layout.pageCount }, () => []);
        const points: number[][] = Array.from({ length: layout.pageCount }, () => []);
        const seen = Array.from({ length: layout.pageCount }, () => new Set<number>());

        for (const prize of track?.prizes ?? []) {
            const index = layout.pageForPoints(prize.requiredPoints);

            (prize.premium ? premium : free)[index].push(prize);

            if (!seen[index].has(prize.requiredPoints)) {
                seen[index].add(prize.requiredPoints);
                points[index].push(prize.requiredPoints);
            }
        }

        return { free, premium, points };
    }, [layout, track]);

    const filteredTasks = useMemo(() => filterRewardTrackTasks(track?.tasks ?? [], filter), [track, filter]);
    const selectedTask: RewardTrackTaskData = filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;
    const hintLink = selectedTask ? getRewardTrackTaskHintLink(selectedTask.id) : null;

    if (!trackId) return null;

    // the official list re-selects its first task when the selected one drops out of the new filter, and keeps it afterwards
    const onFilter = (value: RewardTrackTaskFilter) => {
        const next = filterRewardTrackTasks(track?.tasks ?? [], value);

        if (!next.some((task) => task.id === selectedTask?.id)) setSelectedTaskId(next[0]?.id ?? null);

        setFilter(value);
    };
    const onClaim = (prize: RewardTrackPrizeData) => track && claimPrize && claimPrize(track.id, prize.id);
    const onPremium = () => track && track.hasPremiumConfig && !track.premium && setPremiumConfirm(true);
    const progressX = track ? layout.xForPoints(track.points, safePage) : 0;
    // the official loading bar truncates the x position (Math.trunc(x) / width) before scaling it back to the bar width
    const progressFill = Math.max(0, Math.min(MAIN_BAR_WIDTH, Math.trunc(progressX)));
    const progressShape = progressFill >= MAIN_BAR_WIDTH - 4 ? MAIN_BAR_WIDTH : progressFill + 4;
    let unclaimedBefore = 0;
    let unclaimedAfter = 0;

    for (const prize of track?.prizes ?? []) {
        if (!prize.isClaimable(track)) continue;

        const prizePage = layout.pageForPoints(prize.requiredPoints);

        if (prizePage < safePage) unclaimedBefore += 1;
        else if (prizePage > safePage) unclaimedAfter += 1;
    }

    const filterText = (value: RewardTrackTaskFilter) => {
        switch (value) {
            case 'in_progress':
                return rewardText('reward_track.tasks.tab.in_progress', 'In Progress');
            case 'completed':
                return rewardText('reward_track.tasks.tab.completed', 'Completed');
            default:
                return rewardText('reward_track.tasks.tab.all_tasks', 'All Tasks');
        }
    };

    const prizeLeft = (points: number) => Math.round(layout.xForPoints(points, safePage) - 40);

    return (
        <>
            <OctaneCard
                className="octane-reward-track resize-none"
                uniqueKey="reward-track"
                windowPosition={DraggableWindowPosition.CENTER}
                style={themeStyle}
                data-theme={themeKey}
            >
                <OctaneCard.Header headerText={rewardText('reward_track.title', 'Reward Track')} onCloseClick={() => setTrackId(null)} />
                <OctaneCard.Content className="octane-reward-track-content">
                    {editMode && isEditor && (
                        <div className="octane-reward-track-admin-host">
                            <RewardTrackAdminView
                                onClose={() => setEditMode(false)}
                                onPreview={(id) => {
                                    setEditMode(false);
                                    open(id);
                                }}
                            />
                        </div>
                    )}
                    {!editMode && !track && (
                        <div className="octane-reward-track-loading">{rewardText('reward_track.loading', 'Loading the reward track...')}</div>
                    )}
                    {!editMode && track && (
                        <div className="octane-reward-track-stage">
                            {/* reward_track_item / button dynamic styles: hover is RGB x1.1 + 15 */}
                            <svg className="octane-reward-track-filters-svg" aria-hidden="true" focusable="false">
                                <filter id="octane-reward-track-hover" colorInterpolationFilters="sRGB">
                                    <feComponentTransfer>
                                        <feFuncR type="linear" slope="1.1" intercept="0.0588" />
                                        <feFuncG type="linear" slope="1.1" intercept="0.0588" />
                                        <feFuncB type="linear" slope="1.1" intercept="0.0588" />
                                    </feComponentTransfer>
                                </filter>
                            </svg>
                            <div className="octane-reward-track-header">
                                <div className="octane-reward-track-rewards">
                                    <div className="octane-reward-track-bg" />
                                    <div className="octane-reward-track-sky" />
                                    <img className="octane-reward-track-stars" src={prizesStars} alt="" width={843} height={226} draggable={false} />
                                    <div className="octane-reward-track-main-bar">
                                        <div className="octane-reward-track-main-bar-progress" style={{ width: progressFill }}>
                                            <div className="octane-reward-track-main-bar-fill" style={{ width: progressShape }} />
                                            <div className="octane-reward-track-main-bar-gloss" />
                                        </div>
                                    </div>
                                    <div className="octane-reward-track-points-band-clip">
                                        <div className="octane-reward-track-points-band" />
                                    </div>
                                    <div className="octane-reward-track-band" data-tier="free">
                                        <span className="octane-reward-track-band-bg" />
                                        <span className="octane-reward-track-band-info" />
                                        <span className="octane-reward-track-band-split" />
                                        <img src={freeTrackIcon} alt="" width={49} height={48} draggable={false} />
                                        <span className="octane-reward-track-band-title">{rewardText('reward_track.rewards.free', 'Free Track')}</span>
                                    </div>
                                    <div className="octane-reward-track-band" data-tier="premium">
                                        <span className="octane-reward-track-band-bg" />
                                        <span className="octane-reward-track-band-info" />
                                        <span className="octane-reward-track-band-split" />
                                        <img src={premiumTrackIcon} alt="" width={58} height={45} draggable={false} />
                                        <span className="octane-reward-track-band-title">{rewardText('reward_track.rewards.premium', 'Premium')}</span>
                                        <small>{rewardText('reward_track.rewards.premium.info', 'Extra rewards')}</small>
                                    </div>
                                    {pagePrizes.points[safePage].map((points) => (
                                        <div key={points} className="octane-reward-track-indicator" style={{ left: 196 + prizeLeft(points) }}>
                                            <img
                                                src={track.points >= points ? availableIcon : notAvailableIcon}
                                                alt=""
                                                width={20}
                                                height={20}
                                                draggable={false}
                                            />
                                            <i className="octane-reward-track-indicator-dot" />
                                            <i className="octane-reward-track-indicator-stem" />
                                            <i className="octane-reward-track-indicator-connector" />
                                            <span>{points}</span>
                                        </div>
                                    ))}
                                    <div className="octane-reward-track-prize-layer">
                                        {pagePrizes.free[safePage].map((prize) => (
                                            <RewardTrackPrizeView
                                                key={prize.id}
                                                track={track}
                                                prize={prize}
                                                left={prizeLeft(prize.requiredPoints)}
                                                onClaim={onClaim}
                                                onPremium={onPremium}
                                            />
                                        ))}
                                        {pagePrizes.premium[safePage].map((prize) => (
                                            <RewardTrackPrizeView
                                                key={prize.id}
                                                track={track}
                                                prize={prize}
                                                left={prizeLeft(prize.requiredPoints)}
                                                onClaim={onClaim}
                                                onPremium={onPremium}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className="octane-reward-track-page"
                                        data-side="prev"
                                        disabled={safePage <= 0}
                                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                                        aria-label="Previous"
                                    >
                                        <img src={iconsBack} alt="" width={33} height={34} draggable={false} />
                                    </button>
                                    <button
                                        type="button"
                                        className="octane-reward-track-page"
                                        data-side="next"
                                        disabled={safePage >= layout.pageCount - 1}
                                        onClick={() => setPage((current) => Math.min(layout.pageCount - 1, current + 1))}
                                        aria-label="Next"
                                    >
                                        <img src={iconsForward} alt="" width={33} height={34} draggable={false} />
                                    </button>
                                    {unclaimedBefore > 0 && (
                                        <span className="octane-reward-track-unclaimed" data-side="prev">
                                            {unclaimedBefore}
                                        </span>
                                    )}
                                    {unclaimedAfter > 0 && (
                                        <span className="octane-reward-track-unclaimed" data-side="next">
                                            {unclaimedAfter}
                                        </span>
                                    )}
                                </div>
                                <div className="octane-reward-track-cutout">
                                    <div className="octane-reward-track-profile">
                                        <div className="octane-reward-track-avatar">
                                            <LayoutAvatarImageView figure={GetSessionDataManager().figure} direction={2} />
                                        </div>
                                        <div className="octane-reward-track-info">
                                            <div className="octane-reward-track-title">
                                                {getRewardTrackText(track.id, 'name', trackFallback(track.id, 'name'))}
                                            </div>
                                            <div className="octane-reward-track-desc">
                                                {getRewardTrackText(track.id, 'desc', trackFallback(track.id, 'desc'))}
                                            </div>
                                            <div className="octane-reward-track-instructions">
                                                {getRewardTrackText(track.id, 'info', trackFallback(track.id, 'info'))}
                                            </div>
                                        </div>
                                        <div className="octane-reward-track-points">
                                            <div className="octane-reward-track-points-value">
                                                <img src={pointLarge} alt="" width={27} height={18} draggable={false} />
                                                <span>{track.points}</span>
                                            </div>
                                            <div className="octane-reward-track-points-label">
                                                {rewardText('reward_track.profile.points_collected', 'Points collected')}
                                            </div>
                                        </div>
                                        <div className="octane-reward-track-splitter" />
                                        <div className="octane-reward-track-collected">
                                            <img src={checkIcon} alt="" width={17} height={15} draggable={false} />
                                            <span>
                                                {rewardText('reward_track.profile.rewards_collected', '%progress% / %total% rewards collected', {
                                                    progress: track.claimedPrizeCount,
                                                    total: track.totalPrizeCount
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="octane-reward-track-bulge" />
                                {isEditor && (
                                    <button
                                        type="button"
                                        className="octane-reward-track-admin-toggle"
                                        title={rewardText('reward_track.admin.open', 'Edit the reward tracks')}
                                        data-testid="reward-track-admin-toggle"
                                        onClick={() => setEditMode(true)}
                                    >
                                        <FaCog />
                                    </button>
                                )}
                            </div>
                            <div className="octane-reward-track-body">
                                <div className="octane-reward-track-tasks">
                                    <img className="octane-reward-track-tasks-icon" src={taskListIcon} alt="" width={19} height={25} draggable={false} />
                                    <div className="octane-reward-track-tasks-title">{rewardText('reward_track.tasks', 'Track Tasks')}</div>
                                    <div className="octane-reward-track-tasks-progress">
                                        {rewardText('reward_track.tasks.progress', '%progress% / %total% completed', {
                                            progress: track.completedTaskCount,
                                            total: track.totalTaskCount
                                        })}
                                    </div>
                                    <div className="octane-reward-track-filters">
                                        {FILTERS.map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className="octane-reward-track-filter"
                                                data-active={filter === value}
                                                onClick={() => onFilter(value)}
                                            >
                                                {filterText(value)}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="octane-reward-track-task-list">
                                        {filteredTasks.map((task) => {
                                            const level = task.activeLevel;
                                            const ratio = task.progressRatioFor(level);

                                            return (
                                                <button
                                                    key={task.id}
                                                    type="button"
                                                    className="octane-reward-track-task"
                                                    data-selected={selectedTask?.id === task.id}
                                                    onClick={() => setSelectedTaskId(task.id)}
                                                >
                                                    <span className="octane-reward-track-task-glyph">
                                                        <TaskGlyph actionType={task.actionType} boxWidth={52} boxHeight={50} />
                                                    </span>
                                                    <span className="octane-reward-track-task-name">
                                                        {getRewardTrackTaskText(track.id, task.id, 'name', task.id)}
                                                    </span>
                                                    <span className="octane-reward-track-task-desc">
                                                        {getRewardTrackTaskText(track.id, task.id, 'desc', '')}
                                                    </span>
                                                    <TaskProgressBar ratio={ratio} width={TASK_BAR_WIDTH} />
                                                    <span className="octane-reward-track-task-count">
                                                        {task.progressCount} / {level ? level.requiredCount : 0}
                                                    </span>
                                                    <span className="octane-reward-track-task-reward">
                                                        <span>{level ? level.pointsReward : 0}</span>
                                                        <img src={pointSmall} alt="" width={19} height={14} draggable={false} />
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {(!track.hasPremiumConfig || track.premium) && (
                                        <div className="octane-reward-track-tip">
                                            <img className="octane-reward-track-tip-gift" src={rewardGift} alt="" width={41} height={36} draggable={false} />
                                            <p>{rewardText('reward_track.tasks.tip', 'Complete tasks to earn points and unlock rewards')}</p>
                                            <img
                                                className="octane-reward-track-tip-frank"
                                                src={frankAndPiccolo}
                                                alt=""
                                                width={88}
                                                height={39}
                                                draggable={false}
                                            />
                                        </div>
                                    )}
                                    {track.hasPremiumConfig && !track.premium && (
                                        <div className="octane-reward-track-tip" data-upgrade="true">
                                            <img
                                                className="octane-reward-track-tip-gift"
                                                src={rewardGiftPremium}
                                                alt=""
                                                width={41}
                                                height={36}
                                                draggable={false}
                                            />
                                            <p>{rewardText('reward_track.tasks.tip_upgrade', 'Upgrade now for premium rewards and faster progression!')}</p>
                                            <button type="button" className="octane-reward-track-btn octane-reward-track-btn-premium" onClick={onPremium}>
                                                {rewardText('reward_track.tasks.tip_upgrade.button', 'Get Premium')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {filteredTasks.length > 0 && selectedTask && (
                                    <div className="octane-reward-track-task-info">
                                        <div className="octane-reward-track-detail-glyph">
                                            <TaskGlyph actionType={selectedTask.actionType} boxWidth={104} boxHeight={100} zoom={2} />
                                        </div>
                                        <div className="octane-reward-track-detail-name">
                                            {getRewardTrackTaskText(track.id, selectedTask.id, 'name', selectedTask.id)}
                                        </div>
                                        <div className="octane-reward-track-detail-desc">{getRewardTrackTaskText(track.id, selectedTask.id, 'desc', '')}</div>
                                        <div className="octane-reward-track-levels-rule" />
                                        <div className="octane-reward-track-levels-title">{rewardText('reward_track.levels.title', 'Levels')}</div>
                                        <div className="octane-reward-track-levels">
                                            {selectedTask.levels.map((level, index) => {
                                                const ratio = selectedTask.progressRatioFor(level);

                                                return (
                                                    <div
                                                        key={index}
                                                        className="octane-reward-track-level"
                                                        data-active={index === selectedTask.activeLevelIndex}
                                                    >
                                                        <span className="octane-reward-track-level-name">
                                                            {rewardText('reward_track.levels.level', 'Level %level%', { level: index + 1 })}
                                                        </span>
                                                        <TaskProgressBar ratio={ratio} width={LEVEL_BAR_WIDTH} />
                                                        <span className="octane-reward-track-level-count">
                                                            {selectedTask.progressCount} / {level.requiredCount}
                                                        </span>
                                                        <span className="octane-reward-track-level-end">
                                                            {ratio >= 1 && (
                                                                <img
                                                                    className="octane-reward-track-level-check"
                                                                    src={checkIcon}
                                                                    alt=""
                                                                    width={17}
                                                                    height={15}
                                                                    draggable={false}
                                                                />
                                                            )}
                                                            <span className="octane-reward-track-level-reward">
                                                                <span>{level.pointsReward}</span>
                                                                <img src={pointSmall} alt="" width={19} height={14} draggable={false} />
                                                            </span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="octane-reward-track-hint">
                                            <img className="octane-reward-track-hint-frank" src={frankTips} alt="" width={52} height={88} draggable={false} />
                                            <div className="octane-reward-track-hint-label">{rewardText('reward_track.levels.tip', 'Tip!')}</div>
                                            <div className="octane-reward-track-hint-text">
                                                {getRewardTrackTaskText(track.id, selectedTask.id, 'hint.desc', '')}
                                            </div>
                                            {hintLink && (
                                                <RewardTrackHintButton
                                                    label={getRewardTrackTaskText(track.id, selectedTask.id, 'hint.button_text', hintLink.fallbackText)}
                                                    onClick={() => CreateLinkEvent(hintLink.link)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </OctaneCard.Content>
            </OctaneCard>
            {premiumConfirm && track && (
                <RewardTrackPremiumConfirmView
                    track={track}
                    pending={pendingPurchase === track.id}
                    onConfirm={() => purchasePremium && purchasePremium(track.id)}
                    onCancel={() => setPremiumConfirm(false)}
                />
            )}
        </>
    );
};
