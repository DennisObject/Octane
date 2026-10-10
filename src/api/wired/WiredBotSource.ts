import { normalizeNativeSource } from './WiredNativeSource';

/** A bot's source is one of its card's user sources; the named bot (typed in the text) is source 100. */
export const WIRED_BOT_NAMED_SOURCE = 100;

/**
 * A bot source the card allows at this user slot. A named bot falls back to the named source when the
 * card allows it; otherwise the card's own default for the slot decides.
 */
export const normalizeBotSource = (value: number, allowed: number[] | undefined, defaultSource: number, hasBotName: boolean): number =>
    normalizeNativeSource(value, allowed, hasBotName && allowed?.includes(WIRED_BOT_NAMED_SOURCE) ? WIRED_BOT_NAMED_SOURCE : defaultSource);
