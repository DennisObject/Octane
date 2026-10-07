import { FC, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { SCROLL_STEP, scrollMetrics, ScrollMetrics } from './skinScrollbar';

type Axis = 'vertical' | 'horizontal';
type SkinState = 'default' | 'hover' | 'pressed' | 'passive';

type Props = {
    scrollerRef: { current: HTMLElement | null };
    axis: Axis;
    slot: number;
    className?: string;
    testId: string;
    /** Changes whenever the scroller's content changes without a resize, for example a textarea value. */
    revision?: unknown;
};

const EMPTY: ScrollMetrics = { track: 0, maxScroll: 0, thumb: 0, thumbPos: 0 };

const readMetrics = (axis: Axis, scroller: HTMLElement, bar: HTMLDivElement): ScrollMetrics => {
    const barLength = axis === 'vertical' ? bar.clientHeight : bar.clientWidth;
    const content = axis === 'vertical' ? scroller.scrollHeight : scroller.scrollWidth;
    const viewport = axis === 'vertical' ? scroller.clientHeight : scroller.clientWidth;
    const scroll = axis === 'vertical' ? scroller.scrollTop : scroller.scrollLeft;

    return scrollMetrics(barLength, content, viewport, scroll);
};

const shown = (pressed: boolean, hover: boolean, passive: boolean): SkinState => {
    if (passive) return 'passive';
    if (pressed) return 'pressed';
    if (hover) return 'hover';

    return 'default';
};

/** External style-3 scrollbar. The 17px art is left/top aligned and the slot clips the rest. */
export const FloorplanSkinScrollbar: FC<Props> = ({ scrollerRef, axis, slot, className, testId, revision }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const [metrics, setMetrics] = useState<ScrollMetrics>(EMPTY);
    const [decPressed, setDecPressed] = useState(false);
    const [decHover, setDecHover] = useState(false);
    const [incPressed, setIncPressed] = useState(false);
    const [incHover, setIncHover] = useState(false);
    const [trackPressed, setTrackPressed] = useState(false);
    const [trackHover, setTrackHover] = useState(false);
    const [thumbPressed, setThumbPressed] = useState(false);
    const [thumbHover, setThumbHover] = useState(false);
    const dragCleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const scroller = scrollerRef.current;
        const bar = rootRef.current;

        if (!scroller || !bar) return;

        const update = () => setMetrics(readMetrics(axis, scroller, bar));

        update();
        scroller.addEventListener('scroll', update);
        scroller.addEventListener('input', update);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);

        observer?.observe(scroller);
        observer?.observe(bar);
        for (const child of scroller.children) observer?.observe(child);
        // Canvas width/height attributes change after a paint without resizing the viewport.
        const contentObserver = new MutationObserver(update);
        contentObserver.observe(scroller, { subtree: true, attributes: true, attributeFilter: ['width', 'height'], childList: true });

        return () => {
            scroller.removeEventListener('scroll', update);
            scroller.removeEventListener('input', update);
            observer?.disconnect();
            contentObserver.disconnect();
        };
    }, [axis, scrollerRef]);

    useEffect(() => {
        const scroller = scrollerRef.current;
        const bar = rootRef.current;

        if (scroller && bar) setMetrics(readMetrics(axis, scroller, bar));
    }, [axis, scrollerRef, revision]);

    useEffect(() => () => {
        dragCleanupRef.current?.();
    }, []);

    const passive = metrics.maxScroll <= 0;

    const nudge = (delta: number) => {
        const scroller = scrollerRef.current;

        if (!scroller || metrics.maxScroll <= 0) return;

        if (axis === 'vertical') scroller.scrollTop += delta;
        else scroller.scrollLeft += delta;
    };

    const onArrowDown = (direction: -1 | 1) => (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (passive) return;

        event.preventDefault();
        nudge(direction * SCROLL_STEP);
        if (direction < 0) setDecPressed(true);
        else setIncPressed(true);
    };

    // Enter and Space reach the arrow as a click with no pointer (detail 0); a pointer click already stepped on pointerdown.
    const onArrowClick = (direction: -1 | 1) => (event: ReactMouseEvent<HTMLButtonElement>) => {
        if (event.detail === 0) nudge(direction * SCROLL_STEP);
    };

    // The room chat listens on the body for Enter and Space and swallows them; keep them for the focused arrow.
    const onArrowKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
    };

    const onTrackDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget || metrics.maxScroll <= 0) return;

        const scroller = scrollerRef.current;

        if (!scroller) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const local = axis === 'vertical' ? event.clientY - rect.top : event.clientX - rect.left;
        const page = axis === 'vertical' ? scroller.clientHeight : scroller.clientWidth;
        const direction = local < metrics.thumbPos ? -1 : local > metrics.thumbPos + metrics.thumb ? 1 : 0;

        if (direction === 0) return;

        setTrackPressed(true);
        nudge(direction * Math.max(0, page - SCROLL_STEP));
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const onThumbDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        const scroller = scrollerRef.current;
        const bar = rootRef.current;

        if (!scroller || !bar || metrics.maxScroll <= 0) return;

        event.preventDefault();
        event.stopPropagation();
        const start = readMetrics(axis, scroller, bar);
        const origin = axis === 'vertical' ? event.clientY : event.clientX;
        const startScroll = axis === 'vertical' ? scroller.scrollTop : scroller.scrollLeft;
        const travel = start.track - start.thumb;

        setThumbPressed(true);
        dragCleanupRef.current?.();

        const onMove = (move: PointerEvent) => {
            if (travel <= 0) return;

            const delta = (axis === 'vertical' ? move.clientY : move.clientX) - origin;
            const next = startScroll + (delta / travel) * start.maxScroll;

            if (axis === 'vertical') scroller.scrollTop = next;
            else scroller.scrollLeft = next;
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            dragCleanupRef.current = null;
            setThumbPressed(false);
        };

        dragCleanupRef.current = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    const decState = shown(decPressed, decHover, passive);
    const incState = shown(incPressed, incHover, passive);
    const trackState = shown(trackPressed, trackHover, metrics.maxScroll <= 0);
    const thumbState = shown(thumbPressed, thumbHover, passive);
    const thumbStyle = axis === 'vertical'
        ? { top: Math.round(metrics.thumbPos), height: metrics.thumb }
        : { left: Math.round(metrics.thumbPos), width: metrics.thumb };
    const slotStyle = axis === 'vertical' ? { width: slot } : { height: slot };

    return (
        <div ref={rootRef} className={`fp-skin-bar is-${axis} ${className ?? ''}`} style={slotStyle} data-testid={testId} data-slot={slot} data-art="17">
            <div className="fp-skin-bar-art">
                <button
                    type="button"
                    className={`fp-skin-bar-dec is-${decState}`}
                    data-testid={`${testId}-decrement`}
                    data-state={decState}
                    onPointerDown={onArrowDown(-1)}
                    onClick={onArrowClick(-1)}
                    onKeyDown={onArrowKeyDown}
                    onPointerUp={() => setDecPressed(false)}
                    onPointerCancel={() => setDecPressed(false)}
                    onPointerEnter={() => setDecHover(true)}
                    onPointerLeave={() => { setDecHover(false); setDecPressed(false); }}
                />
                <div
                    className={`fp-skin-bar-track is-${trackState}`}
                    data-testid={`${testId}-track`}
                    data-state={trackState}
                    onPointerDown={onTrackDown}
                    onPointerUp={() => setTrackPressed(false)}
                    onPointerCancel={() => setTrackPressed(false)}
                    onPointerEnter={() => setTrackHover(true)}
                    onPointerLeave={() => { setTrackHover(false); setTrackPressed(false); }}
                >
                    <div
                        className={`fp-skin-bar-thumb is-${thumbState}`}
                        data-testid={`${testId}-thumb`}
                        data-state={thumbState}
                        style={{ ...thumbStyle, visibility: passive ? 'hidden' : 'visible' }}
                        onPointerDown={onThumbDown}
                        onPointerEnter={() => setThumbHover(true)}
                        onPointerLeave={() => setThumbHover(false)}
                    >
                        <span className="fp-skin-bar-cap is-start" />
                        <span className="fp-skin-bar-mid" />
                        <span className="fp-skin-bar-cap is-end" />
                    </div>
                </div>
                <button
                    type="button"
                    className={`fp-skin-bar-inc is-${incState}`}
                    data-testid={`${testId}-increment`}
                    data-state={incState}
                    onPointerDown={onArrowDown(1)}
                    onClick={onArrowClick(1)}
                    onKeyDown={onArrowKeyDown}
                    onPointerUp={() => setIncPressed(false)}
                    onPointerCancel={() => setIncPressed(false)}
                    onPointerEnter={() => setIncHover(true)}
                    onPointerLeave={() => { setIncHover(false); setIncPressed(false); }}
                />
            </div>
        </div>
    );
};
