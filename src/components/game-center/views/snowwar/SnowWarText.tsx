import { CSSProperties, FC, MouseEvent, ReactNode } from 'react';
import { LocalizeText } from '../../../../api';

export interface SnowWarTextProps
{
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    size: number;
    color?: number;
    bold?: boolean;
    /** `auto_size` of the text window. */
    align?: 'left' | 'center' | 'right';
    underline?: boolean;
    wrap?: boolean;
    /** `font_face` UbuntuThick: the fat outline glyphs drawn under the white caption. */
    thick?: boolean;
    name?: string;
    className?: string;
    style?: CSSProperties;
    onClick?: (event: MouseEvent) => void;
}

const toCss = (color: number) => `#${ color.toString(16).padStart(6, '0') }`;

/** A v75 `text` window: 2px TextField gutter, Ubuntu face, XML size/colour/alignment. */
export const SnowWarText: FC<SnowWarTextProps> = ({ x, y, width, height, text, size, color = 0, bold = false, align = 'left', underline = false, wrap = false, thick = false, name, className = '', style, onClick }) => (
    <div
        className={`snowwar-text ${ thick ? 'snowwar-text--thick' : '' } ${ className }`}
        data-air-name={name}
        style={{
            left: x,
            top: y,
            width,
            minHeight: height,
            color: toCss(color),
            fontSize: size,
            fontWeight: bold || thick ? 700 : 400,
            textAlign: align,
            textDecoration: underline ? 'underline' : 'none',
            whiteSpace: wrap ? 'normal' : 'nowrap',
            cursor: onClick ? 'pointer' : undefined,
            pointerEvents: onClick ? 'auto' : 'none',
            ...style
        }}
        onClick={onClick}
    >
        {text}
    </div>
);

/**
 * The `<name>_stroke` + `<name>` pair the SnowStorm layouts use for outlined captions:
 * an UbuntuThick copy in the stroke colour under the white Ubuntu caption.
 */
export const SnowWarStrokeText: FC<Omit<SnowWarTextProps, 'thick' | 'color'> & { strokeColor: number; color?: number; strokeHeight?: number }> = ({ strokeColor, color = 0xffffff, strokeHeight, ...props }) => (
    <>
        <SnowWarText {...props} thick color={strokeColor} height={strokeHeight ?? props.height} onClick={undefined} name={props.name ? `${ props.name }_stroke` : undefined} />
        <SnowWarText {...props} bold color={color} />
    </>
);

/**
 * AIR localisation with SnowStorm parameters: `%name%` and the plural form
 * `%{name|zero|one|many}` (`%%` = the number), as used by snowwar.lobby_game_start_countdown.
 */
export const localizeSnowWar = (key: string, parameters: Record<string, string | number> = {}) =>
{
    let text = LocalizeText(key);

    for(const [ name, value ] of Object.entries(parameters))
    {
        const amount = String(value);

        text = text
            .replace(new RegExp(`%\\{${ name }\\|([^|]*)\\|([^|]*)\\|([^}]*)\\}`, 'i'), (_, zero: string, one: string, many: string) =>
                (amount === '0' ? zero : amount === '1' ? one : many).replace('%%', amount))
            .split(`%${ name }%`).join(amount);
    }

    return text;
};

/** `habbo_skin_button_shiny_thick` (container_button style 3 / button_thick style 5) tinted 0x55cc00, or 0xcccccc when disabled. */
export const SnowWarThickButton: FC<{ x?: number; y: number; right?: number; width?: number; height: number; disabled?: boolean; name?: string; className?: string; onClick?: () => void; children: ReactNode }> = ({ x, y, right, width, height, disabled = false, name, className = '', onClick, children }) => (
    <button
        className={`snowwar-thick-button ${ className }`}
        data-air-name={name}
        disabled={disabled}
        style={{ left: x, right, top: y, width, height }}
        type="button"
        onClick={onClick}
    >
        {children}
    </button>
);
