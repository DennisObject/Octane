import { FC } from 'react';
import { FriendlyTime, IHousekeepingActionLogEntry, LocalizeText } from '../../../api';

export const formatLogTime = (timestamp: number): string =>
    timestamp > 0 ? FriendlyTime.format(Math.max(0, Math.floor((Date.now() - timestamp) / 1000)), '.ago', 1) : '-';

/** One staff action: when, who, target, what. Failed actions are drawn in red. */
export const HousekeepingLogRow: FC<{ entry: IHousekeepingActionLogEntry }> = ({ entry }) => (
    <div className={`octane-staff-list-row octane-housekeeping-log-row ${entry.success ? '' : 'is-failed'}`} title={entry.detail || undefined}>
        <span className="octane-housekeeping-log-time octane-staff-muted">{formatLogTime(entry.timestamp)}</span>
        <span className="octane-housekeeping-log-actor truncate">{entry.actorName}</span>
        <span className="grow truncate">
            <span className="octane-staff-muted">{LocalizeText(`housekeeping.audit.target.${entry.targetType}`)}</span> {entry.targetLabel}
        </span>
        <span className="octane-housekeeping-log-action truncate">{entry.action}</span>
    </div>
);
