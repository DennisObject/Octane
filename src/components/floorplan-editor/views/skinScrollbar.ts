/** Style-3 scrollbar geometry and the arrow step from ScrollBarController. */

export const SCROLL_BUTTON = 16;
export const SCROLL_STEP = 15;
export const THUMB_MIN = 12;

export type ScrollMetrics = {
    track: number;
    maxScroll: number;
    thumb: number;
    thumbPos: number;
};

export const scrollMetrics = (barLength: number, content: number, viewport: number, scroll: number): ScrollMetrics => {
    const track = Math.max(0, barLength - SCROLL_BUTTON * 2);
    const maxScroll = Math.max(0, content - viewport);
    const ratio = content > 0 ? viewport / content : 1;
    const thumb = maxScroll <= 0 ? track : Math.min(track, Math.max(THUMB_MIN, Math.floor(track * ratio)));
    const travel = Math.max(0, track - thumb);
    const clamped = Math.min(maxScroll, Math.max(0, scroll));
    const thumbPos = maxScroll <= 0 || travel <= 0 ? 0 : (clamped / maxScroll) * travel;

    return { track, maxScroll, thumb, thumbPos };
};

export const scrollFromThumb = (thumbPos: number, track: number, thumb: number, maxScroll: number): number => {
    const travel = track - thumb;

    if (maxScroll <= 0 || travel <= 0) return 0;

    const clamped = Math.min(travel, Math.max(0, thumbPos));

    return (clamped / travel) * maxScroll;
};
