import { RefObject, useLayoutEffect, useState } from 'react';

// Floors a measured text field to whole pixels, as the Flash text field does for auto_size.
// The measured element is the auto-height text inside the field, so measuring it cannot feed back into its own size.
export const useMeasuredFloorHeight = (ref: RefObject<HTMLElement | null>, active: boolean, minHeight: number, fallbackHeight: number) =>
{
    const [height, setHeight] = useState(fallbackHeight);

    useLayoutEffect(() =>
    {
        const element = ref.current;

        if (!active || !element) return;

        const measure = () =>
        {
            const measured = Math.floor(element.getBoundingClientRect().height);

            if (measured > 0) setHeight(Math.max(minHeight, measured));
        };

        measure();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, [ref, active, minHeight]);

    return height;
};
