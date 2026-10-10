import { CSSProperties, FC, ReactNode } from 'react';

// v75 stickie colour buttons, in the order of the layout: name, colour.
export const STICKIE_COLORS: { name: string; color: string }[] = [
    { name: 'blue', color: '9CCEFF' },
    { name: 'purple', color: 'FF9CFF' },
    { name: 'green', color: '9CFF9C' },
    { name: 'yellow', color: 'FFFF33' },
    { name: 'white', color: 'FFFFFF' },
    { name: 'red', color: 'FF9C9C' },
    { name: 'orange', color: 'FFCC66' },
    { name: 'cyan', color: '9CFFFF' }
];

interface FurnitureStickieSheetViewProps {
    color: string;
    themeName?: string;
    showDelete: boolean;
    showColors: boolean;
    onColor: (color: string) => void;
    onDelete: () => void;
    onClose: () => void;
    children: ReactNode;
}

// The 185x178 v75 stickie window: bitmap, delete / colour / close controls in the header and the text area.
export const FurnitureStickieSheetView: FC<FurnitureStickieSheetViewProps> = (props) => {
    const { color, themeName = null, showDelete, showColors, onColor, onDelete, onClose, children } = props;

    return (
        <div
            className={'volt-stickie ' + (themeName ? 'volt-stickie-image stickie-' + themeName : 'stickie-plain')}
            style={themeName ? undefined : ({ '--stickie-color': '#' + color } as CSSProperties)}
        >
            <div className="stickie-header drag-handler" />
            {showDelete && <div className="volt-stickie-image stickie-trash header-trash" onClick={onDelete} />}
            {showColors &&
                STICKIE_COLORS.map((entry, index) => (
                    <div
                        key={entry.name}
                        className="stickie-color"
                        style={{ left: 26 + index * 12, backgroundColor: '#' + entry.color }}
                        onClick={() => onColor(entry.color)}
                    />
                ))}
            <div className="volt-stickie-image stickie-close header-close" onClick={onClose} />
            <div className="stickie-context">{children}</div>
        </div>
    );
};
