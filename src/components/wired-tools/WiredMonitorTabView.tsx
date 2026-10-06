import { localizeWithFallback } from '../../api';
import monitorElementOne from '../../assets/images/wired/native/menu_monitor_1.png';
import monitorElementTwo from '../../assets/images/wired/native/menu_monitor_2.png';
import { ClassicScrollAreaView } from '../../common';
import { MONITOR_COLOR_GREEN } from './WiredCreatorTools.constants';
import { MonitorLog, MonitorStat } from './WiredCreatorTools.types';
import { WiredMenuButton, WiredMenuItem, WiredMenuPanel, WiredMenuTable, WiredMenuTitle } from './WiredMenuParts';

export interface WiredMonitorTabViewProps {
    /** Room stats and error logs have not arrived yet (WiredMenuDefaultTab loading_view). */
    loading: boolean;
    /** Wired write permission; the official tab disables "Clear all" without it. */
    canClear: boolean;
    monitorStats: MonitorStat[];
    monitorLogs: MonitorLog[];
    /** Unused by the official layout; kept so the custom monitor history window keeps its entry point. */
    monitorHistoryRows: { id: string }[];
    onOpenMonitorInfo: () => void;
    onOpenMonitorHistory: () => void;
    /** Opens the room's paged wired log window. */
    onOpenRoomLogs: () => void;
    onClearMonitorLogs: () => void;
    /** Opens the error information window for a log type; every row links to it, as officially. */
    onOpenMonitorErrorInfo: (type: string, category: string) => void;
}

/** The "Monitor" tab (monitor_container of wired_menu_view): statistics, the monitor picture and the error log table. */
export const WiredMonitorTabView = (props: WiredMonitorTabViewProps) => {
    const { loading, canClear, monitorStats, monitorLogs, onOpenRoomLogs, onClearMonitorLogs, onOpenMonitorErrorInfo } = props;
    // updateImageUI: Frank panics on a heavy room, any non-green figure or any thrown error; image 2 is the layout default.
    const panicking = loading || monitorStats.some((stat) => stat.color && stat.color !== MONITOR_COLOR_GREEN) || monitorLogs.some((log) => log.amount !== '0');

    return (
        <>
            <WiredMenuTitle h={19} w={106} x={14} y={18}>
                {localizeWithFallback('wiredmenu.monitor.statistics', 'Statistics:')}
            </WiredMenuTitle>
            <WiredMenuPanel h={99} w={204} x={14} y={38}>
                {/* scrollable_itemlist_vertical 197x89, items 16px high with a spacing of 2. */}
                <WiredMenuItem h={89} w={197} x={5} y={5}>
                    <ClassicScrollAreaView className="size-full" scrollStep={18}>
                        {monitorStats.map((stat) => (
                            <div key={stat.label} className="octane-wired-menu__text octane-wired-menu__stat">
                                {stat.label}
                                {stat.value && (
                                    <>
                                        {' '}
                                        <span style={stat.color ? { color: `#${stat.color}` } : undefined}>{stat.value}</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </ClassicScrollAreaView>
                </WiredMenuItem>
            </WiredMenuPanel>
            <WiredMenuItem className="octane-wired-menu__monitor-image" h={145} w={256} x={230} y={4}>
                <img alt="" draggable={false} src={panicking ? monitorElementTwo : monitorElementOne} />
            </WiredMenuItem>
            <WiredMenuTitle h={19} w={106} x={14} y={152}>
                {localizeWithFallback('wiredmenu.monitor.log', 'Logs:')}
            </WiredMenuTitle>
            <WiredMenuTable
                columns={[
                    { key: 'type', title: localizeWithFallback('wiredmenu.monitor.column.type', 'Type'), factor: 0.33 },
                    { key: 'category', title: localizeWithFallback('wiredmenu.monitor.column.category', 'Category'), factor: 0.22 },
                    { key: 'amount', title: localizeWithFallback('wiredmenu.monitor.column.occurrences', 'Amount'), factor: 0.15 },
                    { key: 'latest', title: localizeWithFallback('wiredmenu.monitor.column.latest', 'Latest occurrence'), factor: 0.3 }
                ]}
                h={156}
                rows={monitorLogs.map((log) => ({ key: log.type, cells: { type: log.type, category: log.category, amount: log.amount, latest: log.latest }, linkColumn: 'type', onLink: () => onOpenMonitorErrorInfo(log.type, log.category) }))}
                w={472}
                x={14}
                y={172}
            />
            <WiredMenuButton danger={true} disabled={!canClear} h={30} w={110} x={14} y={337} onClick={onClearMonitorLogs}>
                {localizeWithFallback('wiredmenu.monitor.clear_all', 'Clear all')}
            </WiredMenuButton>
            <WiredMenuButton h={30} w={110} x={375} y={337} onClick={onOpenRoomLogs}>
                {localizeWithFallback('wiredmenu.monitor.log_overview', 'View full logs')}
            </WiredMenuButton>
            {/* loading_view: 500x382 over the tab body, 0x99e9e9e1, swallowing input. */}
            {loading && <WiredMenuItem className="octane-wired-menu__loading" h={382} w={500} x={0} y={0} />}
        </>
    );
};
