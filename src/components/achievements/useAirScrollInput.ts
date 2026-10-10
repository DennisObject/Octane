import { useEffect } from 'react';

interface AirScrollInputOptions {
    /** AIR moves a fixed distance per wheel event, whatever the wheel delta is. */
    wheelStep: number;
    /** The arrow buttons scroll on press, not on release; a keyboard-activated click keeps the component's own step. */
    arrowStep: number;
    onScroll?: (scrollTop: number) => void;
    initialScrollTop?: number;
}

const setScrollTop = (viewport: HTMLElement, scrollTop: number) => {
    viewport.scrollTop = scrollTop;
};

/** Wheel and arrow-button behaviour of the AIR scroll area for a ClassicScrollAreaView viewport. */
export const useAirScrollInput = (viewport: HTMLDivElement | null, { wheelStep, arrowStep, onScroll, initialScrollTop }: AirScrollInputOptions) => {
    useEffect(() => {
        if (!viewport) return;

        const onWheel = (event: WheelEvent) => {
            if (!event.deltaY) return;

            event.preventDefault();
            viewport.scrollBy({ top: Math.sign(event.deltaY) * wheelStep, behavior: 'auto' });
        };

        const arrows = [...viewport.parentElement.querySelectorAll<HTMLButtonElement>('.volt-classic-scrollbar-button')];
        const onArrowDown = (event: PointerEvent) => {
            const isUp = (event.currentTarget as HTMLElement).classList.contains('is-up');

            viewport.scrollBy({ top: isUp ? -arrowStep : arrowStep, behavior: 'auto' });
        };
        // A pointer click already scrolled on press; only a keyboard-activated click (detail 0) reaches the component's own step.
        const onArrowClick = (event: MouseEvent) => {
            if (event.detail > 0) event.stopPropagation();
        };
        const handleScroll = () => onScroll?.(viewport.scrollTop);

        if (initialScrollTop !== undefined) setScrollTop(viewport, initialScrollTop);

        viewport.addEventListener('wheel', onWheel, { passive: false });
        viewport.addEventListener('scroll', handleScroll);
        arrows.forEach((arrow) => {
            arrow.addEventListener('pointerdown', onArrowDown);
            arrow.addEventListener('click', onArrowClick);
        });

        return () => {
            arrows.forEach((arrow) => {
                arrow.removeEventListener('pointerdown', onArrowDown);
                arrow.removeEventListener('click', onArrowClick);
            });
            viewport.removeEventListener('wheel', onWheel);
            viewport.removeEventListener('scroll', handleScroll);
        };
    }, [viewport, wheelStep, arrowStep, onScroll, initialScrollTop]);
};
