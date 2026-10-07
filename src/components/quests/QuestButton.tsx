import { CSSProperties, FC, ReactNode, useState } from 'react';
import { NativeTextStyleName } from '../../common/native-text/NativeTextStyles';
import { AchievementText } from '../achievements/AchievementText';

// button_thick style 3 (habbo_skin_button_shiny_thick): the label is drawn over two flat bands of the skin, and the
// native text composite depends on the band colour under each pixel, so each band gets its own raster.
const BANDS: Record<'default' | 'hover' | 'pressed', { from: number; to: number; background: number }[]> = {
    default: [
        { from: 0, to: 15, background: 0xf3f3f3 },
        { from: 15, to: 29, background: 0xd9d9d9 }
    ],
    hover: [
        { from: 0, to: 15, background: 0xffffff },
        { from: 15, to: 29, background: 0xeeeeee }
    ],
    pressed: [
        { from: 0, to: 15, background: 0xe1e1e1 },
        { from: 15, to: 29, background: 0xa3a3a3 }
    ]
};

/** `tint`: the layout colours the button 0x01a101, which multiplies the skin and therefore every band under the label. */
const tintBand = (color: number): number => {
    const channel = (shift: number, tint: number) => Math.round((((color >> shift) & 255) * tint) / 255);

    return (channel(16, 0x01) << 16) | (channel(8, 0xa1) << 8) | channel(0, 0x01);
};

interface QuestButtonProps {
    className: string;
    label: string;
    width: number;
    onClick: () => void;
    title?: string;
    /** The label style; the quest engine's thick buttons use `button_shiny_bold` unless the layout sets its own. */
    textStyle?: NativeTextStyleName;
    style?: CSSProperties;
    tint?: boolean;
    /** The button height of the layout; the label bands split the face at row 15 and the lower band runs to the bottom. */
    height?: number;
    children?: ReactNode;
}

export const QuestButton: FC<QuestButtonProps> = ({ className, label, width, onClick, title, textStyle = 'button_shiny_bold', style, height = 29, tint = false }) => {
    const [state, setState] = useState<'default' | 'hover' | 'pressed'>('default');
    const bands = BANDS[state].map((band) => (tint ? { ...band, background: tintBand(band.background) } : band));

    return (
        <button
            type="button"
            className={className}
            style={style}
            title={title}
            onClick={onClick}
            onPointerEnter={() => setState('hover')}
            onPointerLeave={() => setState('default')}
            onPointerDown={() => setState('pressed')}
            onPointerUp={() => setState('hover')}
        >
            <span className="air-quest-button-seam" style={{ background: `#${bands[0].background.toString(16).padStart(6, '0')}` }} />
            {bands.map((band) => (
                <span key={band.from} className="air-quest-button-band" style={{ clipPath: `inset(${band.from}px 0 ${height - (band.to === 29 ? height : band.to)}px 0)` }}>
                    <AchievementText align="center" background={band.background} text={label} textStyle={textStyle} width={width} x={0} y={0} />
                </span>
            ))}
        </button>
    );
};
