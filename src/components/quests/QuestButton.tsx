import { FC, ReactNode, useState } from 'react';
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
        { from: 15, to: 29, background: 0xebebeb }
    ],
    pressed: [
        { from: 0, to: 15, background: 0xe1e1e1 },
        { from: 15, to: 29, background: 0xa3a3a3 }
    ]
};

interface QuestButtonProps {
    className: string;
    label: string;
    width: number;
    onClick: () => void;
    children?: ReactNode;
}

export const QuestButton: FC<QuestButtonProps> = ({ className, label, width, onClick }) => {
    const [state, setState] = useState<'default' | 'hover' | 'pressed'>('default');

    return (
        <button
            type="button"
            className={className}
            onClick={onClick}
            onPointerEnter={() => setState('hover')}
            onPointerLeave={() => setState('default')}
            onPointerDown={() => setState('pressed')}
            onPointerUp={() => setState('hover')}
        >
            {BANDS[state].map((band) => (
                <span key={band.from} className="air-quest-button-band" style={{ clipPath: `inset(${band.from}px 0 ${29 - band.to}px 0)` }}>
                    <AchievementText align="center" background={band.background} text={label} textStyle="button_shiny_bold" width={width} x={0} y={0} />
                </span>
            ))}
        </button>
    );
};
