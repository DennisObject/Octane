/**
 * Keeps a source only when the card's own allowed group for that slot has it; otherwise the card's default.
 * With no group from the server there is nothing to check against, so the value stays as it is.
 */
export const normalizeNativeSource = (value: number, allowed: number[] | undefined, fallback: number): number =>
    allowed?.length ? (allowed.includes(value) ? value : fallback) : value;
