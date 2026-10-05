import { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import arrow from '../../assets/images/habbo-skin/slices/dropmenu-default-arrow.png';
import thumbDefault from '../../assets/images/habbo-skin/slices/scroll-thumb-v.png';
import thumbPressed from '../../assets/images/habbo-skin/slices/scroll-thumb-v-pressed.png';
import { getClassicScrollbarMetrics } from '../scroll-area/classicScrollbar.helpers';
import './HabboDropMenuView.css';

interface DropMenuOption<T> {
    value: T;
    label: string;
}

interface HabboDropMenuViewProps<T> {
    label: string;
    options: readonly DropMenuOption<T>[];
    value: T | null;
    onSelect: (value: T) => void;
    disabled?: boolean;
    className?: string;
    style?: CSSProperties;
}

interface PopupBounds {
    left: number;
    top: number;
    width: number;
    height: number;
}

// T1e/P7: style-0 label field floor(13.95) + top/bottom margins 1/2.
const ITEM_HEIGHT = 16;
const menuCaption = (label: string) => label.length > 200 ? label.slice(0, 200) + '...' : label;

const ThumbSkin = ({ pressed, patternId }: { pressed: boolean; patternId: string }) => {
    const source = pressed ? thumbPressed : thumbDefault;
    const image = <image href={source} width={17} height={24} />;

    return (
        <>
            <svg className="habbo-dropmenu-thumb-middle" aria-hidden="true" width="17" height="100%">
                <defs>
                    <pattern id={patternId} width="17" height="1" patternUnits="userSpaceOnUse">
                        <svg width="17" height="1" viewBox="0 2 17 1">{image}</svg>
                    </pattern>
                </defs>
                <rect width="17" height="100%" fill={'url(#' + patternId + ')'} />
            </svg>
            <svg className="habbo-dropmenu-thumb-top" aria-hidden="true" viewBox="0 0 17 2">{image}</svg>
            <svg className="habbo-dropmenu-thumb-bottom" aria-hidden="true" viewBox="0 22 17 2">{image}</svg>
            <svg className="habbo-dropmenu-thumb-grip" aria-hidden="true" viewBox="5 7 7 10">{image}</svg>
        </>
    );
};

/** Native style-0 dropmenu; feature adapters own preference/domain values and saves. */
export const HabboDropMenuView = <T extends string | number,>({ label, options, value, onSelect, disabled = false, className = '', style }: HabboDropMenuViewProps<T>): ReactNode => {
    const id = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const openingPointerRef = useRef<number>(null);
    const dragRef = useRef<{ pointerId: number; y: number; scrollTop: number }>(null);
    const committedRef = useRef(false);
    const typeAheadRef = useRef({ text: '', time: 0 });
    const optionContent = JSON.stringify(options.map((option) => [option.value, option.label]));
    const previousOptionContentRef = useRef(optionContent);
    const [popup, setPopup] = useState<PopupBounds>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [keyboardActive, setKeyboardActive] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);
    const [dragging, setDragging] = useState(false);
    const selectedIndex = options.findIndex((option) => option.value === value);
    const isOpen = popup !== null && !disabled;
    const contentHeight = options.length * ITEM_HEIGHT + 3;
    const viewportHeight = popup ? popup.height - 4 : 0;
    const maxScroll = Math.max(0, contentHeight - viewportHeight);
    const metrics = getClassicScrollbarMetrics(contentHeight, viewportHeight, viewportHeight - 32, scrollTop);

    const close = useCallback(() => {
        setPopup(null);
        openingPointerRef.current = null;
        dragRef.current = null;
        setDragging(false);
    }, []);

    const measurePopup = useCallback((): PopupBounds => {
        const bounds = triggerRef.current.getBoundingClientRect();
        const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
        const context = canvas.getContext('2d');
        context.font = '9px Volter';
        context.fontKerning = 'none';
        let width = bounds.width;
        for (const option of options) {
            // Native field gutter 4, item margins 8, popup list insets 12.
            width = Math.max(width, Math.floor(context.measureText(menuCaption(option.label)).width + 4) + 20);
        }
        let height = Math.max(bounds.height, contentHeight + 4);
        let left = bounds.left;
        let top = bounds.top;
        // P7:147372 applies desktop offsets before the oversized-height cap.
        if (top + height > window.innerHeight) top += window.innerHeight - top - height;
        else if (top < 0) top = 0;
        if (left < 0) left += left;
        else if (left + width > window.innerWidth) left += window.innerWidth - left - width;
        if (height > window.innerHeight - 30) {
            height = Math.max(0, window.innerHeight - 30);
            top = 30;
        }
        return { left, top, width, height };
    }, [contentHeight, options]);

    const open = (pointerId: number = null) => {
        if (disabled || !options.length) return;
        openingPointerRef.current = pointerId;
        committedRef.current = false;
        setKeyboardActive(false);
        setScrollTop(0);
        setActiveIndex(Math.max(0, selectedIndex));
        setPopup(measurePopup());
    };

    const select = (index: number) => {
        const option = options[index];
        if (disabled || !option || committedRef.current) return;
        committedRef.current = true;
        triggerRef.current?.focus();
        close();
        onSelect(option.value);
    };

    useEffect(() => {
        if (!isOpen) return;
        const isInside = (target: EventTarget) => target instanceof Node && (triggerRef.current?.contains(target) || popupRef.current?.contains(target));
        const onPointerDown = (event: globalThis.PointerEvent) => {
            if (!isInside(event.target)) close();
        };
        const onPointerUp = (event: globalThis.PointerEvent) => {
            if (event.pointerId === openingPointerRef.current) openingPointerRef.current = null;
        };
        const onFocusIn = (event: FocusEvent) => {
            if (!isInside(event.target)) close();
        };
        const onResize = () => setPopup(measurePopup());
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
        document.addEventListener('focusin', onFocusIn);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
            document.removeEventListener('focusin', onFocusIn);
            window.removeEventListener('resize', onResize);
        };
    }, [close, isOpen, measurePopup]);

    useEffect(() => {
        if (disabled) close();
    }, [close, disabled]);

    // P7.populate closes the old popup before replacing items. Array identity is not population.
    useLayoutEffect(() => {
        if (previousOptionContentRef.current === optionContent) return;
        previousOptionContentRef.current = optionContent;
        close();
        setActiveIndex(0);
        setKeyboardActive(false);
        setScrollTop(0);
        typeAheadRef.current = { text: '', time: 0 };
    }, [close, optionContent]);

    // A closed-menu typeahead match can only be revealed after its portal mounts.
    useLayoutEffect(() => {
        if (!isOpen || !keyboardActive) return;
        const viewport = viewportRef.current;
        if (!viewport) return;
        const top = activeIndex * ITEM_HEIGHT;
        if (top < viewport.scrollTop) viewport.scrollTop = top;
        else if (top + ITEM_HEIGHT > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = top + ITEM_HEIGHT - viewport.clientHeight;
    }, [activeIndex, isOpen, keyboardActive, viewportHeight]);

    const moveActive = (index: number) => {
        setActiveIndex(Math.max(0, Math.min(options.length - 1, index)));
        setKeyboardActive(true);
    };

    // Keyboard navigation is an accessibility adapter; native key handling remains unproven.
    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (disabled || !options.length) return;
        if (event.key === 'Tab') { if (isOpen) triggerRef.current?.focus(); close(); return; }
        if (event.key === 'Escape') {
            if (isOpen) { event.preventDefault(); event.stopPropagation(); close(); triggerRef.current?.focus(); }
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            if (isOpen) select(activeIndex);
            else open();
            return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            if (!isOpen) { open(); return; }
            moveActive(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
            return;
        }
        if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            const now = Date.now();
            const search = typeAheadRef.current;
            const text = (now - search.time > 700 ? '' : search.text) + event.key.toLocaleLowerCase();
            typeAheadRef.current = { text, time: now };
            if (!isOpen) open();
            const start = text.length === 1 ? (isOpen ? activeIndex : selectedIndex) + 1 : 0;
            for (let offset = 0; offset < options.length; offset++) {
                const index = (start + offset + options.length) % options.length;
                if (options[index].label.toLocaleLowerCase().startsWith(text)) { moveActive(index); break; }
            }
        }
    };

    const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        dragRef.current = null;
        setDragging(false);
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                role="combobox"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={isOpen ? id : undefined}
                aria-activedescendant={isOpen && options[activeIndex] ? id + '-option-' + activeIndex : undefined}
                className={'habbo-dropmenu ' + className}
                disabled={disabled}
                style={style}
                onKeyDown={onKeyDown}
                onPointerDown={(event) => {
                    if (event.button !== 0 || disabled) return;
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.focus();
                    if (!isOpen) open(event.pointerId);
                }}
                onClick={(event) => { if (event.detail === 0 && !isOpen) open(); }}
            >
                <span className="habbo-dropmenu-caption">{options[selectedIndex]?.label ?? ''}</span>
                <img className="habbo-dropmenu-arrow" src={arrow} alt="" />
            </button>
            {isOpen && createPortal(
                <div
                    ref={popupRef}
                    className="habbo-dropmenu-popup"
                    style={popup}
                    onKeyDown={onKeyDown}
                    onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
                >
                    <div
                        ref={viewportRef}
                        id={id}
                        role="listbox"
                        aria-label={label}
                        className={'habbo-dropmenu-list' + (metrics.overflow ? ' has-scrollbar' : '')}
                        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                    >
                        {options.map((option, index) => (
                            <div
                                key={String(option.value) + '-' + index}
                                id={id + '-option-' + index}
                                role="option"
                                aria-selected={index === selectedIndex}
                                className={'habbo-dropmenu-item' + (index === selectedIndex ? ' is-selected' : '') + (keyboardActive && index === activeIndex ? ' is-active' : '')}
                                onPointerDown={(event) => { if (event.button === 0) select(index); }}
                                onPointerUp={(event) => { if (event.button === 0 && openingPointerRef.current === null) select(index); }}
                            >
                                <span>{menuCaption(option.label)}</span>
                            </div>
                        ))}
                        <div className="habbo-dropmenu-padding" />
                    </div>
                    {metrics.overflow && (
                        <div className="habbo-dropmenu-scrollbar">
                            <button aria-label="Scroll up" type="button" tabIndex={-1} disabled={scrollTop <= 0} className="habbo-dropmenu-scroll-up" onClick={() => viewportRef.current?.scrollBy(0, -ITEM_HEIGHT)} />
                            <div className="habbo-dropmenu-scroll-track" onPointerDown={(event) => {
                                if (event.button !== 0 || event.target !== event.currentTarget) return;
                                const offset = event.clientY - event.currentTarget.getBoundingClientRect().top;
                                viewportRef.current?.scrollBy(0, offset < metrics.thumbOffset + metrics.thumbSize / 2 ? -viewportHeight : viewportHeight);
                            }}>
                                <div
                                    className="habbo-dropmenu-scroll-thumb"
                                    style={{ height: metrics.thumbSize, top: metrics.thumbOffset }}
                                    onPointerDown={(event) => {
                                        if (event.button !== 0) return;
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                        dragRef.current = { pointerId: event.pointerId, y: event.clientY, scrollTop };
                                        setDragging(true);
                                    }}
                                    onPointerMove={(event) => {
                                        const drag = dragRef.current;
                                        if (drag?.pointerId !== event.pointerId || !viewportRef.current) return;
                                        const travel = viewportHeight - 32 - metrics.thumbSize;
                                        if (travel > 0) viewportRef.current.scrollTop = drag.scrollTop + (event.clientY - drag.y) * maxScroll / travel;
                                    }}
                                    onPointerUp={stopDragging}
                                    onPointerCancel={stopDragging}
                                >
                                    <ThumbSkin pressed={dragging} patternId={id + '-thumb'} />
                                </div>
                            </div>
                            <button aria-label="Scroll down" type="button" tabIndex={-1} disabled={scrollTop >= maxScroll} className="habbo-dropmenu-scroll-down" onClick={() => viewportRef.current?.scrollBy(0, ITEM_HEIGHT)} />
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
};
