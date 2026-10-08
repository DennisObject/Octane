import { useSyncExternalStore } from 'react';

/**
 * Native text is rasterised like Flash, in whole pixels. On a scaled display (devicePixelRatio above 1)
 * it is rendered at the next whole multiple and drawn at its CSS size, so the browser scales a sharp raster
 * down instead of stretching a 1x one. At 1 the output stays pixel-identical to the client's.
 */
export const getNativeTextScale = (): number => Math.min(4, Math.max(1, Math.ceil((globalThis.devicePixelRatio || 1) - 0.01)));

const subscribe = (onChange: () => void) => {
    if (typeof matchMedia !== 'function') return () => {};

    let query: MediaQueryList = null;

    const listen = () => {
        query = matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`);
        query.addEventListener('change', handleChange, { once: true });
    };

    // A resolution query only fires once, when that resolution stops matching (zoom, other monitor).
    function handleChange() {
        onChange();
        listen();
    }

    listen();

    return () => query?.removeEventListener('change', handleChange);
};

/** The native text scale, updated when the window moves to a display with another pixel ratio or zooms. */
export const useNativeTextScale = (): number => useSyncExternalStore(subscribe, getNativeTextScale, () => 1);
