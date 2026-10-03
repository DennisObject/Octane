import { FC, useMemo } from 'react';
import { IHousekeepingActionLogEntry, LocalizeText } from '../../../../api';
import { Button, StaffEmpty } from '../../../../common';
import { useHousekeepingStore, useLocalStorage } from '../../../../hooks';
import { HousekeepingLogRow } from '../HousekeepingLogRow';

type TargetFilter = 'all' | 'user' | 'room' | 'hotel';
type ResultFilter = 'all' | 'success' | 'failure';

const TARGET_FILTERS: TargetFilter[] = ['all', 'user', 'room', 'hotel'];
const RESULT_FILTERS: ResultFilter[] = ['all', 'success', 'failure'];

const matches = (entry: IHousekeepingActionLogEntry, target: TargetFilter, result: ResultFilter, query: string): boolean => {
    if (target !== 'all' && entry.targetType !== target) return false;
    if (result !== 'all' && entry.success !== (result === 'success')) return false;
    if (!query) return true;

    return `${entry.actorName} ${entry.targetLabel} ${entry.action} ${entry.detail}`.toLowerCase().includes(query);
};

export const HousekeepingAuditTab: FC = () => {
    const { actionLog, isAuditLoading, refreshAuditLog } = useHousekeepingStore();
    const [targetFilter, setTargetFilter] = useLocalStorage<TargetFilter>('nitro.housekeeping.audit.target_filter', 'all');
    const [resultFilter, setResultFilter] = useLocalStorage<ResultFilter>('nitro.housekeeping.audit.success_filter', 'all');
    const [query, setQuery] = useLocalStorage<string>('nitro.housekeeping.audit.query', '');

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();

        return actionLog.filter((entry) => matches(entry, targetFilter, resultFilter, normalized));
    }, [actionLog, targetFilter, resultFilter, query]);

    return (
        <>
            <div className="octane-staff-row">
                <select aria-label={LocalizeText('housekeeping.audit.filter.target')} value={targetFilter} onChange={(event) => setTargetFilter(event.target.value as TargetFilter)}>
                    {TARGET_FILTERS.map((filter) => (
                        <option key={filter} value={filter}>
                            {LocalizeText(`housekeeping.audit.filter.${filter}`)}
                        </option>
                    ))}
                </select>
                <select aria-label={LocalizeText('housekeeping.audit.filter.result')} value={resultFilter} onChange={(event) => setResultFilter(event.target.value as ResultFilter)}>
                    {RESULT_FILTERS.map((filter) => (
                        <option key={filter} value={filter}>
                            {LocalizeText(`housekeeping.audit.result.${filter}`)}
                        </option>
                    ))}
                </select>
                <input
                    className="grow"
                    placeholder={LocalizeText('housekeeping.audit.search.placeholder')}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <Button disabled={isAuditLoading} variant="secondary" onClick={() => refreshAuditLog()}>
                    {LocalizeText('housekeeping.audit.refresh')}
                </Button>
            </div>
            {filtered.length ? (
                <div className="octane-staff-list octane-housekeeping-log">
                    {filtered.map((entry) => (
                        <HousekeepingLogRow key={entry.id} entry={entry} />
                    ))}
                </div>
            ) : (
                <StaffEmpty>{LocalizeText(actionLog.length ? 'housekeeping.audit.no_match' : 'housekeeping.audit.empty')}</StaffEmpty>
            )}
        </>
    );
};
