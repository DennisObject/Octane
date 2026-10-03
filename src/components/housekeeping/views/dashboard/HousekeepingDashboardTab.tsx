import { FC, useState } from 'react';
import { formatCompactNumber, formatUptime, HK_MAX_ALERT_LENGTH, HousekeepingTabId, LocalizeText } from '../../../../api';
import { Button, StaffEmpty, StaffSection } from '../../../../common';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { formatLogTime, HousekeepingLogRow } from '../HousekeepingLogRow';

const RECENT_SANCTIONS = 5;

export const HousekeepingDashboardTab: FC = () => {
    const {
        dashboard,
        dashboardUpdatedAt,
        isDashboardLoading,
        refreshDashboard,
        actionLog,
        recentLookups,
        lookupUserById,
        lookupRoomById,
        setActiveTab,
        isActionPending,
        sendHotelAlert
    } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [alertText, setAlertText] = useState('');
    const trimmedAlert = alertText.trim();
    const recentSanctions = actionLog.filter((entry) => entry.success && entry.targetType === 'user').slice(0, RECENT_SANCTIONS);

    const submitAlert = () => {
        if (!trimmedAlert.length || isActionPending) return;

        confirm(LocalizeText('housekeeping.hotel.alert.confirm', ['count'], [String(trimmedAlert.length)]), async () => {
            const result = await sendHotelAlert(trimmedAlert);

            if (result?.ok) setAlertText('');
        });
    };

    const openRecent = (kind: 'user' | 'room', id: number) => {
        setActiveTab(kind === 'user' ? HousekeepingTabId.USERS : HousekeepingTabId.ROOMS);

        if (kind === 'user') lookupUserById(id);
        else lookupRoomById(id);
    };

    const stats: [string, string][] = dashboard
        ? [
              ['housekeeping.dashboard.online', `${formatCompactNumber(dashboard.onlineUsers)} / ${formatCompactNumber(dashboard.totalUsers)}`],
              ['housekeeping.dashboard.peak_today', `${formatCompactNumber(dashboard.peakOnlineToday)} (${formatCompactNumber(dashboard.peakOnlineAllTime)})`],
              ['housekeeping.dashboard.rooms_active', `${formatCompactNumber(dashboard.activeRooms)} / ${formatCompactNumber(dashboard.totalRooms)}`],
              ['housekeeping.dashboard.pending_tickets', formatCompactNumber(dashboard.pendingTickets)],
              ['housekeeping.dashboard.sanctions', formatCompactNumber(dashboard.sanctionsLast24h)],
              ['housekeeping.dashboard.server', `${formatUptime(dashboard.serverUptimeSeconds)}${dashboard.serverVersion ? ` · ${dashboard.serverVersion}` : ''}`]
          ]
        : [];

    return (
        <>
            <StaffSection title={LocalizeText('housekeeping.dashboard.title')}>
                {dashboard ? (
                    <table className="octane-staff-table">
                        <tbody>
                            {stats.map(([key, value]) => (
                                <tr key={key}>
                                    <th>{LocalizeText(key)}</th>
                                    <td>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <StaffEmpty>{LocalizeText(isDashboardLoading ? 'housekeeping.dashboard.loading' : 'housekeeping.dashboard.unavailable')}</StaffEmpty>
                )}
                <div className="octane-staff-row">
                    <span className="grow octane-staff-muted">
                        {dashboardUpdatedAt ? LocalizeText('housekeeping.dashboard.updated', ['time'], [formatLogTime(dashboardUpdatedAt)]) : ''}
                    </span>
                    <Button disabled={isDashboardLoading} variant="secondary" onClick={() => refreshDashboard()}>
                        {LocalizeText('housekeeping.dashboard.refresh')}
                    </Button>
                </div>
            </StaffSection>
            <StaffSection title={LocalizeText('housekeeping.hotel.alert.label')}>
                <textarea
                    maxLength={HK_MAX_ALERT_LENGTH}
                    placeholder={LocalizeText('housekeeping.hotel.alert.placeholder')}
                    rows={3}
                    value={alertText}
                    onChange={(event) => setAlertText(event.target.value)}
                />
                <div className="octane-staff-row">
                    <span className="grow octane-staff-muted">
                        {trimmedAlert.length} / {HK_MAX_ALERT_LENGTH}
                    </span>
                    <Button disabled={!trimmedAlert.length || isActionPending} variant="danger" onClick={submitAlert}>
                        {LocalizeText('housekeeping.hotel.alert.send')}
                    </Button>
                </div>
            </StaffSection>
            {recentSanctions.length > 0 && (
                <StaffSection title={LocalizeText('housekeeping.dashboard.recent_sanctions')}>
                    <div className="octane-staff-list">
                        {recentSanctions.map((entry) => (
                            <HousekeepingLogRow key={entry.id} entry={entry} />
                        ))}
                    </div>
                </StaffSection>
            )}
            {recentLookups.length > 0 && (
                <StaffSection title={LocalizeText('housekeeping.dashboard.recent_lookups')}>
                    <div className="octane-staff-list">
                        {recentLookups.map((entry) => (
                            <button key={`${entry.kind}-${entry.id}`} className="octane-staff-list-row" type="button" onClick={() => openRecent(entry.kind, entry.id)}>
                                <span className="octane-staff-muted">{LocalizeText(`housekeeping.audit.target.${entry.kind}`)}</span>
                                <span className="grow truncate">{entry.label}</span>
                                <span className="octane-staff-muted">#{entry.id}</span>
                            </button>
                        ))}
                    </div>
                </StaffSection>
            )}
        </>
    );
};
