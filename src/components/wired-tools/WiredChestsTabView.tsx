import {
    CHEST_LOG_FILTER_ALL,
    CHEST_LOG_FILTER_CURRENCY,
    CHEST_LOG_FILTER_FURNI,
    CHEST_TRANSACTION_SOURCE_WIRED,
    CHEST_TRANSACTION_WITHDRAW,
    FurnitureType,
    IWiredChestTransactionRow,
    RoomControllerLevel,
    WiredChestLockComposer,
    WiredChestLockStateEvent,
    WiredChestRoomLogsComposer,
    WiredChestRoomLogsEvent,
    WiredChestTransactionDetailsComposer,
    WiredChestTransactionDetailsEvent,
} from '@octane/renderer';
import { FC, Fragment, JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, ProductImageUtility, SendMessageComposer } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useMessageEvent, useNotification, useRoom } from '../../hooks';
import { WiredMenuButton, WiredMenuItem, WiredMenuPanel, WiredMenuTable, WiredMenuText } from './WiredMenuParts';

/** Rows per request. The preview and the detail window share one page size, so one response shape
 * serves both and there is never a question of which request a page belongs to. */
const PAGE_SIZE = 10;

/** Matches the official tab: the preview refreshes on its own while it is the visible tab. */
const POLL_MS = 20000;

/** The official tab greys the lock buttons briefly after a click so a double click cannot fire twice. */
const LOCK_COOLDOWN_MS = 500;

interface TransactionDetail {
    items: { spriteId: number; quantity: number }[];
}

const FILTERS = [
    { value: CHEST_LOG_FILTER_ALL, key: 'wiredmenu.chests.room_logs.furni_and_coins', fallback: 'Furni and coins' },
    { value: CHEST_LOG_FILTER_CURRENCY, key: 'wiredmenu.chests.room_logs.only_coins', fallback: 'Only coins' },
    { value: CHEST_LOG_FILTER_FURNI, key: 'wiredmenu.chests.room_logs.only_furni', fallback: 'Only furni' },
];

const formatTimestamp = (seconds: number): string => (seconds > 0 ? new Date(seconds * 1000).toLocaleString() : '-');

