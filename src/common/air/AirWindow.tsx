import { ButtonHTMLAttributes, ComponentPropsWithRef, FC, HTMLAttributes, InputHTMLAttributes, PointerEvent, ReactNode, useRef } from 'react';
import './AirWindow.css';

interface AirFrameProps extends HTMLAttributes<HTMLElement> {
    title: string;
    onClose: () => void;
    children: ReactNode;
}

// Illumina style 100. Content coordinates are relative to (1, 30).
export const AirFrame: FC<AirFrameProps> = ({ title, onClose, children, className = '', ...props }) => (
    <section {...props} aria-label={title} className={`air-frame ${className}`} role="dialog">
        <div aria-hidden="true" className="air-frame__chrome" />
        <div className="air-frame__titlebar">
            <h2 className="air-frame__title">{title}</h2>
        </div>
        <button aria-label="Close" className="air-frame__close" name="header_button_close" onClick={onClose} type="button" />
        <div className="air-frame__content">{children}</div>
    </section>
);

export const AirButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', children, ...props }) => (
    <button {...props} className={`air-button ${className}`} type="button">
        <span aria-hidden="true" className="air-button__curves" />
        {children}
    </button>
);

export const AirInputSurface: FC<ComponentPropsWithRef<'div'>> = ({ className = '', children, ...props }) => (
    <div {...props} className={`air-input-surface ${className}`}>
        {children}
    </div>
);

export const AirCheckbox: FC<InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
    <input {...props} className={`air-checkbox ${className}`} type="checkbox" />
);

interface AirSliderProps {
    label: string;
    position: number;
    value: number;
    maximum: number;
    width: number;
    onSelect: (position: number, action: 'click' | 'drag' | 'double-click') => void;
    onDragStart: () => void;
    onDragEnd: () => void;
}

// Uses the same plain-button and input-border skins as AIR's container_button
// style 102 and border style 105. A track click sets the thumb's left edge.
export const AirSlider: FC<AirSliderProps> = ({ label, position, value, maximum, width, onSelect, onDragStart, onDragEnd }) => {
    const travel = width - 20;
    // Preserve integer pixel selections after normalized floating-point division.
    const thumbX = Math.trunc(position * travel + Number.EPSILON * width);
    const dragRef = useRef<{ pointerId: number; startX: number; startThumbX: number; lastThumbX: number }>(null);

    const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startThumbX: thumbX, lastThumbX: thumbX };
        onDragStart();
    };

    const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.pointerId) return;

        const nextThumbX = Math.max(0, Math.min(travel, Math.trunc(drag.startThumbX + event.clientX - drag.startX)));
        if (nextThumbX === drag.lastThumbX) return;

        drag.lastThumbX = nextThumbX;
        onSelect(nextThumbX / travel, 'drag');
    };

    const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;

        dragRef.current = null;
        onDragEnd();
    };

    return (
        <AirInputSurface
            style={{ width }}
            className="air-slider"
            data-air-name="slider"
            onPointerDown={(event) => {
                if (event.button === 0) event.preventDefault();
            }}
            onClick={(event) => {
                if ((event.target as HTMLElement).closest('.air-slider__thumb')) return;

                const bounds = event.currentTarget.getBoundingClientRect();
                onSelect(Math.max(0, Math.min(travel, Math.trunc(event.clientX - bounds.left))) / travel, 'click');
            }}
        >
            <AirButton
                aria-label={label}
                aria-valuemax={maximum}
                aria-valuemin={0}
                aria-valuenow={Math.min(value, maximum)}
                aria-valuetext={value.toString()}
                className="air-slider__thumb"
                name="slider_button"
                role="slider"
                style={{ left: thumbX }}
                onDoubleClick={() => onSelect(thumbX / travel, 'double-click')}
                onKeyDown={(event) => {
                    const steps = { ArrowLeft: -0.01, ArrowDown: -0.01, ArrowRight: 0.01, ArrowUp: 0.01 };
                    if (event.key === 'Home' || event.key === 'End' || event.key in steps) {
                        event.preventDefault();
                        onSelect(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : Math.max(0, Math.min(1, position + steps[event.key] / maximum)), 'click');
                    }
                }}
                onLostPointerCapture={endDrag}
                onPointerCancel={endDrag}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
            />
        </AirInputSurface>
    );
};
