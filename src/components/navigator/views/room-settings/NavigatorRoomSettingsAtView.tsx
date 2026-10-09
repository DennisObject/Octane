import { CSSProperties, FC, ReactNode } from 'react';

interface NavigatorRoomSettingsAtViewProps {
    x: number;
    y: number;
    w?: number;
    h?: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
}

// Places a control at the v75 ros_room_settings coordinates of its tab.
export const NavigatorRoomSettingsAtView: FC<NavigatorRoomSettingsAtViewProps> = (props) => {
    const { x, y, w, h, className = '', style, children = null } = props;

    return (
        <div className={`ros-at ${className}`.trim()} style={{ left: x, top: y, width: w, height: h, ...style }}>
            {children}
        </div>
    );
};