export const WiredChestsTabView: FC<{}> = () => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();

    const [filter, setFilter] = useState(CHEST_LOG_FILTER_ALL);
    const [rows, setRows] = useState<IWiredChestTransactionRow[]>([]);
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [expandedId, setExpandedId] = useState(0);
    const [details, setDetails] = useState<Record<number, TransactionDetail>>({});

    const [lockBusy, setLockBusy] = useState(false);
    const [lockResult, setLockResult] = useState('');
    /** Zero means the whole room. A room with a dozen chests makes a log nobody can read. */
    const [onlyChestId, setOnlyChestId] = useState(0);

    // The detail window drives paging; while it is open the preview must not poll page 1 out from
    // under it. Held in a ref so the interval effect does not restart on every open/close.
    const detailsOpenRef = useRef(false);
    detailsOpenRef.current = detailsOpen;

    const canManageOwn = !!roomSession && (roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.GUEST);
    const canManageAll = !!roomSession?.isRoomOwner;

    const requestPage = useCallback(
        (nextPage: number, nextFilter: number, chestId = onlyChestId) => {
            SendMessageComposer(new WiredChestRoomLogsComposer(PAGE_SIZE, nextPage, nextFilter, chestId));
        },
        [onlyChestId],
    );

    useEffect(() => {
        requestPage(1, filter);
    }, [filter, requestPage]);

    useEffect(() => {
        const handle = window.setInterval(() => {
            if (detailsOpenRef.current) return;

            requestPage(1, filter);
        }, POLL_MS);

        return () => window.clearInterval(handle);
    }, [filter, requestPage]);

    useMessageEvent<WiredChestRoomLogsEvent>(WiredChestRoomLogsEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        setRows(parser.rows);
        setPage(parser.page);
        setPageCount(parser.pageCount);
        setTotalRows(parser.totalRows);
        setFilter(parser.filter);
        setLoaded(true);
    });

    useMessageEvent<WiredChestLockStateEvent>(WiredChestLockStateEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        if (!parser.affected) {
            setLockResult(
                localizeWithFallback(
                    'wiredmenu.chests.chest_control.result.none',
                    'Nothing changed - the chests were already in that state.',
                ),
            );
            return;
        }

        setLockResult(
            localizeWithFallback(
                parser.locked ? 'wiredmenu.chests.chest_control.result.locked' : 'wiredmenu.chests.chest_control.result.unlocked',
                parser.locked ? '%count% chests locked.' : '%count% chests unlocked.',
                ['count'],
                [String(parser.affected)],
            ),
        );
    });

    useMessageEvent<WiredChestTransactionDetailsEvent>(WiredChestTransactionDetailsEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        setDetails((prev) => ({ ...prev, [parser.transactionId]: { items: parser.items } }));
    });

    const sendLock = useCallback(
        (lock: boolean, all: boolean) => {
            if (lockBusy) return;

            setLockBusy(true);
            setLockResult('');
            SendMessageComposer(new WiredChestLockComposer(lock, all));
            window.setTimeout(() => setLockBusy(false), LOCK_COOLDOWN_MS);
        },
        [lockBusy],
    );

    const lockEveryChest = useCallback(() => {
        if (!canManageAll || !showConfirm) return;

        showConfirm(
            localizeWithFallback(
                'wiredmenu.chests.chest_control.lock_all.warning.desc',
                'This locks every chest in the room, including the ones other people own. Wired keeps working - only what people do by hand stops.',
            ),
            () => sendLock(true, true),
            () => {
                // nothing to undo: the confirm was declined before anything was sent
            },
            null,
            null,
            localizeWithFallback('wiredmenu.chests.chest_control.lock_all.warning.title', 'Lock every chest'),
        );
    }, [canManageAll, sendLock, showConfirm]);

    const toggleDetail = useCallback(
        (transactionId: number, hasDetails: boolean) => {
            if (expandedId === transactionId) {
                setExpandedId(0);
                return;
            }

            setExpandedId(transactionId);
            if (hasDetails && !details[transactionId]) SendMessageComposer(new WiredChestTransactionDetailsComposer(transactionId));
        },
        [details, expandedId],
    );

    const closeDetails = useCallback(() => {
        setDetailsOpen(false);
        setExpandedId(0);
        requestPage(1, filter);
    }, [filter, requestPage]);

    const previewRows = useMemo(() => (page === 1 ? rows : []), [page, rows]);

    const typeLabel = (row: IWiredChestTransactionRow) =>
        row.type === CHEST_TRANSACTION_WITHDRAW
            ? localizeWithFallback('wiredchests.logs.type.withdraw', 'Withdrawal')
            : localizeWithFallback('wiredchests.logs.type.deposit', 'Deposit');

    const sourceLabel = (row: IWiredChestTransactionRow) =>
        row.source === CHEST_TRANSACTION_SOURCE_WIRED
            ? localizeWithFallback('wiredchests.logs.source.wired', 'Wired')
            : localizeWithFallback('wiredchests.logs.source.user', 'Player');

    const renderDetailItems = (transactionId: number, hasDetails: boolean) => {
        const detail = details[transactionId];

        if (!hasDetails || (detail && !detail.items.length)) {
            return (
                <div className="text-[11px] text-[#6b6659]">
                    {localizeWithFallback('wiredchests.log_details.incomplete_data', 'No furni recorded for this transaction.')}
                </div>
            );
        }

        if (!detail) return <div className="text-[11px] text-[#6b6659]">...</div>;

        return (
            <div className="flex flex-wrap gap-2">
                {detail.items.map((item) => (
                    <div key={item.spriteId} className="flex items-center gap-1 border border-[#d1ccbf] rounded bg-white px-1 py-[2px]">
                        <img
                            alt=""
                            className="max-h-[28px] max-w-[28px] object-contain"
                            src={ProductImageUtility.getProductImageUrl(FurnitureType.FLOOR, item.spriteId, '')}
                        />
                        <span className="text-[11px] tabular-nums">x{item.quantity}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            <WiredMenuItem h={17} w={84} x={14} y={18}>
                <span className="octane-wired-menu__text octane-wired-menu__text--bold">Chest control:</span>
            </WiredMenuItem>
            <WiredMenuPanel h={90} w={472} x={14} y={38}>
                <WiredMenuButton disabled={!canManageOwn || lockBusy} h={30} w={221} x={10} y={10} onClick={() => sendLock(true, false)}>
                    Lock all your chests
                </WiredMenuButton>
                <WiredMenuButton disabled={!canManageOwn || lockBusy} h={30} w={221} x={241} y={10} onClick={() => sendLock(false, false)}>
                    Unlock all your chests
                </WiredMenuButton>
                <WiredMenuButton disabled={!canManageAll || lockBusy} h={30} w={221} x={10} y={50} onClick={lockEveryChest}>
                    Lock all chests
                </WiredMenuButton>
                {!!lockResult && (
                    <WiredMenuText h={19} w={221} x={241} y={55}>
                        {lockResult}
                    </WiredMenuText>
                )}
            </WiredMenuPanel>
            <WiredMenuItem h={17} w={136} x={14} y={139}>
                <span className="octane-wired-menu__text octane-wired-menu__text--bold">Room Transaction Logs:</span>
            </WiredMenuItem>
            <WiredMenuItem h={17} w={197} x={286} y={139}>
                {onlyChestId ? (
                    <button className="octane-wired-menu__link octane-wired-menu__text" type="button" onClick={() => setOnlyChestId(0)}>
                        {localizeWithFallback('wiredmenu.chests.room_logs.show_all_chests', 'All chests')}
                    </button>
                ) : (
                    <span className="octane-wired-menu__text octane-wired-menu__text--soft">PREVIEW - showing 10 most recent</span>
                )}
            </WiredMenuItem>
            <WiredMenuTable
                columns={[
                    { key: 'type', title: 'Type', factor: 0.28 },
                    { key: 'username', title: 'Username', factor: 0.24 },
                    { key: 'withdraws', title: 'Withdrawals', factor: 0.24 },
                    { key: 'deposits', title: 'Deposits', factor: 0.24 }
                ]}
                emptyText={loaded ? 'Nothing to display' : ''}
                h={168}
                rows={previewRows.map((row) => ({
                    key: String(row.transactionId),
                    cells: { type: typeLabel(row), username: row.userName || sourceLabel(row), withdraws: row.withdrawn || '-', deposits: row.deposited || '-' }
                }))}
                w={472}
                x={14}
                y={159}
            />
            <WiredMenuButton disabled={!totalRows} h={30} w={114} x={14} y={336} onClick={() => setDetailsOpen(true)}>
                View detailed list
            </WiredMenuButton>

            {detailsOpen && (
                <WiredChestTransactionsWindow
                    expandedId={expandedId}
                    page={page}
                    pageCount={pageCount}
                    renderDetailItems={renderDetailItems}
                    rows={rows}
                    sourceLabel={sourceLabel}
                    typeLabel={typeLabel}
                    onClose={closeDetails}
                    onFilterChest={setOnlyChestId}
                    onPage={(nextPage) => requestPage(nextPage, filter)}
                    onToggleDetail={toggleDetail}
                />
            )}
        </>
    );
};

interface WiredChestTransactionsWindowProps {
    rows: IWiredChestTransactionRow[];
    page: number;
    pageCount: number;
    expandedId: number;
    typeLabel: (row: IWiredChestTransactionRow) => string;
    sourceLabel: (row: IWiredChestTransactionRow) => string;
    renderDetailItems: (transactionId: number, hasDetails: boolean) => JSX.Element;
    onClose: () => void;
    onPage: (page: number) => void;
    onToggleDetail: (transactionId: number, hasDetails: boolean) => void;
    /** Narrow the whole log to one chest. A room full of chests logs more than anyone can read. */
    onFilterChest: (chestId: number) => void;
}

/**
 * The "view in detail" window: the same log, paged, with the chest and timestamp columns the preview
 * has no room for and a per-row breakdown of the furni that moved.
 */
const WiredChestTransactionsWindow: FC<WiredChestTransactionsWindowProps> = (props) => {
    const {
        rows,
        page,
        pageCount,
        expandedId,
        typeLabel,
        sourceLabel,
        renderDetailItems,
        onClose,
        onPage,
        onToggleDetail,
        onFilterChest,
    } = props;

    return (
        <OctaneCardView className="min-w-[720px] max-w-[720px]" theme="primary-slim" uniqueKey="wired-chest-transactions">
            <OctaneCardHeaderView
                headerText={localizeWithFallback('wiredchests.logs.room_title', 'Room transactions')}
                onCloseClick={onClose}
            />
            <OctaneCardContentView>
                <div className="flex flex-col gap-2">
                    <div className="max-h-[320px] overflow-y-auto border border-[#d1ccbf] rounded bg-white">
                        <table className="w-full text-[12px]">
                            <thead className="bg-[#efede5] sticky top-0">
                                <tr>
                                    <th className="text-left px-2 py-1">{localizeWithFallback('wiredchests.logs.col.chests', 'Chest')}</th>
                                    <th className="text-left px-2 py-1">
                                        {localizeWithFallback('wiredchests.logs.col.timestamp', 'Timestamp')}
                                    </th>
                                    <th className="text-left px-2 py-1">{localizeWithFallback('wiredchests.logs.col.type', 'Type')}</th>
                                    <th className="text-left px-2 py-1">
                                        {localizeWithFallback('wiredchests.logs.col.source', 'Source')}
                                    </th>
                                    <th className="text-left px-2 py-1">
                                        {localizeWithFallback('wiredchests.logs.col.username', 'Username')}
                                    </th>
                                    <th className="text-right px-2 py-1">
                                        {localizeWithFallback('wiredchests.logs.col.withdraws', 'Withdrawals')}
                                    </th>
                                    <th className="text-right px-2 py-1">
                                        {localizeWithFallback('wiredchests.logs.col.deposits', 'Deposits')}
                                    </th>
                                    <th className="text-right px-2 py-1">
                                        {localizeWithFallback('wiredchests.logs.col.details', 'Details')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <Fragment key={row.transactionId}>
                                        <tr className="border-t border-[#e4e0d5]">
                                            <td className="px-2 py-1 tabular-nums">
                                                <button
                                                    type="button"
                                                    className="underline decoration-dotted"
                                                    title={localizeWithFallback(
                                                        'wiredmenu.chests.room_logs.only_this_chest',
                                                        'Only this chest',
                                                    )}
                                                    onClick={() => onFilterChest(row.chestId)}
                                                >
                                                    {row.chestId}
                                                </button>
                                            </td>
                                            <td className="px-2 py-1">{formatTimestamp(row.timestamp)}</td>
                                            <td className="px-2 py-1">{typeLabel(row)}</td>
                                            <td className="px-2 py-1">{sourceLabel(row)}</td>
                                            <td className="px-2 py-1">{row.userName || '-'}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{row.withdrawn || '-'}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{row.deposited || '-'}</td>
                                            <td className="px-2 py-1 text-right">
                                                <button
                                                    className="rounded border border-[#7f7f7f] bg-[#ece9e1] px-2 py-[1px] text-[11px] text-[#333] hover:bg-[#e3ded2]"
                                                    type="button"
                                                    onClick={() => onToggleDetail(row.transactionId, row.hasDetails)}
                                                >
                                                    {expandedId === row.transactionId ? '-' : '+'}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === row.transactionId && (
                                            <tr className="bg-[#f7f5ee]">
                                                <td className="px-2 py-2" colSpan={8}>
                                                    {renderDetailItems(row.transactionId, row.hasDetails)}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <Button disabled={page <= 1} variant="secondary" onClick={() => onPage(page - 1)}>
                            {localizeWithFallback('wiredchests.logs.previous', 'Previous')}
                        </Button>
                        <span className="text-[11px] text-[#6b6659] tabular-nums">
                            {localizeWithFallback(
                                'wiredchests.logs.page',
                                'Page %page% of %pages%',
                                ['page', 'pages'],
                                [String(page), String(pageCount)],
                            )}
                        </span>
                        <Button disabled={page >= pageCount} variant="secondary" onClick={() => onPage(page + 1)}>
                            {localizeWithFallback('wiredchests.logs.next', 'Next')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
