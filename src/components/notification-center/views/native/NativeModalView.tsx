import { FC, ReactNode } from 'react';
import { DraggableWindow } from '../../../../common';

const MODAL_ORIGIN = { x: 0, y: 0 };

// v75 qhe: a modal dialog sits centred on the desktop over a background that darkens everything below to 25%.
export const NativeModalView: FC<{ children: ReactNode }> = ({ children }) => (
    <DraggableWindow disableDrag initialPosition={MODAL_ORIGIN} unconstrainedPosition>
        <div className="octane-native-modal">
            <div aria-hidden="true" className="octane-native-modal-dim" />
            {children}
        </div>
    </DraggableWindow>
);
