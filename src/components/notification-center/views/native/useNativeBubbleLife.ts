import { useCallback, useEffect, useRef, useState } from 'react';

// habbo_notifications_config_xml "view": fade in 1000 ms, display 15000 ms, fade out 1000 ms. Hovering holds the bubble past its
// display time; leaving then starts the fade out (XQ.update only closes while the pointer is outside).
export const BUBBLE_FADE_IN_MS = 1000;
export const BUBBLE_DISPLAY_MS = 15000;
export const BUBBLE_FADE_OUT_MS = 1000;

export const useNativeBubbleLife = (onClose: () => void, persistent = false) => {
    const [shown, setShown] = useState(false);
    const closeRef = useRef(onClose);
    const hoveredRef = useRef(false);
    const expiredRef = useRef(false);
    const closingRef = useRef(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

    closeRef.current = onClose;

    const dismiss = useCallback(() => {
        if (closingRef.current) return;

        closingRef.current = true;
        setShown(false);
        closeTimerRef.current = setTimeout(() => closeRef.current?.(), BUBBLE_FADE_OUT_MS);
    }, []);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setShown(true));
        const timeout = persistent
            ? null
            : setTimeout(() => {
                  if (hoveredRef.current) expiredRef.current = true;
                  else dismiss();
              }, BUBBLE_FADE_IN_MS + BUBBLE_DISPLAY_MS);

        return () => {
            cancelAnimationFrame(frame);
            if (timeout) clearTimeout(timeout);
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, [dismiss, persistent]);

    const onMouseEnter = useCallback(() => {
        hoveredRef.current = true;
    }, []);

    const onMouseLeave = useCallback(() => {
        hoveredRef.current = false;
        if (expiredRef.current) dismiss();
    }, [dismiss]);

    return { shown, dismiss, hoverProps: { onMouseEnter, onMouseLeave } };
};
