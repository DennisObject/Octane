import { RefObject, useEffect } from 'react';

// v75 dispatches normalized wheel deltas 3 and 1.5 to its 25px grid controller.
const WHEEL_DISTANCE = (3 + 1.5) * 25;

export const useAvatarEditorGridWheel = (container: RefObject<HTMLDivElement | null>, enabled = true) => {
    useEffect(() => {
        if (!enabled) return;

        const element = container.current;
        if (!element) return;

        const onWheel = (event: WheelEvent) => {
            if (!event.deltaY || !(event.target instanceof Element)) return;

            const area = event.target.closest('.octane-classic-scroll-area');
            const viewport = area?.querySelector<HTMLDivElement>('.octane-classic-scroll-area-viewport');
            if (!viewport || !element.contains(viewport)) return;

            event.preventDefault();
            viewport.scrollBy({ top: Math.sign(event.deltaY) * WHEEL_DISTANCE, behavior: 'auto' });
        };

        element.addEventListener('wheel', onWheel, { passive: false });
        return () => element.removeEventListener('wheel', onWheel);
    }, [container, enabled]);
};
