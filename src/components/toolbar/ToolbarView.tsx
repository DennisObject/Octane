import { CreateLinkEvent, Dispose, DropBounce, EaseOut, FindNewFriendsMessageComposer, GetSessionDataManager, JumpBy, Motions, OctaneToolbarAnimateIconEvent, PerkEnum, Queue, SessionDataPreferencesEvent, Wait, YouTubeRoomSettingsEvent } from '@octane/renderer';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { CSSProperties, FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Permission } from '../../api/permissions';
import { GetConfigurationValue, isHousekeepingEnabled, localizeWithFallback, MessengerIconState, OpenMessengerChat, SendMessageComposer, setYoutubeRoomEnabled, VisitDesktop } from '../../api';
import dividerImg from '../../assets/images/toolbar/air/divider.png';
import memenuBgImg from '../../assets/images/toolbar/air/memenu-bg.png';
import memenuCircleImg from '../../assets/images/toolbar/air/memenu-circle.png';
import { Flex, LayoutAvatarImageView, LayoutItemCountView } from '../../common';
import { useAchievements, useBuildHeight, useDailyTasks, useFriends, useHasPermission, useInventoryUnseenTracker, useMessageEvent, useMessenger, useOctaneEvent, useOpenIssueCount, useRewardTracks, useSessionInfo, useWiredTools } from '../../hooks';
import { usePerkAllowed } from '../../state/perkAllowancesStore';
import { AIR_RAISED_CHAT_BOTTOM } from './bottomDockLayout';
import { ToolbarItemView } from './ToolbarItemView';
import { ToolbarMeView } from './ToolbarMeView';
import { ToolbarProgressionView } from './ToolbarProgressionView';
import { ToolbarUnseenCountView } from './ToolbarUnseenCountView';
import { YouTubePlayerView } from './YouTubePlayerView';

const containerVariants: Variants = {
    hidden: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
    visible: { transition: { staggerChildren: 0.025 } }
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.8 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 22 } }
};

const shellVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 }
};

const SHELL_TRANSITION = { type: 'spring' as const, stiffness: 260, damping: 26 };
const NAV_TRANSITION = { type: 'spring' as const, stiffness: 300, damping: 28 };
const ME_POPOVER_TRANSITION = { type: 'spring' as const, stiffness: 420, damping: 28 };
const LEFT_COLLAPSED_STORAGE_KEY = 'nitro.toolbar.leftCollapsed';
// UI flag 1 (SessionDataManager.setFriendBarState): set while the friend bar is expanded.
const FRIEND_BAR_UI_FLAG = 1;


const readCollapsedPreference = (key: string): boolean =>
{
    if(typeof window === 'undefined') return false;

    try
    {
        return window.localStorage.getItem(key) === '1';
    }
    catch
    {
        return false;
    }
};

