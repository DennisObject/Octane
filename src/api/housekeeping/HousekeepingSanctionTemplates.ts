export const HousekeepingSanctionType = {
    BAN: 'ban',
    MUTE: 'mute',
    KICK: 'kick',
    TRADE_LOCK: 'trade_lock'
} as const;

export type HousekeepingSanctionType = (typeof HousekeepingSanctionType)[keyof typeof HousekeepingSanctionType];

export interface HousekeepingSanctionTemplate {
    /** Also the localisation suffix: `housekeeping.template.<id>` (name) and `.reason`. */
    id: string;
    type: HousekeepingSanctionType;
    /** Hours for BAN / TRADE_LOCK, minutes for MUTE; ignored for KICK. */
    durationValue: number;
}

const PERMANENT_HOURS = 24 * 365 * 100;

export const HK_SANCTION_TEMPLATES: HousekeepingSanctionTemplate[] = [
    { id: 'kick', type: HousekeepingSanctionType.KICK, durationValue: 0 },
    { id: 'mute_5m', type: HousekeepingSanctionType.MUTE, durationValue: 5 },
    { id: 'mute_60m', type: HousekeepingSanctionType.MUTE, durationValue: 60 },
    { id: 'ban_1h', type: HousekeepingSanctionType.BAN, durationValue: 1 },
    { id: 'ban_24h', type: HousekeepingSanctionType.BAN, durationValue: 24 },
    { id: 'ban_7d', type: HousekeepingSanctionType.BAN, durationValue: 168 },
    { id: 'ban_30d', type: HousekeepingSanctionType.BAN, durationValue: 720 },
    { id: 'ban_perm', type: HousekeepingSanctionType.BAN, durationValue: PERMANENT_HOURS },
    { id: 'tlock_7d', type: HousekeepingSanctionType.TRADE_LOCK, durationValue: 168 },
    { id: 'tlock_perm', type: HousekeepingSanctionType.TRADE_LOCK, durationValue: PERMANENT_HOURS }
];

export const findTemplateById = (id: string): HousekeepingSanctionTemplate | null => HK_SANCTION_TEMPLATES.find((t) => t.id === id) ?? null;
