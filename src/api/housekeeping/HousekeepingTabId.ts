export const HousekeepingTabId = {
    DASHBOARD: 'dashboard',
    USERS: 'users',
    ROOMS: 'rooms',
    ECONOMY: 'economy',
    AUDIT: 'audit',
    SOUNDBOARD: 'soundboard'
} as const;

export type HousekeepingTabId = (typeof HousekeepingTabId)[keyof typeof HousekeepingTabId];
