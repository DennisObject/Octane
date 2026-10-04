// Client-side checks only shorten the feedback loop; the server validates every action again.
export const HousekeepingErrorKey = {
    NONE: 'none',
    INVALID_USER_ID: 'invalid_user_id',
    INVALID_ROOM_ID: 'invalid_room_id',
    INVALID_ITEM_ID: 'invalid_item_id',
    INVALID_AMOUNT: 'invalid_amount',
    AMOUNT_TOO_LARGE: 'amount_too_large',
    EMPTY_REASON: 'empty_reason',
    TEXT_TOO_LONG: 'text_too_long',
    INVALID_HOURS: 'invalid_hours',
    INVALID_MINUTES: 'invalid_minutes'
} as const;

export type HousekeepingErrorKey = (typeof HousekeepingErrorKey)[keyof typeof HousekeepingErrorKey];

// Mirrors the emulator's HousekeepingLimits so a doomed request isn't sent.
export const HK_MAX_GIVE_AMOUNT = 1_000_000_000;
export const HK_MAX_ITEM_QUANTITY = 100;
export const HK_MAX_CLUB_DAYS = 3650;
export const HK_MAX_BAN_HOURS = 24 * 365 * 100;
export const HK_MAX_TRADE_LOCK_HOURS = 24 * 365;
export const HK_MAX_MUTE_MINUTES = 60 * 24 * 30;
export const HK_MAX_REASON_LENGTH = 500;
export const HK_MAX_ALERT_LENGTH = 1000;

const isPositiveInteger = (raw: number): boolean => Number.isFinite(raw) && Number.isInteger(raw) && raw > 0;

const ID_ERRORS = {
    user: HousekeepingErrorKey.INVALID_USER_ID,
    room: HousekeepingErrorKey.INVALID_ROOM_ID,
    item: HousekeepingErrorKey.INVALID_ITEM_ID
} as const;

export const validatePositiveId = (raw: number, kind: keyof typeof ID_ERRORS): HousekeepingErrorKey =>
    isPositiveInteger(raw) ? HousekeepingErrorKey.NONE : ID_ERRORS[kind];

export const validateAmount = (raw: number, max: number = HK_MAX_GIVE_AMOUNT): HousekeepingErrorKey => {
    if (!isPositiveInteger(raw)) return HousekeepingErrorKey.INVALID_AMOUNT;
    if (raw > max) return HousekeepingErrorKey.AMOUNT_TOO_LARGE;

    return HousekeepingErrorKey.NONE;
};

export const validateText = (raw: string, maxLength: number = HK_MAX_REASON_LENGTH): HousekeepingErrorKey => {
    const trimmed = (raw ?? '').trim();

    if (!trimmed.length) return HousekeepingErrorKey.EMPTY_REASON;
    if (trimmed.length > maxLength) return HousekeepingErrorKey.TEXT_TOO_LONG;

    return HousekeepingErrorKey.NONE;
};

export const validateHours = (raw: number, max: number = HK_MAX_BAN_HOURS): HousekeepingErrorKey =>
    isPositiveInteger(raw) && raw <= max ? HousekeepingErrorKey.NONE : HousekeepingErrorKey.INVALID_HOURS;

export const validateMinutes = (raw: number): HousekeepingErrorKey =>
    isPositiveInteger(raw) && raw <= HK_MAX_MUTE_MINUTES ? HousekeepingErrorKey.NONE : HousekeepingErrorKey.INVALID_MINUTES;