export const ToolbarView: FC<{ isInRoom: boolean }> = props =>
{
    const { isInRoom } = props;
    const [ isMeExpanded, setMeExpanded ] = useState(false);
    const [ isProgressionExpanded, setProgressionExpanded ] = useState(false);
    const [ isTouchLayout, setIsTouchLayout ] = useState(false);
    const [ leftCollapsed, setLeftCollapsed ] = useState(() => readCollapsedPreference(LEFT_COLLAPSED_STORAGE_KEY));
    const [ rightCollapsed, setRightCollapsed ] = useState(() => !((GetSessionDataManager()?.uiFlags ?? 0) & FRIEND_BAR_UI_FLAG));
    const [ staffStackBottom, setStaffStackBottom ] = useState<number | null>(null);
    const useGuideTool = usePerkAllowed(PerkEnum.USE_GUIDE_TOOL);
    const cameraAllowed = usePerkAllowed(PerkEnum.CAMERA);
    const [ youtubeEnabled, setYoutubeEnabled ] = useState(false);
    const leftDockRef = useRef<HTMLDivElement>(null);
    const rightDockRef = useRef<HTMLDivElement>(null);
    const meSlotRef = useRef<HTMLDivElement>(null);
    const progressionSlotRef = useRef<HTMLDivElement>(null);
    const meMenuRef = useRef<HTMLDivElement>(null);
    const progressionMenuRef = useRef<HTMLDivElement>(null);
    const { userFigure = null } = useSessionInfo();
    const { getFullCount = 0 } = useInventoryUnseenTracker();
    const { getTotalUnseen = 0 } = useAchievements();
    const { unseenCount: unseenDailyTaskCount = 0 } = useDailyTasks();
    const { unseenCount: unseenRewardTrackCount = 0 } = useRewardTracks();
    // HabboToolbar.setUnseenItemCount("HTIE_ICON_PROGRESSION", unseenProgMenuCount): achievements + daily tasks + reward track rewards.
    const unseenProgMenuCount = getTotalUnseen + unseenDailyTaskCount + unseenRewardTrackCount;
    const { requests = [] } = useFriends();
    const { iconState = MessengerIconState.HIDDEN } = useMessenger();
    const { openMonitor, showToolbarButton } = useWiredTools();
    const { available: buildHeightAvailable, toggle: toggleBuildHeight } = useBuildHeight();
    const isMod = useHasPermission(Permission.ModerationTool);
    const isHk = useHasPermission(Permission.HousekeepingAccess);
    const hkEnabled = useMemo(() => isHousekeepingEnabled(), []);
    const openIssueCount = useOpenIssueCount();
    const openTicketsCount = isMod ? openIssueCount : 0;
    const visibilityVariant = 'visible';
    const touchLayout = isTouchLayout;
    const mobileOnlyClasses = touchLayout ? '' : 'hidden';
    const desktopBlockClasses = touchLayout ? 'hidden' : 'block';
    const desktopFlexClasses = touchLayout ? 'hidden' : 'flex';
    const socialInSideStack = touchLayout;
    const sideStackClasses = touchLayout ? '' : 'hidden';
    const storiesEnabled = useMemo(() => GetConfigurationValue<boolean>('toolbar.stories.enabled', false), []);
    // CAMERA icon: room only, camera.launch.ui.position "bottom-icons" and the CAMERA perk.
    const cameraInBottomBar = GetConfigurationValue<string>('camera.launch.ui.position', 'bottom-icons') === 'bottom-icons';
    const cameraAvailable = isInRoom && cameraInBottomBar && cameraAllowed;
    const gamesAvailable = GetConfigurationValue<boolean>('games_icon_enabled', GetConfigurationValue<boolean>('game.center.enabled', false));
    const [ messengerNotifyFrame, setMessengerNotifyFrame ] = useState(0);
    const chatFrameStyle = useMemo<CSSProperties | undefined>(() =>
    {
        if(touchLayout) return undefined;

        // chatinput_window_new keeps its place above the bottom bar; it never moves into the bar.
        return { bottom: `${ AIR_RAISED_CHAT_BOTTOM }px` };
    }, [ touchLayout ]);

    const railMaxWidthClass = 'max-w-[calc(50vw-12px)]';
    const chatFramePositionClass = touchLayout ? 'bottom-[90px]' : '';
    const leftNavVariants = useMemo<Variants>(() => ({
        hidden: { opacity: 0, x: isInRoom ? -10 : 0, y: isInRoom ? 0 : 8, pointerEvents: 'none' },
        visible: { opacity: 1, x: 0, y: 0, pointerEvents: 'auto' }
    }), [ isInRoom ]);
    const rightNavVariants = useMemo<Variants>(() => ({
        hidden: { opacity: 0, x: 10, pointerEvents: 'none' },
        visible: { opacity: 1, x: 0, pointerEvents: 'auto' }
    }), []);
    const mobileNavVariants = useMemo<Variants>(() => ({
        hidden: { opacity: 0, y: 8, pointerEvents: 'none' },
        visible: { opacity: 1, y: 0, pointerEvents: 'auto' }
    }), []);

    useMessageEvent<YouTubeRoomSettingsEvent>(YouTubeRoomSettingsEvent, event =>
    {
        const enabled = event.getParser().youtubeEnabled;
        setYoutubeEnabled(enabled);
        setYoutubeRoomEnabled(enabled);
    });

    useEffect(() =>
    {
        if(!isInRoom)
        {
            setYoutubeEnabled(false);
            setYoutubeRoomEnabled(false);
        }
    }, [ isInRoom ]);

    useEffect(() =>
    {
        const query = window.matchMedia('(pointer: coarse), (hover: none)');
        const updateTouchLayout = () => setIsTouchLayout(query.matches);

        updateTouchLayout();
        query.addEventListener('change', updateTouchLayout);

        return () => query.removeEventListener('change', updateTouchLayout);
    }, []);

    useEffect(() =>
    {
        if(iconState !== MessengerIconState.UNREAD)
        {
            setMessengerNotifyFrame(0);
            return;
        }

        const interval = window.setInterval(() => setMessengerNotifyFrame(value => (value === 0 ? 1 : 0)), 500);

        return () => window.clearInterval(interval);
    }, [ iconState ]);

    useEffect(() =>
    {
        try
        {
            window.localStorage.setItem(LEFT_COLLAPSED_STORAGE_KEY, leftCollapsed ? '1' : '0');
        }
        catch
        {
        }
    }, [ leftCollapsed ]);

    useOctaneEvent<SessionDataPreferencesEvent>(SessionDataPreferencesEvent.UPDATED, event => setRightCollapsed(!(event.uiFlags & FRIEND_BAR_UI_FLAG)));

    const toggleFriendBar = (collapsed: boolean) =>
    {
        setRightCollapsed(collapsed);
        GetSessionDataManager()?.setFriendBarState(!collapsed);
    };

    useEffect(() =>
    {
        const measure = () =>
        {
            const roomTools = document.querySelector('.octane-room-tools-container') as HTMLElement | null;
            const next = roomTools
                ? Math.max(8, Math.round(window.innerHeight - roomTools.getBoundingClientRect().top + 15))
                : null;

            setStaffStackBottom(prevValue => (prevValue === next ? prevValue : next));
        };

        measure();

        const interval = window.setInterval(measure, 400);
        window.addEventListener('resize', measure);

        return () =>
        {
            window.clearInterval(interval);
            window.removeEventListener('resize', measure);
        };
    }, [ isInRoom ]);

    useLayoutEffect(() =>
    {
        if(touchLayout) return;

        const positionMenus = () =>
        {
            for(const [ slot, menu ] of [
                [ meSlotRef.current, meMenuRef.current ],
                [ progressionSlotRef.current, progressionMenuRef.current ]
            ])
            {
                if(!slot || !menu) continue;

                const bounds = slot.getBoundingClientRect();
                const left = bounds.left + bounds.width / 2 - menu.offsetWidth / 2;

                menu.style.left = `${ Math.round(Math.max(3, Math.min(left, window.innerWidth - menu.offsetWidth - 3))) }px`;
            }
        };

        positionMenus();

        const observer = new ResizeObserver(positionMenus);

        for(const element of [ leftDockRef.current, meMenuRef.current, progressionMenuRef.current ])
        {
            if(element) observer.observe(element);
        }

        window.addEventListener('resize', positionMenus);

        return () =>
        {
            observer.disconnect();
            window.removeEventListener('resize', positionMenus);
        };
    }, [ isMeExpanded, isProgressionExpanded, leftCollapsed, touchLayout ]);

    const openYouTubePlayer = () => window.dispatchEvent(new CustomEvent('youtube:toggle'));

    useOctaneEvent<OctaneToolbarAnimateIconEvent>(OctaneToolbarAnimateIconEvent.ANIMATE_ICON, event =>
    {
        const animationIconToToolbar = (iconName: string, image: HTMLImageElement, x: number, y: number) =>
        {
            const target = (document.body.getElementsByClassName(iconName)[0] as HTMLElement);

            if(!target) return;

            image.className = 'toolbar-icon-animation';
            image.style.visibility = 'visible';
            image.style.left = (x + 'px');
            image.style.top = (y + 'px');

            document.body.append(image);

            const targetBounds = target.getBoundingClientRect();
            const imageBounds = image.getBoundingClientRect();
            const left = (imageBounds.x - targetBounds.x);
            const top = (imageBounds.y - targetBounds.y);
            const squared = Math.sqrt(((left * left) + (top * top)));
            const wait = (500 - Math.abs(((((1 / squared) * 100) * 500) * 0.5)));
            const height = 20;
            const motionName = (`ToolbarBouncing[${ iconName }]`);

            if(!Motions.getMotionByTag(motionName))
            {
                Motions.runMotion(new Queue(new Wait((wait + 8)), new DropBounce(target, 400, 12))).tag = motionName;
            }

            const motion = new Queue(new EaseOut(new JumpBy(image, wait, ((targetBounds.x - imageBounds.x) + height), (targetBounds.y - imageBounds.y), 100, 1), 1), new Dispose(image));

            Motions.runMotion(motion);
        };

        animationIconToToolbar('icon-inventory', event.image, event.x, event.y);
    });

    return (
        <>
            {youtubeEnabled && <YouTubePlayerView />}

            <AnimatePresence>
                {!touchLayout && isProgressionExpanded && (
                    <motion.div
                        key="progression-menu"
                        ref={progressionMenuRef}
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={ME_POPOVER_TRANSITION}
                        className="pointer-events-auto fixed bottom-[51px] left-[3px] z-[100]"
                    >
                        <ToolbarProgressionView
                            achievementCount={getTotalUnseen}
                            dailyTaskCount={unseenDailyTaskCount}
                            rewardTrackCount={unseenRewardTrackCount}
                            setExpanded={setProgressionExpanded}
                        />
                    </motion.div>
                )}
                {!touchLayout && isMeExpanded && (
                    <motion.div
                        key="me-menu"
                        ref={meMenuRef}
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={ME_POPOVER_TRANSITION}
                        className="pointer-events-auto fixed bottom-[51px] left-[3px] z-[100]"
                    >
                        <ToolbarMeView setMeExpanded={setMeExpanded} useGuideTool={useGuideTool} />
                    </motion.div>
                )}
            </AnimatePresence>

            {isInRoom && (
                <div
                    style={chatFrameStyle}
                    className={`tb-frame absolute ${chatFramePositionClass} left-1/2 ml-[calc(min(236px,47.5vw)*-1)] z-[71] flex h-[38px] w-[471px] max-w-[95vw] items-center p-0 pointer-events-none`}
                >
                    <Flex
                        alignItems="center"
                        justifyContent="center"
                        className="pointer-events-auto h-full w-full min-w-0 flex-1"
                        id="toolbar-chat-input-container"
                    />
                </div>
            )}

            <motion.div
                initial="visible"
                animate={visibilityVariant}
                variants={shellVariants}
                transition={SHELL_TRANSITION}
                className={`octane-toolbar octane-toolbar-hobba absolute z-[70] ${desktopBlockClasses}`}
            />

            <motion.div
                ref={leftDockRef}
                initial="visible"
                animate={visibilityVariant}
                variants={leftNavVariants}
                transition={NAV_TRANSITION}
                className={`tb-nav-clip tb-left-dock absolute bottom-0 left-0 z-[71] h-[46px] ${railMaxWidthClass} items-center ${desktopFlexClasses}`}
            >
                <button
                    type="button"
                    onClick={() =>
                    {
                        setProgressionExpanded(false);
                        setLeftCollapsed((value) => !value);
                    }}
                    aria-label={localizeWithFallback('toolbar.icons.toggle', 'Show/hide icons')}
                    className={`tb-collapse pointer-events-auto ${leftCollapsed ? 'tb-collapse--right' : 'tb-collapse--left'}`}
                />
                <motion.div variants={containerVariants} className="tb-open-shell flex h-[46px] max-w-full items-start overflow-visible bg-transparent">
                    {!leftCollapsed && (
                        <>
                            <motion.div variants={itemVariants} className="tb-slot">
                                {isInRoom ? (
                                    <ToolbarItemView icon="habbo" onClick={() => VisitDesktop()} className="tb-icon" />
                                ) : (
                                    <ToolbarItemView icon="house" onClick={() => CreateLinkEvent('navigator/goto/home')} className="tb-icon" />
                                )}
                            </motion.div>
                            <motion.div variants={itemVariants} className="tb-slot">
                                <ToolbarItemView icon="rooms" onClick={() => CreateLinkEvent('navigator/toggle')} className="tb-icon" />
                            </motion.div>
                            {isInRoom && (
                                <motion.div ref={progressionSlotRef} variants={itemVariants} className="relative tb-slot">
                                    <ToolbarItemView
                                        icon="progression"
                                        onClick={(event) =>
                                        {
                                            setMeExpanded(false);
                                            setProgressionExpanded((value) => !value);
                                            event.stopPropagation();
                                        }}
                                        className="tb-icon"
                                    />
                                    <ToolbarUnseenCountView count={unseenProgMenuCount} />
                                </motion.div>
                            )}
                            {/* GAMES: visible in room and hotel view when games_icon_enabled (game.center.enabled kept as a fallback key) */}
                            {gamesAvailable && (
                                <motion.div variants={itemVariants} className="tb-slot">
                                    <ToolbarItemView icon="game" onClick={() => CreateLinkEvent('games/toggle')} className="tb-icon" />
                                </motion.div>
                            )}
                            {!isInRoom && storiesEnabled && (
                                <motion.div variants={itemVariants} className="tb-slot">
                                    <ToolbarItemView icon="stories" onClick={() => CreateLinkEvent('stories/toggle')} className="tb-icon" />
                                </motion.div>
                            )}
                        </>
                    )}
                    <motion.div variants={itemVariants} className="tb-slot">
                        <ToolbarItemView icon="catalog" onClick={() => CreateLinkEvent('catalog/toggle/normal')} className="tb-icon" />
                    </motion.div>
                    {isInRoom && (
                        <motion.div variants={itemVariants} className="relative tb-slot tb-slot-inventory">
                            <ToolbarItemView icon="inventory" onClick={() => CreateLinkEvent('inventory/toggle')} className="tb-icon" />
                            <ToolbarUnseenCountView count={getFullCount} />
                        </motion.div>
                    )}
                    <motion.div
                        ref={meSlotRef}
                        variants={itemVariants}
                        className="relative tb-slot tb-slot-tall tb-slot-memenu"
                        data-toolbar-tooltip={localizeWithFallback('toolbar.icon.label.memenu', 'Me')}
                    >
                        <img src={memenuBgImg} alt="" className="tb-memenu-bg" />
                        <motion.div
                            className="tb-memenu-avatar"
                            aria-label={localizeWithFallback('toolbar.icon.label.memenu', 'Me')}
                            onClick={(event) =>
                            {
                                setProgressionExpanded(false);
                                setMeExpanded((value) => !value);
                                event.stopPropagation();
                            }}
                        >
                            <LayoutAvatarImageView airMeMenu={true} direction={3} figure={userFigure} />
                        </motion.div>
                        <img src={memenuCircleImg} alt="" className="tb-memenu-circle" />
                    </motion.div>
                    {isInRoom && showToolbarButton && (
                        <motion.div variants={itemVariants} className="tb-slot tb-slot-tall">
                            <ToolbarItemView icon="wired-tools" onClick={openMonitor} className="tb-icon" />
                        </motion.div>
                    )}
                    {cameraAvailable && (
                        <motion.div variants={itemVariants} className="tb-slot tb-slot-tall">
                            <ToolbarItemView icon="camera" onClick={() => CreateLinkEvent('camera/toggle')} className="tb-icon" />
                        </motion.div>
                    )}
                    <img src={dividerImg} alt="" className="tb-divider" />
                    {!leftCollapsed && (
                        <>
                            {isInRoom && youtubeEnabled && (
                                <motion.div variants={itemVariants} className="tb-slot">
                                    <ToolbarItemView icon="youtube" onClick={openYouTubePlayer} className="tb-icon" />
                                </motion.div>
                            )}
                            {isInRoom && buildHeightAvailable && (
                                <motion.div variants={itemVariants} className="tb-slot">
                                    <ToolbarItemView icon="buildheight" onClick={toggleBuildHeight} className="tb-icon" />
                                </motion.div>
                            )}
                            {isMod && (
                                <motion.div variants={itemVariants} className="relative tb-slot">
                                    <ToolbarItemView icon="modtools" onClick={() => CreateLinkEvent('mod-tools/show')} className="tb-icon" />
                                    {openTicketsCount > 0 && (
                                        <LayoutItemCountView count={openTicketsCount} className="pointer-events-none absolute -right-1 -top-1 z-10" />
                                    )}
                                </motion.div>
                            )}
                            {isHk && hkEnabled && (
                                <motion.div variants={itemVariants} className="tb-slot">
                                    <ToolbarItemView icon="housekeeping" onClick={() => CreateLinkEvent('housekeeping/toggle')} className="tb-icon" />
                                </motion.div>
                            )}
                        </>
                    )}
                </motion.div>
            </motion.div>
            <motion.div
                ref={rightDockRef}
                initial="visible"
                animate={visibilityVariant}
                variants={rightNavVariants}
                transition={NAV_TRANSITION}
                data-collapsed={rightCollapsed ? 'true' : 'false'}
                className={`tb-nav-clip tb-right-dock absolute right-0 z-[71] ${desktopFlexClasses}`}
            >
                {/* new_bar_xml: the visible children are laid out left to right from x=0 (friendtools 150, page arrows, list, collapse_right 15). */}
                <motion.div variants={containerVariants} className="tb-friendtools">
                    {!rightCollapsed && <img src={dividerImg} alt="" className="tb-friendtools-line" />}
                    <motion.div variants={itemVariants} className="relative tb-slot tb-right-friends">
                        <ToolbarItemView icon="friendall" onClick={() => CreateLinkEvent('friends/toggle')} className="tb-icon" />
                        <ToolbarUnseenCountView count={requests.length} className="tb-unseen-count--friends" />
                    </motion.div>
                    <motion.div variants={itemVariants} className="tb-slot tb-right-search">
                        <ToolbarItemView icon="friendsearch" onClick={() => CreateLinkEvent('friends/search')} className="tb-icon" />
                    </motion.div>
                    {iconState !== MessengerIconState.HIDDEN && (
                        <motion.div variants={itemVariants} className="tb-slot tb-slot-messenger tb-right-messenger">
                            <ToolbarItemView
                                className={`tb-icon ${iconState === MessengerIconState.UNREAD ? (messengerNotifyFrame === 1 ? 'is-notify-1' : 'is-notify-0') : ''}`}
                                icon="message"
                                onClick={() => OpenMessengerChat()}
                            />
                        </motion.div>
                    )}
                    {rightCollapsed && (
                        <button
                            type="button"
                            onClick={() => toggleFriendBar(false)}
                            aria-label={localizeWithFallback('toolbar.icons.toggle', 'Show/hide icons')}
                            className="tb-collapse tb-collapse--friendbar-left pointer-events-auto"
                        />
                    )}
                </motion.div>
                {/* Collapsing only clips the bar, so the tabs keep their state. */}
                <div className={`tb-right-friend-bar ${rightCollapsed ? 'hidden' : ''}`} id="toolbar-friend-bar-container-desktop" />
                {!rightCollapsed && (
                    <>
                        <button
                            type="button"
                            onClick={() => toggleFriendBar(true)}
                            aria-label={localizeWithFallback('toolbar.icons.toggle', 'Show/hide icons')}
                            className="tb-collapse tb-collapse--friendbar-right pointer-events-auto"
                        />
                    </>
                )}
            </motion.div>
            <motion.div
                initial="visible"
                animate={visibilityVariant}
                variants={mobileNavVariants}
                transition={NAV_TRANSITION}
                className={`absolute left-1/2 bottom-0 z-[71] flex w-[95vw] -translate-x-1/2 items-center overflow-visible ${mobileOnlyClasses} ${isInRoom ? 'octane-toolbar-mobile-hobba px-[6px] py-[4px] mb-[3px]' : ''}`}
            >
                <motion.div
                    variants={containerVariants}
                    className="tb-bar-scroll flex h-full min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-visible px-1"
                >
                    <motion.div variants={itemVariants}>
                        {isInRoom ? (
                            <ToolbarItemView icon="habbo" onClick={() => VisitDesktop()} className="tb-icon" />
                        ) : (
                            <ToolbarItemView icon="house" onClick={() => CreateLinkEvent('navigator/goto/home')} className="tb-icon" />
                        )}
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <ToolbarItemView icon="rooms" onClick={() => CreateLinkEvent('navigator/toggle')} className="tb-icon" />
                    </motion.div>
                    {gamesAvailable && (
                        <motion.div variants={itemVariants}>
                            <ToolbarItemView icon="game" onClick={() => CreateLinkEvent('games/toggle')} className="tb-icon" />
                        </motion.div>
                    )}
                    <motion.div variants={itemVariants}>
                        <ToolbarItemView icon="catalog" onClick={() => CreateLinkEvent('catalog/toggle/normal')} className="tb-icon" />
                    </motion.div>
                    <motion.div variants={itemVariants} className="relative tb-slot tb-slot-tall tb-slot-memenu shrink-0">
                        <img src={memenuBgImg} alt="" className="tb-memenu-bg" />
                        <AnimatePresence>
                            {touchLayout && isMeExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                    transition={ME_POPOVER_TRANSITION}
                                    className="pointer-events-auto fixed bottom-[calc(100%+10px)] left-1/2 z-[70] -translate-x-1/2"
                                >
                                    <ToolbarMeView setMeExpanded={setMeExpanded} useGuideTool={useGuideTool} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <motion.div
                            className="tb-memenu-avatar"
                            onClick={(event) =>
                            {
                                setMeExpanded((value) => !value);
                                event.stopPropagation();
                            }}
                        >
                            <LayoutAvatarImageView airMeMenu={true} direction={3} figure={userFigure} />
                        </motion.div>
                        <img src={memenuCircleImg} alt="" className="tb-memenu-circle" />
                        {unseenProgMenuCount > 0 && (
                            <LayoutItemCountView count={unseenProgMenuCount} className="pointer-events-none absolute -right-1 -top-1 z-10" />
                        )}
                    </motion.div>
                    {isInRoom && (
                        <motion.div variants={itemVariants} className="relative">
                            <ToolbarItemView icon="inventory" onClick={() => CreateLinkEvent('inventory/toggle')} className="tb-icon" />
                            {getFullCount > 0 && <LayoutItemCountView count={getFullCount} className="absolute -right-1 top-0" />}
                        </motion.div>
                    )}
                </motion.div>
                <motion.div variants={containerVariants} className="tb-bar-scroll flex h-full items-center gap-2 overflow-x-auto overflow-y-visible px-1">
                    {isInRoom && showToolbarButton && (
                        <motion.div variants={itemVariants}>
                            <ToolbarItemView icon="wired-tools" onClick={openMonitor} className="tb-icon" />
                        </motion.div>
                    )}
                    {isInRoom && youtubeEnabled && (
                        <motion.div variants={itemVariants}>
                            <ToolbarItemView icon="youtube" onClick={openYouTubePlayer} className="tb-icon" />
                        </motion.div>
                    )}
                    {isInRoom && buildHeightAvailable && (
                        <motion.div variants={itemVariants}>
                            <ToolbarItemView icon="buildheight" onClick={toggleBuildHeight} className="tb-icon" />
                        </motion.div>
                    )}
                    {/* On narrow desktop windows the social icons live in the
                         left side stack — only real touch devices get them here. */}
                    {!socialInSideStack && (
                        <motion.div variants={itemVariants} className="relative">
                            <ToolbarItemView icon="friendall" onClick={() => CreateLinkEvent('friends/toggle')} className="tb-icon" />
                            {requests.length > 0 && <LayoutItemCountView count={requests.length} className="absolute -right-2 -top-1" />}
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
            {/* Mobile side tools — moved out of the bottom bar into a
                 vertical pill stack on the left edge so the bottom bar has
                 room. Camera in-room and the staff-only tools when
                 permitted. */}
            <motion.div
                initial="visible"
                animate={visibilityVariant}
                variants={mobileNavVariants}
                transition={NAV_TRANSITION}
                style={staffStackBottom != null ? { top: 'auto', bottom: `${staffStackBottom}px` } : undefined}
                className={`absolute left-1 z-[71] flex flex-col items-center gap-[2px] bg-[#55534e] px-[2px] py-[4px] ${staffStackBottom == null ? 'top-1/2 -translate-y-1/2' : ''} ${sideStackClasses}`}
            >
                {cameraAvailable && (
                    <motion.div variants={itemVariants}>
                        <ToolbarItemView icon="camera" onClick={() => CreateLinkEvent('camera/toggle')} className="tb-icon" />
                    </motion.div>
                )}
                {isMod && (
                    <motion.div variants={itemVariants} className="relative">
                        <ToolbarItemView icon="modtools" onClick={() => CreateLinkEvent('mod-tools/show')} className="tb-icon" />
                        {openTicketsCount > 0 && <LayoutItemCountView count={openTicketsCount} className="pointer-events-none absolute -right-1 -top-1 z-10" />}
                    </motion.div>
                )}
                {isHk && hkEnabled && (
                    <motion.div variants={itemVariants}>
                        <ToolbarItemView icon="housekeeping" onClick={() => CreateLinkEvent('housekeeping/toggle')} className="tb-icon" />
                    </motion.div>
                )}
                {/* Below the compact breakpoint the right rail's social icons
                     live in the stack — on narrow desktop windows too, so they
                     don't jump back into the bottom bar. Real touch devices
                     keep friends in the mobile bar instead. */}
                {socialInSideStack && (
                    <motion.div variants={itemVariants} className="relative">
                        <ToolbarItemView icon="friendall" onClick={() => CreateLinkEvent('friends/toggle')} className="tb-icon" />
                        {requests.length > 0 && <LayoutItemCountView count={requests.length} className="pointer-events-none absolute -right-1 -top-1 z-10" />}
                    </motion.div>
                )}
                {socialInSideStack && (
                    <motion.div variants={itemVariants}>
                        <ToolbarItemView icon="friendsearch" onClick={() => SendMessageComposer(new FindNewFriendsMessageComposer())} className="tb-icon" />
                    </motion.div>
                )}
                {socialInSideStack && (iconState === MessengerIconState.SHOW || iconState === MessengerIconState.UNREAD) && (
                    <motion.div variants={itemVariants}>
                        <ToolbarItemView
                            className={`tb-icon ${iconState === MessengerIconState.UNREAD ? (messengerNotifyFrame === 1 ? 'is-notify-1' : 'is-notify-0') : ''}`}
                            icon="message"
                            onClick={() => OpenMessengerChat()}
                        />
                    </motion.div>
                )}
            </motion.div>
        </>
    );
};
