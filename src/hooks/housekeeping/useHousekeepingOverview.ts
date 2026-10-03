import { useCallback, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, HousekeepingApi, IHousekeepingActionLogEntry, IHousekeepingDashboard } from '../../api';

const POLL_DEFAULT_MS = 30_000;
const POLL_MIN_MS = 5_000;
const ACTION_LOG_LIMIT = 100;

// `housekeeping.audit.poll_interval_ms`: 0 disables polling, anything below the floor
// falls back to the default so a typo can't hammer the server.
const resolvePollInterval = (): number => {
    const configured = GetConfigurationValue<number>('housekeeping.audit.poll_interval_ms', POLL_DEFAULT_MS);

    if (configured === 0) return 0;

    return typeof configured === 'number' && configured >= POLL_MIN_MS ? configured : POLL_DEFAULT_MS;
};

/**
 * Dashboard counters and the staff action log. Both refresh when the panel opens and
 * then poll while it stays open and the browser tab is visible; the dashboard only
 * while its tab is showing.
 */
export const useHousekeepingOverview = (isVisible: boolean, isDashboardActive: boolean) => {
    const [dashboard, setDashboard] = useState<IHousekeepingDashboard | null>(null);
    const [dashboardUpdatedAt, setDashboardUpdatedAt] = useState<number | null>(null);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [actionLog, setActionLog] = useState<IHousekeepingActionLogEntry[]>([]);
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    const dashboardTokenRef = useRef(0);
    const auditTokenRef = useRef(0);

    const refreshDashboard = useCallback(async () => {
        const token = ++dashboardTokenRef.current;

        setIsDashboardLoading(true);

        try {
            const data = await HousekeepingApi.getDashboard();

            if (token !== dashboardTokenRef.current) return;

            setDashboard(data ?? null);
            setDashboardUpdatedAt(Date.now());
        } catch {
            if (token === dashboardTokenRef.current) setDashboard(null);
        } finally {
            if (token === dashboardTokenRef.current) setIsDashboardLoading(false);
        }
    }, []);

    const refreshAuditLog = useCallback(async () => {
        const token = ++auditTokenRef.current;

        setIsAuditLoading(true);

        try {
            const entries = await HousekeepingApi.listActionLog(ACTION_LOG_LIMIT);

            if (token === auditTokenRef.current) setActionLog(Array.isArray(entries) ? entries : []);
        } catch {
            // Keep the last good log on a timeout; the next poll retries.
        } finally {
            if (token === auditTokenRef.current) setIsAuditLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        refreshAuditLog();
    }, [isVisible, refreshAuditLog]);

    useEffect(() => {
        if (isVisible && isDashboardActive) refreshDashboard();
    }, [isVisible, isDashboardActive, refreshDashboard]);

    useEffect(() => {
        if (!isVisible) return;

        const intervalMs = resolvePollInterval();

        if (!intervalMs) return;

        const handle = setInterval(() => {
            if (document.visibilityState !== 'visible') return;

            refreshAuditLog();

            if (isDashboardActive) refreshDashboard();
        }, intervalMs);

        return () => clearInterval(handle);
    }, [isVisible, isDashboardActive, refreshAuditLog, refreshDashboard]);

    // Closing the panel invalidates in-flight requests so a late reply can't land.
    useEffect(() => {
        if (isVisible) return;

        dashboardTokenRef.current++;
        auditTokenRef.current++;
    }, [isVisible]);

    return { dashboard, dashboardUpdatedAt, isDashboardLoading, refreshDashboard, actionLog, isAuditLoading, refreshAuditLog };
};
