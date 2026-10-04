const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "5d 12h 3m" — compact uptime display for the dashboard. We don't
 * use the existing `friendlyTime` helper because that one is tuned
 * for "how long ago" (past tense, single-unit), while uptime needs
 * multi-unit forward-looking output and to handle seconds-only
 * fresh-boot cases.
 */
export const formatUptime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '—';
    if (seconds < MINUTE) return `${Math.floor(seconds)}s`;

    const d = Math.floor(seconds / DAY);
    const h = Math.floor((seconds % DAY) / HOUR);
    const m = Math.floor((seconds % HOUR) / MINUTE);

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;

    return `${m}m`;
};

export const formatCompactNumber = (value: number): string => {
    if (!Number.isFinite(value)) return '—';

    const abs = Math.abs(value);

    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;

    return value.toString();
};
