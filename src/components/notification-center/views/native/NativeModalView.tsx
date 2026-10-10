import { FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { DraggableWindow } from '../../../../common';

const MODAL_ORIGIN = { x: 0, y: 0 };

// v75 qhe: a modal dialog sits centred on the desktop (rounded to whole pixels) over a background that darkens everything below to 25%.
// baseWidth/baseHeight centre a window that grows after it was placed (the popup grows when its link or action is shown). offsetY is the layout frame's own y (the notification popup layout declares y=14).
export const NativeModalView: FC<{ children: ReactNode; offsetY?: number; baseWidth?: number; baseHeight?: number }> = ({ children, offsetY = 0, baseWidth = 0, baseHeight = 0 }) => {
    const slotRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useLayoutEffect(() => {
        const slot = slotRef.current;

        if (!slot) return;

        const place = () => setPosition({ x: Math.round((window.innerWidth - (baseWidth || slot.offsetWidth)) / 2), y: Math.round((window.innerHeight - (baseHeight || slot.offsetHeight)) / 2) + offsetY });
        const observer = new ResizeObserver(place);

        place();
        observer.observe(slot);
        window.addEventListener('resize', place);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', place);
        };
    }, [offsetY, baseWidth, baseHeight]);

    return (
        <DraggableWindow disableDrag initialPosition={MODAL_ORIGIN} unconstrainedPosition>
            <div className="volt-native-modal">
                <div aria-hidden="true" className="volt-native-modal-dim" />
                <div ref={slotRef} className="volt-native-modal-slot" style={{ left: position.x, top: position.y }}>
                    {children}
                </div>
            </div>
        </DraggableWindow>
    );
};
