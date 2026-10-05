import { FC, ReactNode, useState } from 'react';
import { DraggableWindow } from '../../common';

interface SettingsWindowProps {
    name: string;
    title: string;
    width: number;
    titleX: number;
    titleWidth: number;
    lineX: number;
    lineWidth: number;
    className?: string;
    children: ReactNode;
}

// v75 opens each settings window at x = desktop width - window width - 200 and leaves y at the window origin (0).
export const SettingsWindow: FC<SettingsWindowProps> = (props) => {
    const { name, title, width, titleX, titleWidth, lineX, lineWidth, className = '', children } = props;
    const [position] = useState(() => ({ x: window.innerWidth - width - 200, y: 0 }));

    return (
        <DraggableWindow handleSelector=".us-title" initialPosition={position} uniqueKey={`user-settings-${name}`} unconstrainedPosition>
            <section aria-label={title} className={`us-window us-window--${name} ${className}`.trim()} role="dialog">
                <div aria-hidden="true" className="us-chrome" />
                <h2 className="us-title" style={{ left: titleX, width: titleWidth }}>
                    {title}
                </h2>
                <div aria-hidden="true" className="us-line" style={{ left: lineX, width: lineWidth }} />
                {children}
            </section>
        </DraggableWindow>
    );
};
