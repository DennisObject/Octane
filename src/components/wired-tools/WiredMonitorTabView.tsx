import monitorElementOne from '../../assets/images/wired/native/menu_monitor_1.png';
import monitorElementTwo from '../../assets/images/wired/native/menu_monitor_2.png';
import { MonitorLog, MonitorStat } from './WiredCreatorTools.types';
import { WiredMenuButton, WiredMenuItem, WiredMenuPanel, WiredMenuTable, WiredMenuTitle } from './WiredMenuParts';

export interface WiredMonitorTabViewProps {
    monitorStats: MonitorStat[];
    monitorLogs: MonitorLog[];
    /**
     * Used only as a disabled-state predicate for the "View full logs" button:
     * if both this is empty and every log has amount '0', there is nothing
     * to clear. The view does not render the history itself.
     */
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
    const { monitorStats, monitorLogs, monitorHistoryRows, onOpenRoomLogs, onClearMonitorLogs, onOpenMonitorErrorInfo } = props;

    return (
        <>
            <WiredMenuTitle h={19} w={106} x={14} y={18}>
                Statistics:
            </WiredMenuTitle>
            <WiredMenuPanel h={99} w={204} x={14} y={38}>
                <WiredMenuItem className="octane-wired-menu__list has-classic-scrollbar" h={89} w={197} x={5} y={5}>
                    {monitorStats.map((stat) => (
                        <div key={stat.label} className="octane-wired-menu__text octane-wired-menu__stat">
                            {`${stat.label}: ${stat.value}`}
                        </div>
                    ))}
                </WiredMenuItem>
            </WiredMenuPanel>
            <WiredMenuItem className="octane-wired-menu__monitor-image" h={145} w={256} x={230} y={4}>
                <img alt="" draggable={false} src={monitorElementOne} />
                <img alt="" draggable={false} src={monitorElementTwo} />
            </WiredMenuItem>
            <WiredMenuTitle h={19} w={106} x={14} y={152}>
                Logs:
            </WiredMenuTitle>
            <WiredMenuTable
                columns={[
                    { key: 'type', title: 'Type', factor: 0.33 },
                    { key: 'category', title: 'Category', factor: 0.22 },
                    { key: 'amount', title: 'Amount', factor: 0.15 },
                    { key: 'latest', title: 'Latest occurrence', factor: 0.3 }
                ]}
                h={156}
                rows={monitorLogs.map((log) => ({ key: log.type, cells: { type: log.type, category: log.category, amount: log.amount, latest: log.latest }, linkColumn: 'type', onLink: () => onOpenMonitorErrorInfo(log.type, log.category) }))}
                w={472}
                x={14}
                y={172}
            />
            <WiredMenuButton danger={true} disabled={!monitorHistoryRows.length && !monitorLogs.some((log) => log.amount !== '0')} h={30} w={110} x={14} y={337} onClick={onClearMonitorLogs}>
                Clear all
            </WiredMenuButton>
            <WiredMenuButton h={30} w={110} x={375} y={337} onClick={onOpenRoomLogs}>
                View full logs
            </WiredMenuButton>
        </>
    );
};
