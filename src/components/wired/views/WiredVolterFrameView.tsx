import { CSSProperties, FC, PropsWithChildren } from 'react';
import { WiredVolterStyle } from '../../../api';
import atlas from '../../../assets/images/wired/volter_shell_atlas.png';

const frameOffsets: Record<WiredVolterStyle, number> = { volter: 0, volter_blue: 32, volter_green: 64, volter_yellow: 96 };
const frameRegions = [
    [0, 0, 13, 13],
    [13, 0, 1, 13],
    [14, 0, 13, 13],
    [0, 13, 13, 1],
    [13, 13, 1, 1],
    [14, 13, 13, 1],
    [0, 14, 13, 13],
    [13, 14, 1, 13],
    [14, 14, 13, 13]
];

// The frame skin draws untinted shine after the coloured nine entities.
const shineRegions: Array<{ rect: number[]; style: CSSProperties }> = [
    { rect: [59, 1, 7, 7], style: { left: 1, top: 1, width: 7, height: 7 } },
    { rect: [66, 2, 1, 1], style: { left: 8, top: 2, width: 'calc(100% - 16px)', height: 1 } },
    { rect: [77, 1, 7, 7], style: { right: 1, top: 1, width: 7, height: 7 } },
    { rect: [60, 8, 1, 1], style: { left: 2, top: 8, width: 1, height: 'calc(100% - 16px)' } },
    { rect: [82, 8, 1, 1], style: { right: 2, top: 8, width: 1, height: 'calc(100% - 15px)' } },
    { rect: [59, 19, 7, 7], style: { left: 1, bottom: 1, width: 7, height: 7 } },
    { rect: [66, 24, 1, 1], style: { left: 8, bottom: 2, width: 'calc(100% - 15px)', height: 1 } },
    { rect: [78, 20, 6, 6], style: { right: 1, bottom: 1, width: 6, height: 6 } }
];

const bitmapRegion = (rect: number[], key: number, style?: CSSProperties) => (
    <svg key={key} viewBox={rect.join(' ')} preserveAspectRatio="none" style={style} aria-hidden="true">
        <image href={atlas} width={490} height={360} />
    </svg>
);

export const WiredVolterFrameView: FC<{ shellStyle: WiredVolterStyle }> = ({ shellStyle }) => (
    <div className="volt-wired__volter-frame" aria-hidden="true">
        <div className="volt-wired__volter-frame-grid">
            {frameRegions.map(([x, y, width, height], index) => bitmapRegion([x + frameOffsets[shellStyle], y + 300, width, height], index))}
        </div>
        <div className="volt-wired__volter-frame-shine">{shineRegions.map(({ rect, style }, index) => bitmapRegion(rect, index, style))}</div>
    </div>
);

const borderRegions = [
    [0, 0, 12, 11],
    [12, 0, 6, 11],
    [18, 0, 12, 11],
    [0, 11, 12, 6],
    [12, 11, 6, 6],
    [18, 11, 12, 6],
    [0, 17, 12, 11],
    [12, 17, 6, 11],
    [18, 17, 12, 11]
];
const borderOffsets = { volter_blue: 192, volter_green: 224, volter_yellow: 256 };

/** cBe's native border13 body wrapper, with controller insets 9/8/9/8. */
export const WiredVolterBorderView: FC<PropsWithChildren<{ shellStyle: Exclude<WiredVolterStyle, 'volter'> }>> = ({ shellStyle, children }) => (
    <div className="volt-wired__volter-inner">
        <div className="volt-wired__volter-inner-skin" aria-hidden="true">
            {borderRegions.map(([x, y, width, height], index) => bitmapRegion([x + borderOffsets[shellStyle], y + 300, width, height], index))}
        </div>
        {children}
    </div>
);

/** quick_menu's nested style3 / style11 / style11 native borders. */
export const WiredVolterMenuFrameView: FC = () => (
    <span className="volt-wired__volter-menu-frame" aria-hidden="true">
        {[296, 304, 312].map((offset, inset) => (
            <span key={offset} className="volt-wired__volter-menu-frame-grid" style={{ inset }}>
                {[0, 3, 4].flatMap((y, row) =>
                    [0, 3, 4].map((x, column) => bitmapRegion([offset + x, 300 + y, column === 1 ? 1 : 3, row === 1 ? 1 : 3], row * 3 + column))
                )}
            </span>
        ))}
    </span>
);
