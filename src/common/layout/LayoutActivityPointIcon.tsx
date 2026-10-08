import { CSSProperties, FC } from 'react';
import { ACTIVITY_POINT_ICON_REGIONS, GetActivityPointIconStyle } from '../../api';
import habboIcons from '../../assets/images/catalog/air/habbo-icons.png';

interface LayoutActivityPointIconProps {
    type: number;
    big?: boolean;
    className?: string;
    style?: CSSProperties;
}

// AIR draws a currency as an icon window whose style picks a region of habbo_icons_png.
export const LayoutActivityPointIcon: FC<LayoutActivityPointIconProps> = (props) => {
    const { type, big = false, className = '', style = {} } = props;
    const region = ACTIVITY_POINT_ICON_REGIONS[GetActivityPointIconStyle(type, big)];

    if (!region) return null;

    const [x, y, width, height] = region;

    return (
        <span
            aria-hidden="true"
            className={`octane-activity-point-icon ${className}`.trim()}
            data-currency-type={type}
            style={{
                display: 'inline-block',
                flexShrink: 0,
                width,
                height,
                background: `url(${habboIcons}) -${x}px -${y}px no-repeat`,
                ...style
            }}
        />
    );
};

// Credits, duckets and diamonds keep the hotel's wallet icons (currency.asset.icon.url). Every other type is
// drawn the AIR way when its icon style resolves, and falls back to the wallet url otherwise.
const WALLET_ICON_TYPES: readonly number[] = [-1, 0, 5];

export const UsesActivityPointIcon = (type: number, big: boolean = false): boolean =>
    Number.isInteger(type) && !WALLET_ICON_TYPES.includes(type) && !!ACTIVITY_POINT_ICON_REGIONS[GetActivityPointIconStyle(type, big)];
