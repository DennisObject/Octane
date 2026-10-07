export interface ClassicScrollbarMetrics {
    overflow: boolean;
    thumbSize: number;
    thumbOffset: number;
}

export const getClassicScrollbarMetrics = (
    scrollHeight: number,
    clientHeight: number,
    trackHeight: number,
    scrollTop: number,
    thumbSizeAdjustment = 0,
    minThumbSize = 12
): ClassicScrollbarMetrics => {
    if (scrollHeight <= clientHeight || clientHeight <= 0 || trackHeight <= 0) {
        return { overflow: false, thumbSize: Math.max(0, trackHeight), thumbOffset: 0 };
    }

    const thumbSize = Math.min(trackHeight, Math.max(minThumbSize, Math.trunc((trackHeight * clientHeight) / scrollHeight) + thumbSizeAdjustment));
    const maxScroll = scrollHeight - clientHeight;
    const maxThumbOffset = trackHeight - thumbSize;
    const normalizedScrollTop = Math.max(0, Math.min(maxScroll, scrollTop));

    return {
        overflow: true,
        thumbSize,
        thumbOffset: Math.round((normalizedScrollTop / maxScroll) * maxThumbOffset)
    };
};
