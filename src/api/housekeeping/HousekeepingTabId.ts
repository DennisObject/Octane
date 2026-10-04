export const HousekeepingTabId = {
    DASHBOARD: 'dashboard',
    USERS: 'users',
    ROOMS: 'rooms',
    ECONOMY: 'economy',
    AUDIT: 'audit',
    ROLES: 'roles'
} as const;

export type HousekeepingTabId = (typeof HousekeepingTabId)[keyof typeof HousekeepingTabId];
