import { AddLinkEventTracker, CreateLinkEvent, DailyTaskData, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';
import { getDailyTaskImageUrl, getDailyTasksWindowCaption, localizeWithFallback } from '../../api';
import { ClassicScrollAreaView, LayoutBadgeImageView, LayoutCurrencyIcon, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { useDailyTasks } from '../../hooks';
import { AchievementText, useAirFieldWidth } from '../achievements/AchievementText';
import { AirAchievementProgressBar } from '../achievements/AirAchievementProgressBar';
import { useAirScrollInput } from '../achievements/useAirScrollInput';
import { GetHcButton } from './GetHcButton';
import { QuestButton } from './QuestButton';
import taskCompletedUrl from '../../assets/images/quests/task-completed.png';
import '../../css/quests/DailyTasks.css';

const CURRENCY_TYPES: Record<string, number> = { credits: -1, duckets: 0, diamonds: 5 };

const WINDOW_WIDTH = 428;
const SCROLLING_WIDTH = 452;
const WHEEL_STEP = 75;
const ARROW_STEP = 15;
const EXTRA_HEIGHT = 30;
const TASK_HEIGHT = 119;
const TASK_SPACING = 8;
const MAX_VISIBLE_TASKS = 4;
const HEADER_HEIGHT = 33;
const HC_HEIGHT = 35;
const SPACING = 5;

/** Card colours of the official YQ task view: [card, title bar, reward title] per state. */
const PALETTE = {
    orange: [0xf2ddb7, 0xecb139, 0xefc88d],
    green: [0xc6e0b4, 0x4bb245, 0xa6ce92],
    yellow: [0xeff3b5, 0xd8ce63, 0xe1e592]
} as const;

/** The claim button face is the shiny skin multiplied by 0x01a101: flat bands that the label is drawn over, per button state. */
const CLAIM_BANDS = {
    default: [
        { from: 0, to: 12, background: 0x019901 },
        { from: 12, to: 23, background: 0x018901 }
    ],
    hover: [
        { from: 0, to: 12, background: 0x01a101 },
        { from: 12, to: 19, background: 0x019601 },
        { from: 19, to: 23, background: 0x01a101 }
    ],
    pressed: [
        { from: 0, to: 12, background: 0x018e01 },
        { from: 12, to: 23, background: 0x016701 }
    ],
    disabled: [{ from: 0, to: 23, background: 0x298b26 }]
};

/** The official title lands one pixel further left than CSS centring when its raster is an odd number of pixels wide (428 wide window). */
const FrameTitle: FC<{ text: string; oddOffset?: boolean }> = ({ text, oddOffset = false }) => {
    const fieldWidth = useAirFieldWidth(text, 12, true, 'u_frame_title');

    return (
        <NativeText
            background={0x377998}
            className="air-quests-native-title"
            overrides={{ color: 0xffffff }}
            style={oddOffset && fieldWidth !== undefined ? { marginLeft: fieldWidth % 2 === 1 ? -1 : 0 } : undefined}
            text={text}
            textStyle="u_frame_title"
        />
    );
};

/** The official client draws these over the card with alpha: the reward title text at 167/255 black, the amount badge at 231/255. */
const blend = (surface: number, color: number, alpha: number): number => {
    const channel = (shift: number) => Math.round(((color >> shift) & 255) * alpha + ((surface >> shift) & 255) * (1 - alpha));

    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

/** One reward of a task: the product icon with its amount badge, a 44x50 template. */
const DailyTaskRewardView: FC<{ reward: DailyTaskData['rewards'][number]; card: number }> = ({ reward, card }) => {
    const type = reward.rewardTypeId.toLowerCase();
    const amountText = `x${reward.amount}`;
    const fieldWidth = useAirFieldWidth(amountText, 11, true, 'u_regular');
    // reward_amount_border starts as 28 wide at x = 8 and grows around its centre by half the width change, truncated.
    const badgeWidth = fieldWidth === undefined ? 28 : fieldWidth + 5;

    return (
        <div className="air-dt-reward">
            <div className="air-dt-reward-icon">
                {type in CURRENCY_TYPES && <LayoutCurrencyIcon type={CURRENCY_TYPES[type]} />}
                {type === 'badge' && <LayoutBadgeImageView badgeCode={reward.extraParams} />}
            </div>
            {reward.amount > 1 && (
                <div className="air-dt-reward-amount" style={{ width: badgeWidth, left: 8 - Math.trunc((badgeWidth - 28) / 2), background: `#${blend(card, 0x7c7c7c, 231 / 255).toString(16).padStart(6, '0')}` }}>
                    <AchievementText background={blend(card, 0x7c7c7c, 231 / 255)} bold color={0xffffff} size={11} text={amountText} textStyle="u_regular" x={3} y={-1} />
                </div>
            )}
        </div>
    );
};

/** One row of the official daily tasks list (task_template 402x119). */
const DailyTaskRowView: FC<{ task: DailyTaskData; onClaim: (task: DailyTaskData) => void }> = ({ task, onClaim }) => {
    const [claiming, setClaiming] = useState(false);
    const sentRef = useRef(false);
    const [buttonState, setButtonState] = useState<'default' | 'hover' | 'pressed'>('default');
    const inProgress = task.status === DailyTaskData.STATUS_IN_PROGRESS;
    const claimed = task.status === DailyTaskData.STATUS_CLAIMED;
    const [card, bar, rewardBar] = PALETTE[task.isBonus ? 'yellow' : inProgress ? 'orange' : 'green'];

    useEffect(() => {
        sentRef.current = false;
        setClaiming(false);
    }, [task.status]);

    return (
        <div className="air-dt-task" style={{ '--air-dt-card': `#${card.toString(16)}`, '--air-dt-bar': `#${bar.toString(16)}`, '--air-dt-reward-bar': `#${rewardBar.toString(16)}` } as CSSProperties}>
            <div className="air-dt-surface air-dt-card" />
            <div className="air-dt-left">
                <div className="air-dt-surface air-dt-name">
                    <AchievementText background={bar} bold color={0xffffff} size={13} text={localizeWithFallback(task.nameLocalizationKey, task.taskCode)} textStyle="u_regular" x={20} y={5} />
                    <span className="air-dt-hint" title={localizeWithFallback(task.hintLocalizationKey, '')}>
                        <AchievementText background={bar} bold color={0xffffff} size={13} text="?" textStyle="u_regular" underline x={1} y={0} />
                    </span>
                </div>
                <img
                    className="air-dt-image"
                    src={getDailyTaskImageUrl(task)}
                    alt=""
                    draggable={false}
                    onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                    }}
                    onLoad={(event) => {
                        event.currentTarget.style.visibility = 'visible';
                    }}
                />
                <AchievementText background={card} height={55} maxWidth={198} text={localizeWithFallback(task.descriptionLocalizationKey, '')} textStyle="u_regular" x={76} y={36} />
                {!inProgress && (
                    <div className="air-dt-complete">
                        <img className="air-dt-complete-icon" src={taskCompletedUrl} alt="" draggable={false} />
                        <AchievementText align="right" background={card} bold color={0x24850b} text={localizeWithFallback('dailytasks.task.complete', 'Task complete')} textStyle="u_regular" width={143} x={33} y={6} />
                    </div>
                )}
            </div>
            <div className="air-dt-right">
                <div className="air-dt-surface air-dt-reward-title">
                    <AchievementText align="center" background={rewardBar} bold color={blend(rewardBar, 0x000000, 167 / 255)} size={13} text={localizeWithFallback('dailytasks.reward', 'Reward')} textStyle="u_regular" width={110} x={0} y={6} />
                </div>
                <div className="air-dt-rewards" style={{ left: 32 - (task.rewards.length - 1) * 24 - 0, width: 44 * task.rewards.length + 4 * (task.rewards.length - 1) }}>
                    {task.rewards.map((reward, index) => (
                        <DailyTaskRewardView key={index} reward={reward} card={card} />
                    ))}
                </div>
                <div className="air-dt-bottom">
                    {inProgress ? (
                        <AirAchievementProgressBar
                            className="air-dt-progress"
                            identity={task.taskId}
                            localizationKey="quests.tracker.progress"
                            maxProgress={task.requiredRepeats}
                            percentCaption
                            progress={task.repeats}
                            width={102}
                        />
                    ) : (
                        <button
                            type="button"
                            className="air-dt-claim"
                            disabled={claimed || claiming}
                            onPointerEnter={() => setButtonState('hover')}
                            onPointerLeave={() => setButtonState('default')}
                            onPointerDown={() => setButtonState('pressed')}
                            onPointerUp={() => setButtonState('hover')}
                            onClick={() => {
                                // The official button disables itself as it is pressed; state alone would let a second callback in before the render.
                                if (sentRef.current) return;

                                sentRef.current = true;
                                setClaiming(true);
                                onClaim(task);
                            }}
                        >
                            {!(claimed || claiming) && <span className="air-dt-claim-seam" style={{ background: `#${CLAIM_BANDS[buttonState][0].background.toString(16).padStart(6, '0')}` }} />}
                            {CLAIM_BANDS[claimed || claiming ? 'disabled' : buttonState].map((band) => (
                                <span key={band.from} className="air-dt-claim-band" style={{ clipPath: `inset(${band.from}px 0 ${23 - band.to}px 0)` }}>
                                    <AchievementText
                                        align="center"
                                        background={band.background}
                                        bold
                                        color={0xffffff}
                                        height={17}
                                        text={claimed ? localizeWithFallback('dailytasks.claimed', 'Claimed') : localizeWithFallback('dailytasks.claim', 'Claim')}
                                        textStyle="u_regular"
                                        width={91}
                                        x={claimed ? 4 : 3}
                                        y={3}
                                    />
                                </span>
                            ))}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/** extra_cont: the unclaimed button hugs its label (text + 15) and keeps the right edge of its 133 wide layout rect. */
const UnclaimedButtonView: FC<{ onClick: () => void }> = ({ onClick }) => {
    const label = localizeWithFallback('dailytasks.unclaimed', 'Unclaimed tasks');
    const fieldWidth = useAirFieldWidth(label, 12, false, 'u_regular');
    const width = fieldWidth === undefined ? 133 : fieldWidth + 15;

    return (
        <QuestButton
            className="air-quest-get-hc air-dt-unclaimed"
            label={label}
            height={30}
            style={{ left: 412 - width, width }}
            textStyle="u_regular"
            thin
            title={localizeWithFallback('dailytasks.unclaimed.tooltip', '')}
            width={width}
            onClick={onClick}
        />
    );
};

/** A list of task rows with the style 3 scroll area the official scrollable_itemlist_vertical draws (always shown when `alwaysScroll`). */
const DailyTaskListView: FC<{ tasks: DailyTaskData[]; height: number; top: number; scrolling: boolean; onClaim: (task: DailyTaskData) => void }> = ({ tasks, height, top, scrolling, onClaim }) => {
    const [viewport, setViewport] = useState<HTMLDivElement>(null);

    useAirScrollInput(viewport, { wheelStep: WHEEL_STEP, arrowStep: ARROW_STEP });

    const rows = tasks.map((task) => <DailyTaskRowView key={task.taskId} task={task} onClaim={onClaim} />);

    if (!scrolling) return <div className="air-dt-list" style={{ top, height }}>{rows}</div>;

    return (
        <ClassicScrollAreaView className="air-dt-list air-dt-scroll air-style3-scroll-area" scrollStep={ARROW_STEP} style={{ top, height }} viewportRef={setViewport}>
            <div className="air-dt-rows">{rows}</div>
        </ClassicScrollAreaView>
    );
};

/**
 * The official daily tasks window (428x?, `dailytasks/open`): the tasks of the day, the unclaimed
 * reminder for expired-but-completed tasks and the HC double-duckets footer.
 */
export const DailyTasksView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showUnclaimed, setShowUnclaimed] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number }>(null);
    const [tick, setTick] = useState(0);
    const { activeTasks = [], unclaimedTasks = [], requestTasks = null, claimTask = null } = useDailyTasks();

    const hasClub = GetSessionDataManager().clubLevel > 0;

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'open':
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'dailytasks/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        requestTasks && requestTasks();

        const interval = window.setInterval(() => setTick((prevValue) => prevValue + 1), 1000);

        return () => window.clearInterval(interval);
    }, [isVisible, requestTasks]);

    // DailyTaskData.secondsLeft counts down against Date.now(), so the one second tick has to invalidate this.
    const maxSecondsLeft = useMemo(() => activeTasks.reduce((max, task) => Math.max(max, task.secondsLeft), 0), [activeTasks, tick]);

    useEffect(() => {
        if (!isVisible || !requestTasks) return;

        if (!activeTasks.length || maxSecondsLeft < -5) requestTasks();
    }, [isVisible, activeTasks.length, maxSecondsLeft, requestTasks]);

    const visibleTasks = Math.min(Math.max(activeTasks.length, 1), MAX_VISIBLE_TASKS);
    const listHeight = visibleTasks * (TASK_HEIGHT + TASK_SPACING) - TASK_SPACING;
    const scrolling = activeTasks.length > MAX_VISIBLE_TASKS;
    const extra = unclaimedTasks.length > 0 ? EXTRA_HEIGHT + SPACING : 0;
    const windowWidth = scrolling ? SCROLLING_WIDTH : WINDOW_WIDTH;
    const windowHeight = HEADER_HEIGHT + SPACING + extra + listHeight + SPACING + HC_HEIGHT;

    useEffect(() => {
        if (isVisible && !position) setPosition({ x: 43, y: 37 });

        if (!isVisible) setShowUnclaimed(false);
    }, [isVisible, position]);

    if (!isVisible || !position) return null;

    const onClaim = (task: DailyTaskData) => claimTask && claimTask(task.taskId);

    return (
        <>
            <OctaneCardView
                className="octane-daily-tasks-air"
                uniqueKey="daily-tasks"
                frameStyle={3}
                isResizable={false}
                initialPosition={position}
                onPositionChange={setPosition}
                unconstrainedPosition
                style={{ height: windowHeight, width: windowWidth }}
                dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }}
            >
                <OctaneCardHeaderView headerText="" onCloseClick={() => setIsVisible(false)}>
                    <FrameTitle oddOffset text={getDailyTasksWindowCaption(maxSecondsLeft)} />
                </OctaneCardHeaderView>
                <div className="air-dt-content octane-card-content-shell">
                    {unclaimedTasks.length > 0 && (
                        <UnclaimedButtonView onClick={() => setShowUnclaimed(true)} />
                    )}
                    <DailyTaskListView tasks={activeTasks} height={listHeight} top={SPACING + extra} scrolling={scrolling} onClaim={onClaim} />
                    <div className="air-dt-hc" style={{ top: SPACING + extra + listHeight + SPACING }}>
                        <AchievementText
                            align="center"
                            background={0xe9e9e1}
                            height={17}
                            maxWidth={289}
                            text={
                                hasClub
                                    ? localizeWithFallback('hc.has.double_duckets.info', 'You get double duckets as you are an HC member!')
                                    : localizeWithFallback('hc.get.double_duckets.info', 'Get HC membership to gain double duckets!')
                            }
                            textStyle="u_regular"
                            width={289}
                            x={12}
                            y={6}
                        />
                        {!hasClub && (
                            <GetHcButton className="air-dt-get-hc" right={412} onClick={() => CreateLinkEvent('catalog/open/hc_membership')} />
                        )}
                    </div>
                </div>
            </OctaneCardView>
            {showUnclaimed && (
                <OctaneCardView
                    className="octane-daily-tasks-air octane-daily-tasks-unclaimed"
                    uniqueKey="daily-tasks-unclaimed"
                    frameStyle={3}
                    isResizable={false}
                    initialPosition={position}
                    unconstrainedPosition
                    style={{ height: 426, width: 452 }}
                    dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }}
                >
                    <OctaneCardHeaderView headerText="" onCloseClick={() => setShowUnclaimed(false)}>
                        <FrameTitle text={localizeWithFallback('dailytasks.unclaimed', 'Unclaimed rewards')} />
                    </OctaneCardHeaderView>
                    <div className="air-dt-content octane-card-content-shell">
                        <DailyTaskListView tasks={unclaimedTasks} height={373} top={10} scrolling onClaim={onClaim} />
                    </div>
                </OctaneCardView>
            )}
        </>
    );
};
