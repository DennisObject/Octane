import {
    AddLinkEventTracker,
    ClaimAllEarningsRewardsComposer,
    ClaimEarningsRewardComposer,
    EarningsCenterEvent,
    EarningsClaimResultEvent,
    GetCommunication,
    GetSessionDataManager,
    IEarningsEntry,
    IEarningsReward,
    ILinkEventTracker,
    OctaneEventType,
    RemoveLinkEventTracker,
    RequestEarningsCenterComposer
} from '@octane/renderer';
import { CSSProperties, FC, ReactElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import imgAchievements from '../../assets/images/vault/achievements.png';
import imgBonusbag from '../../assets/images/vault/bonusbag.png';
import imgDailygift from '../../assets/images/vault/dailygift.png';
import imgDonations from '../../assets/images/vault/donations.png';
import imgCredit from '../../assets/images/vault/earnings-credit.png';
import imgDucket from '../../assets/images/vault/earnings-ducket.png';
import imgPresent from '../../assets/images/vault/earnings-present.png';
import imgGames from '../../assets/images/vault/games.png';
import imgGeneric from '../../assets/images/vault/generic.png';
import imgHcpayday from '../../assets/images/vault/hcpayday.png';
import imgLevel from '../../assets/images/vault/levelprogression.png';
import imgMarketplace from '../../assets/images/vault/marketplace.png';
import imgSurprise from '../../assets/images/vault/surprise.png';
import { LayoutCurrencyIcon, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { useMessageEvent, useNotification, useOctaneEvent, usePurse } from '../../hooks';

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

// A native slot of a row: duckets and credits are the two fixed icons of vault_view_xml, the product slot counts bonus-bag style items.
type SlotKind = 'pixels' | 'credits' | 'product';

interface EarningCategory {
    // Wire categoryKey — MUST match the emulator contract
    // (emulatore/docs/earnings-packet-contract.md).
    key: string;
    // Standard gamedata localization key (ExternalTexts). 'label' is only the
    // fallback shown when the key is missing in the active texts.
    textKey: string;
    label: string;
    img: string;
    // The slots vault_view_xml lays out for the matching v75 row.
    slots: SlotKind[];
    // The Plus backend has these rows with no v75 counterpart (Club & Work) or with a v75 condition (Games).
    isBackendOnly?: boolean;
    needsGameEarnings?: boolean;
}

// vault_view_xml order (dailygift, games, achievements, marketplace, habboclub, levelprogression, donation, bonusbag, surprise). The categories are the Plus
// backend's keys; 'club_job' has no v75 row and stays a labelled backend row so no earned reward is hidden. Amounts and claimable state come from the
// server (EarningsCenterEvent).
const CATEGORIES: EarningCategory[] = [
    { key: 'daily_gift', textKey: 'earnings.dailygift.label', label: 'Daily gift', img: imgDailygift, slots: ['pixels'] },
    { key: 'games', textKey: 'earnings.games.label', label: 'Games', img: imgGames, slots: ['credits'], needsGameEarnings: true },
    { key: 'achievements', textKey: 'earnings.achievements.label', label: 'Achievements', img: imgAchievements, slots: ['pixels', 'credits'] },
    { key: 'marketplace', textKey: 'earnings.marketplace.label', label: 'Marketplace', img: imgMarketplace, slots: ['credits'] },
    { key: 'hc_payday', textKey: 'earnings.hc.label', label: 'HC payday bonus', img: imgHcpayday, slots: ['credits'] },
    { key: 'level_progress', textKey: 'earnings.levelprogression.label', label: 'Level progression', img: imgLevel, slots: ['pixels', 'credits'] },
    { key: 'donations', textKey: 'earnings.donations.label', label: 'Donations', img: imgDonations, slots: ['credits'] },
    { key: 'bonus_bag', textKey: 'earnings.bonusbag.label', label: 'Bonus bag', img: imgBonusbag, slots: ['product'] },
    { key: 'mystery_boxes', textKey: 'earnings.surpriseboxes.label', label: 'Surprise boxes', img: imgSurprise, slots: ['pixels', 'credits'] },
    { key: 'club_job', textKey: 'earnings.clubwork.label', label: 'Club & Work', img: imgGeneric, slots: ['credits'], isBackendOnly: true }
];

interface Slot {
    id: string;
    amount: number;
    icon: ReactElement;
}

const nativeIcon = (src: string, size: number, className = '') => (
    <img alt="" className={`octane-vault__icon ${className}`} draggable={false} height={size} src={src} width={size} />
);

// A reward that a native slot does not cover (diamonds, HC days, a currency the v75 row has no slot for) keeps its own slot, so nothing earned is hidden.
const extraRewardIcon = (reward: IEarningsReward): ReactElement | null =>
{
    switch (reward.type)
    {
        case 'credits':
            return nativeIcon(imgCredit, 22);
        case 'pixels':
            return nativeIcon(imgDucket, 22);
        case 'points':
            return <LayoutCurrencyIcon type={reward.pointsType} />;
        case 'hc_days':
            return <LayoutCurrencyIcon type="hc" />;
        default:
            return nativeIcon(imgPresent, 24, 'is-product');
    }
};

const MAX_SLOTS = 3;

const buildSlots = (category: EarningCategory, rewards: IEarningsReward[]): Slot[] =>
{
    const slots: Slot[] = category.slots.map((kind) =>
    {
        if (kind === 'pixels')
            return {
                id: kind,
                amount: rewards.filter((reward) => reward.type === 'pixels').reduce((sum, reward) => sum + reward.amount, 0),
                icon: nativeIcon(imgDucket, 22)
            };
        if (kind === 'credits')
            return {
                id: kind,
                amount: rewards.filter((reward) => reward.type === 'credits').reduce((sum, reward) => sum + reward.amount, 0),
                icon: nativeIcon(imgCredit, 22)
            };

        return {
            id: kind,
            amount: rewards.filter((reward) => reward.type === 'badge' || reward.type === 'item').length,
            icon: nativeIcon(imgPresent, 24, 'is-product')
        };
    });
    const covered = new Set<string>(category.slots.flatMap((kind) => (kind === 'product' ? ['badge', 'item'] : [kind])));
    const extra = new Map<string, Slot>();

    for (const reward of rewards)
    {
        if (covered.has(reward.type)) continue;

        const id = `${reward.type}:${reward.pointsType}`;
        const known = extra.get(id);

        if (known) known.amount += reward.amount;
        else extra.set(id, { id, amount: reward.amount, icon: extraRewardIcon(reward) });
    }

    const all = [...slots, ...extra.values()];

    // The row has room for three slots before the Claim button; any further reward types are counted on one present slot instead of being drawn under it.
    if (all.length <= MAX_SLOTS) return all;

    const folded = all.slice(MAX_SLOTS - 1);
    const count = rewards.filter((reward) => folded.some((slot) => slot.id === reward.type || slot.id === `${reward.type}:${reward.pointsType}` || (slot.id === 'product' && (reward.type === 'badge' || reward.type === 'item')))).length;

    return [...all.slice(0, MAX_SLOTS - 1), { id: 'more', amount: count, icon: nativeIcon(imgPresent, 24, 'is-product') }];
};

const ducketsOf = (entry: IEarningsEntry | null) =>
    (entry?.rewards ?? []).filter((reward) => reward.type === 'pixels').reduce((sum, reward) => sum + reward.amount, 0);

const WINDOW_WIDTH = 422;
const ROW_PITCH = 37;
// vault_view_xml: 422x536 for twelve rows, 37px per row; the window is as tall as the rows it shows.
const windowHeight = (rows: number) => 92 + ROW_PITCH * rows;

/** static_bitmap 32x32 at (1,1): the bitmap sits in the middle of it, rounded down. */
const CategoryIcon: FC<{ src: string }> = ({ src }) =>
{
    const [size, setSize] = useState<[number, number]>([32, 32]);

    return (
        <img
            alt=""
            className="octane-vault__category-icon"
            draggable={false}
            src={src}
            style={{ left: -4 + Math.floor((32 - size[0]) / 2), top: -4 + Math.floor((32 - size[1]) / 2) }}
            onLoad={(event) => setSize([event.currentTarget.naturalWidth, event.currentTarget.naturalHeight])}
        />
    );
};

interface VaultButtonProps {
    label: string;
    disabled: boolean;
    kind: 'claim' | 'claim-all';
    style: CSSProperties;
    onClick: () => void;
}

/** button (shiny, 60x28) and button_thick (shiny thick, 73x30): the label is a v75 raster over the skin. */
const VaultButton: FC<VaultButtonProps> = ({ label, disabled, kind, style, onClick }) => (
    <button className={`octane-vault__button is-${kind}`} disabled={disabled} style={style} type="button" onClick={onClick}>
        <NativeText
            background={0xffffff}
            className="octane-vault__button-label"
            overrides={disabled ? { color: 0x777777 } : undefined}
            text={label}
            textStyle={kind === 'claim' ? 'u_regular' : 'u_bold'}
        />
    </button>
);

export const VaultView: FC<{}> = () =>
{
    const [isVisible, setIsVisible] = useState(false);
    const [entries, setEntries] = useState<IEarningsEntry[]>([]);
    const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
    const pendingRef = useRef<ReadonlySet<string>>(pending);
    const entriesRef = useRef<IEarningsEntry[]>(entries);
    const isVisibleRef = useRef(isVisible);
    // Bumped whenever the window opens or closes: a confirm dialog or a captured callback from an earlier opening must not send anything.
    const openIdRef = useRef(0);
    // The categories a claim-all covers; it is released once every one of them answered.
    const allExpectedRef = useRef<Set<string>>(new Set());
    const { getCurrencyAmount } = usePurse();
    const { showConfirm = null } = useNotification();
    const getCurrencyRef = useRef(getCurrencyAmount);

    // Read by callbacks that run after a click or a confirm dialog; refreshed before any of them can run.
    useLayoutEffect(() =>
    {
        getCurrencyRef.current = getCurrencyAmount;
        pendingRef.current = pending;
        entriesRef.current = entries;
    });

    const entriesByKey = useMemo(() =>
    {
        const map = new Map<string, IEarningsEntry>();
        for (const entry of entries) map.set(entry.categoryKey, entry);
        return map;
    }, [entries]);

    // Games stays hidden like v75 unless wired.game_earnings is on; a games entry that holds rewards is shown anyway.
    const showGames = GetConfigurationValue<boolean>('wired.game_earnings', false);
    const visibleCategories = useMemo(
        () => CATEGORIES.filter((category) =>
        {
            const entry = entriesByKey.get(category.key);

            // A row v75 does not have is shown only while the backend really holds something in it.
            if (category.isBackendOnly) return !!entry && (entry.rewards.length > 0 || entry.claimable);

            return !category.needsGameEarnings || showGames || (entry?.rewards.length ?? 0) > 0;
        }),
        [entriesByKey, showGames]
    );

    const claimable = useCallback((entry: IEarningsEntry | undefined) => !!entry && entry.enabled && entry.claimable, []);
    const anyClaimable = useMemo(() => entries.some((entry) => claimable(entry) && !pending.has(entry.categoryKey)), [entries, pending, claimable]);

    useMessageEvent<EarningsCenterEvent>(
        EarningsCenterEvent,
        useCallback((event: EarningsCenterEvent) =>
        {
            const parser = event.getParser();
            if (!parser) return;
            setEntries(parser.entries ?? []);
        }, [])
    );

    const commitPending = useCallback((next: ReadonlySet<string>) =>
    {
        pendingRef.current = next;
        setPending(next);
    }, []);

    // Every way of opening or closing goes through here so the refs a captured callback reads change in the same task as the click, not after the next commit.
    const changeVisibility = useCallback((next: boolean | ((current: boolean) => boolean)) =>
    {
        const value = typeof next === 'function' ? next(isVisibleRef.current) : next;

        if (value === isVisibleRef.current) return;

        isVisibleRef.current = value;
        openIdRef.current += 1;
        setIsVisible(value);

        // A closed window forgets claims that were in flight.
        if (!value)
        {
            allExpectedRef.current = new Set();
            commitPending(new Set());
        }
    }, [commitPending]);

    // A dropped connection ends every dialog that was asked before it, even when the same user comes back.
    useOctaneEvent(
        OctaneEventType.CONNECTION_STATE_CHANGED,
        useCallback(() =>
        {
            if (GetCommunication().connection.connectionState.phase === 'connected') return;

            openIdRef.current += 1;
            allExpectedRef.current = new Set();
            commitPending(new Set());
        }, [commitPending])
    );

    // A claim result releases the buttons it covers: a refused claim re-enables them, a successful one zeroes the entry (the server's refreshed entry wins).
    useMessageEvent<EarningsClaimResultEvent>(
        EarningsClaimResultEvent,
        useCallback((event: EarningsClaimResultEvent) =>
        {
            const parser = event.getParser();
            if (!parser) return;

            setEntries((prev) =>
            {
                const next = prev.slice();

                for (const result of parser.results)
                {
                    if (result.hasEntry && result.entry)
                    {
                        const idx = next.findIndex((e) => e.categoryKey === result.entry.categoryKey);
                        if (idx >= 0) next[idx] = result.entry;
                        else next.push(result.entry);
                    }
                    else if (result.success)
                    {
                        // No refreshed entry but the claim worked — mark it spent.
                        const idx = next.findIndex((e) => e.categoryKey === result.categoryKey);
                        if (idx >= 0) next[idx] = { ...next[idx], claimable: false, rewards: [] };
                    }
                }

                return next;
            });

            const next = new Set(pendingRef.current);

            for (const result of parser.results)
            {
                next.delete(result.categoryKey);
                allExpectedRef.current.delete(result.categoryKey);
            }

            // A claim-all is released only by the answers for every category it covered; the packet contract has no aggregate marker, so a result
            // for a category it did not cover (or for no known category) never releases it. A window close/reopen or a dropped connection does.
            if (next.has('*') && allExpectedRef.current.size === 0) next.delete('*');

            commitPending(next);
        }, [commitPending])
    );

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if (parts.length < 3) return;
                if (parts[2] !== 'vault') return;

                switch (parts[1])
                {
                    case 'open':
                        changeVisibility(true);
                        return;
                    case 'close':
                        changeVisibility(false);
                        return;
                    case 'toggle':
                        changeVisibility((current) => !current);
                        return;
                }
            },
            eventUrlPrefix: 'habboUI/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [changeVisibility]);

    // Ask the server for fresh earnings every time the window opens.
    useEffect(() =>
    {
        if (isVisible) SendMessageComposer(new RequestEarningsCenterComposer());
    }, [isVisible]);

    // What a claim asked for: it only counts while the window is still the same opening, the same signed-in user and the same connection.
    const captureAsk = useCallback(() =>
    {
        const openId = openIdRef.current;
        const userId = GetSessionDataManager().userId;

        return () => isVisibleRef.current && openIdRef.current === openId && GetSessionDataManager().userId === userId;
    }, []);

    // v75 asks before a claim that would push the duckets over the soft limit (earning.exceeding_limit). The approval is for the numbers shown when it was
    // asked: if the earnings or the purse changed while the dialog was open, the claim asks again instead of sending under the old approval.
    const confirmDucketLimit = useCallback(
        (isCurrent: () => boolean, readDuckets: () => number, perform: () => void) =>
        {
            const ask = () =>
            {
                if (!isCurrent()) return;

                const softLimit = GetConfigurationValue<number>('duckets.soft_limit', 2147483647);
                const amount = readDuckets();
                const purse = getCurrencyRef.current(0);

                if (amount > 0 && amount + purse > softLimit)
                {
                    let isDone = false;

                    showConfirm(
                        localizeWithFallback(
                            'earning.exceeding_limit',
                            'You are exceeding the ducket limit by claiming these earnings. This means some duckets will be lost, are you sure you want to continue?'
                        ),
                        () =>
                        {
                            if (isDone) return;

                            isDone = true;

                            if (!isCurrent()) return;

                            if (readDuckets() !== amount || getCurrencyRef.current(0) !== purse)
                            {
                                ask();

                                return;
                            }

                            perform();
                        },
                        null,
                        null,
                        null,
                        LocalizeText('generic.alert.title')
                    );

                    return;
                }

                perform();
            };

            ask();
        },
        [showConfirm]
    );

    // The button is disabled the moment the claim is sent; the result (or closing the window) releases it. One claim-all or any row claim in flight blocks the others.
    const startPending = useCallback((key: string) =>
    {
        const current = pendingRef.current;

        if (key === '*' ? current.size > 0 : current.has(key) || current.has('*')) return false;

        const next = new Set(current);

        next.add(key);
        commitPending(next);

        return true;
    }, [commitPending]);

    // A confirmed claim runs later than the click: it only counts if it is still the asking opening/user/connection and the entry is still claimable.
    const claimOne = useCallback(
        (categoryKey: string) =>
        {
            const isCurrent = captureAsk();
            const find = () => entriesRef.current.find((entry) => entry.categoryKey === categoryKey);

            confirmDucketLimit(
                isCurrent,
                () => ducketsOf(find() ?? null),
                () =>
                {
                    if (!isCurrent() || !claimable(find())) return;
                    if (!startPending(categoryKey)) return;

                    SendMessageComposer(new ClaimEarningsRewardComposer(categoryKey));
                }
            );
        },
        [captureAsk, confirmDucketLimit, claimable, startPending]
    );

    const claimAll = useCallback(() =>
    {
        const isCurrent = captureAsk();
        const covered = () => entriesRef.current.filter((entry) => claimable(entry));

        confirmDucketLimit(
            isCurrent,
            () => covered().reduce((sum, entry) => sum + ducketsOf(entry), 0),
            () =>
            {
                const keys = covered().map((entry) => entry.categoryKey);

                if (!isCurrent() || !keys.length || !startPending('*')) return;

                allExpectedRef.current = new Set(keys);
                SendMessageComposer(new ClaimAllEarningsRewardsComposer());
            }
        );
    }, [captureAsk, confirmDucketLimit, claimable, startPending]);

    if (!isVisible) return null;

    const rowCount = visibleCategories.length;
    const height = windowHeight(rowCount);

    return (
        <OctaneCardView
            aria-label={localizeWithFallback('earnings.title', 'Earnings')}
            className="octane-vault"
            frameStyle={3}
            isResizable={false}
            role="dialog"
            style={{ '--vault-width': WINDOW_WIDTH + 'px', '--vault-height': height + 'px' } as CSSProperties}
            uniqueKey="vault"
        >
            <OctaneCardHeaderView headerText="" onCloseClick={() => changeVisibility(false)}>
                <NativeText
                    background={0x377998}
                    className="octane-vault__title"
                    overrides={{ color: 0xffffff }}
                    text={localizeWithFallback('earnings.title', 'Earnings')}
                    textStyle="u_frame_title"
                />
            </OctaneCardHeaderView>
            <div className="octane-vault-content">
                {visibleCategories.map((category, index) =>
                {
                    const entry = entriesByKey.get(category.key) ?? null;
                    const isPending = pending.has(category.key) || pending.has('*');
                    const canClaim = claimable(entry) && !isPending;
                    const slots = buildSlots(category, entry?.rewards ?? []);
                    const top = index * ROW_PITCH;
                    const label = localizeWithFallback(category.textKey, category.label);

                    return (
                        <div key={category.key} className="octane-vault__row" data-category={category.key} style={{ top }}>
                            <div className="octane-vault__extended" />
                            <div className="octane-vault__label">
                                <CategoryIcon src={category.img} />
                                <div className="octane-vault__label-text">
                                    <NativeText background={0xffffff} text={category.isBackendOnly ? `${label}` : label} textStyle="u_bold" />
                                </div>
                            </div>
                            {slots.map((slot, slotIndex) =>
                            {
                                const x = slots.length > 2 ? 8 + slotIndex * 48 : 15 + slotIndex * 70;

                                return (
                                    <div key={slot.id} className="octane-vault__slot" style={{ left: 179 + x }}>
                                        <span className="octane-vault__slot-icon">{slot.icon}</span>
                                        <div className="octane-vault__value" style={{ left: 25 }}>
                                            <NativeText
                                                background={0xbec3c1}
                                                overrides={{ size: 14, sharpness: 0, thickness: 0 }}
                                                text={String(slot.amount)}
                                                textStyle="u_bold"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            <VaultButton
                                disabled={!canClaim}
                                kind="claim"
                                label={localizeWithFallback('earnings.claim.button', 'Claim')}
                                style={{ left: 339, top: 4, width: 60, height: 28 }}
                                onClick={() => claimOne(category.key)}
                            />
                        </div>
                    );
                })}
                <VaultButton
                    disabled={!anyClaimable || pending.size > 0}
                    kind="claim-all"
                    label={localizeWithFallback('earning.claim_all', 'Claim All')}
                    style={{ left: 154, top: rowCount * ROW_PITCH + 8, width: 73, height: 30 }}
                    onClick={claimAll}
                />
            </div>
        </OctaneCardView>
    );
};
