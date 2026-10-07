import { CSSProperties, FC, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';
import '../../../css/mod-tools/NativeWindow0.css';
import blueAtlas from '../../../assets/mod-tools/skins/habbo-blue-skin.png';
import borderWhiteXml from '../../../assets/mod-tools/skins/skin-border_white.xml?raw';
import buttonXml from '../../../assets/mod-tools/skins/skin-button_default.xml?raw';
import checkboxXml from '../../../assets/mod-tools/skins/skin-button_checkbox.xml?raw';
import closeXml from '../../../assets/mod-tools/skins/skin-button_close.xml?raw';
import dropmenuXml from '../../../assets/mod-tools/skins/skin-dropmenu.xml?raw';
import frameXml from '../../../assets/mod-tools/skins/skin-frame.xml?raw';
import headerXml from '../../../assets/mod-tools/skins/skin-header.xml?raw';
import { NativeSkin, parseNativeSkin } from './NativeSkin';
import { NativeSkinView } from './NativeSkinView';

// Legacy window-manager style 0 (habbo_element_description_xml): blue frame 0xff418db0, white border, default button, checkbox, dropmenu, close button.
const SKINS = {
    frame: parseNativeSkin(frameXml),
    header: parseNativeSkin(headerXml),
    border: parseNativeSkin(borderWhiteXml),
    button: parseNativeSkin(buttonXml),
    checkbox: parseNativeSkin(checkboxXml),
    close: parseNativeSkin(closeXml),
    dropmenu: parseNativeSkin(dropmenuXml)
};

// The open dropmenu list is the dropmenu frame without its arrow; a fixed (non-resizable) window draws no scaler.
const withoutEntities = (skin: NativeSkin, layoutName: string, keep: (name: string) => boolean): NativeSkin => ({
    ...skin,
    layouts: { ...skin.layouts, [layoutName]: { ...skin.layouts[layoutName], entities: skin.layouts[layoutName].entities.filter((entity) => keep(entity.name)) } }
});
const DROPMENU_LIST = withoutEntities(SKINS.dropmenu, 'dropmenu_frame', (name) => name !== 'arrow');

export const FRAME_COLOR = 0x418db0;

const rect = (x: number, y: number, width: number, height: number): CSSProperties => ({ left: x, top: y, width, height });

interface Native0TextProps {
    text: string;
    x: number;
    y: number;
    width: number;
    height?: number;
    bold?: boolean;
    color?: number;
    underline?: boolean;
    wrap?: boolean;
    background?: number;
    textStyle?: NativeTextStyleName;
    onClick?: () => void;
    style?: CSSProperties;
    onSize?: (size: { width: number; height: number }) => void;
}

/**
 * A `text` window set in Volter: the field's own 2px gutter puts the first glyph at (2, 2) and a line is 10px high, so a field is `lines * 10 + 4` high
 * (AS textHeight + 5, which `onSize` reports). The shared NativeText raster smears Volter glyphs across pixels, so the Volter web font draws the pixel glyphs.
 */
export const Native0Text: FC<Native0TextProps> = ({ text, x, y, width, height, bold, color = 0, underline, wrap, background, textStyle, onClick, style, onSize }) => {
    const ref = useRef<HTMLDivElement>(null);
    const white = textStyle === 'frame_title';

    useEffect(() => {
        const element = ref.current;

        if (!element || !onSize || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => onSize({ width: element.offsetWidth, height: element.offsetHeight }));

        observer.observe(element);

        return () => observer.disconnect();
    }, [onSize]);

    return (
        <>
            {background !== undefined && (
                // drawn apart from the text: text on an opaque background is set with LCD subpixel fringes
                <div className="native0-text__background" style={{ left: x, top: y, width, height: height ?? 13, backgroundColor: `#${background.toString(16).padStart(6, '0')}` }} />
            )}
            <div
                ref={ref}
                className="native0-text"
                style={{ left: x, top: y, width: wrap ? width : undefined, height: height === undefined ? undefined : height, color: `#${(white ? 0xffffff : color).toString(16).padStart(6, '0')}`, ...style }}
                onClick={onClick}
            >
                <span className={`native0-text__line${bold || white ? ' is-bold' : ''}${underline ? ' is-underline' : ''}${wrap ? ' is-wrap' : ''}`}>{text}</span>
            </div>
        </>
    );
};

interface Native0BorderProps {
    x: number;
    y: number;
    width: number;
    height: number;
    children?: ReactNode;
}

export const Native0Border: FC<Native0BorderProps> = ({ x, y, width, height, children }) => (
    <div className="native0-box" style={rect(x, y, width, height)}>
        <NativeSkinView atlas={blueAtlas} height={height} layout="border_white" skin={SKINS.border} width={width} />
        {children}
    </div>
);

interface Native0ButtonProps {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    enabled?: boolean;
    onClick?: () => void;
    name?: string;
}

export const Native0Button: FC<Native0ButtonProps> = ({ x, y, width, height, label, enabled = true, onClick, name }) => {
    const [over, setOver] = useState(false);
    const [down, setDown] = useState(false);
    const state = !enabled ? 'disabled' : down ? 'pressed' : over ? 'hovering' : 'default';
    const labelRef = useRef<HTMLSpanElement>(null);
    const [labelOffset, setLabelOffset] = useState({ left: 0, top: 0 });

    // The label is centred on whole pixels (flex centring lands on half pixels and blurs the pixel glyphs); a label wider than the face minus 5px of padding on both sides
    // starts 10px in and runs under the right edge (the native "Send Message" button).
    useLayoutEffect(() => {
        const element = labelRef.current;

        if (!element) return;

        const place = () => setLabelOffset({ left: element.offsetWidth > width - 10 ? 10 : Math.ceil((width - element.offsetWidth) / 2), top: Math.ceil((height - element.offsetHeight) / 2) });

        place();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(place);

        observer.observe(element);

        return () => observer.disconnect();
    }, [label, width, height]);

    return (
        <div
            className="native0-box native0-button"
            data-native-name={name}
            data-native-enabled={enabled}
            style={rect(x, y, width, height)}
            onClick={enabled ? onClick : undefined}
            onPointerDown={() => enabled && setDown(true)}
            onPointerEnter={() => setOver(true)}
            onPointerLeave={() => {
                setOver(false);
                setDown(false);
            }}
            onPointerUp={() => setDown(false)}
        >
            <NativeSkinView atlas={blueAtlas} height={height} layout="button" skin={SKINS.button} state={state} width={width} />
            <div className="native0-button__label" style={{ width, height, color: enabled ? '#000' : '#808080' }}>
                <span ref={labelRef} className="native0-text__line" style={{ display: 'block', position: 'absolute', whiteSpace: 'nowrap', left: labelOffset.left + 1, top: labelOffset.top }}>
                    {label}
                </span>
            </div>
        </div>
    );
};

export const Native0Checkbox: FC<{ x: number; y: number; checked: boolean; enabled?: boolean; onToggle: () => void; name?: string }> = ({ x, y, checked, enabled = true, onToggle, name }) => (
    <div className="native0-box native0-checkbox" data-native-name={name} data-native-enabled={enabled} style={rect(x, y, 16, 16)} onClick={enabled ? onToggle : undefined}>
        <NativeSkinView atlas={blueAtlas} height={16} layout="button_checkbox" skin={SKINS.checkbox} state={checked ? 'selected' : 'default'} width={16} />
    </div>
);

interface Native0InputProps {
    x: number;
    y: number;
    width: number;
    height: number;
    value: string;
    /** The TextField background: transparent until the field has been focused or filled, then white. */
    active: boolean;
    onChange: (value: string) => void;
    onFocus?: () => void;
    name?: string;
}

/** `input` window with border=true: a 1px black outline, Volter text inside the 2px gutter, white background once active. */
export const Native0Input: FC<Native0InputProps> = ({ x, y, width, height, value, active, onChange, onFocus, name }) => (
    <textarea
        className={`native0-input${active ? ' is-active' : ''}`}
        data-native-name={name}
        spellCheck={false}
        style={rect(x, y, width, height)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
    />
);

interface Native0DropmenuProps {
    x: number;
    y: number;
    width: number;
    height: number;
    caption: string;
    items: string[];
    open: boolean;
    onToggle: () => void;
    onSelect: (index: number) => void;
    name?: string;
}

/** dropmenu style 0: the closed menu is the dropmenu_frame skin with the caption at (10, 4); the open list is a white box over the menu (outline, 1px, then 16px rows) with a grey hover row. */
export const Native0Dropmenu: FC<Native0DropmenuProps> = ({ x, y, width, height, caption, items, open, onToggle, onSelect, name }) => {
    const [hover, setHover] = useState(-1);

    return (
        <div className="native0-box native0-dropmenu" data-native-name={name} style={rect(x, y, width, height)}>
            <NativeSkinView atlas={blueAtlas} height={height} layout="dropmenu_frame" skin={SKINS.dropmenu} width={width} />
            <Native0Text text={caption} width={width - 40} x={10} y={4} />
            <div className="native0-dropmenu__region" onClick={onToggle} />
            {open && (
                <div className="native0-dropmenu__list" style={{ top: 0, width, height: items.length * 16 + 7 }} onPointerLeave={() => setHover(-1)}>
                    <NativeSkinView atlas={blueAtlas} height={items.length * 16 + 7} layout="dropmenu_frame" skin={DROPMENU_LIST} width={width} />
                    {items.map((item, index) => (
                        <div key={index} className={`native0-dropmenu__item${hover === index ? ' is-hover' : ''}`} style={{ top: 2 + index * 16 }} onClick={() => onSelect(index)} onPointerMove={() => setHover(index)}>
                            <Native0Text text={item} width={width - 12} x={7} y={1} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface Native0FrameProps {
    width: number;
    height: number;
    caption: string;
    onClose: () => void;
    children?: ReactNode;
    className?: string;
}

/** Frame style 0: blue skin, header (6,6) with tiled centre and shine, centred frame_title caption, 15x15 close button; content sits at (6,25). */
export const Native0Frame: FC<Native0FrameProps> = ({ width, height, caption, onClose, children, className = '' }) => {
    const headerWidth = width - 12;
    const [closeState, setCloseState] = useState<'default' | 'hovering' | 'pressed'>('default');
    const captionRef = useRef<HTMLDivElement>(null);
    const [captionWidth, setCaptionWidth] = useState(0);

    useEffect(() => {
        const element = captionRef.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => setCaptionWidth(element.offsetWidth));

        observer.observe(element);

        return () => observer.disconnect();
    }, [caption]);

    return (
        <section aria-label={caption} className={`native0-frame ${className}`.trim()} role="dialog" style={{ width, height }}>
            <NativeSkinView atlas={blueAtlas} color={FRAME_COLOR} height={height} layout="frame" skin={SKINS.frame} width={width} />
            <div className="native0-header" style={rect(6, 6, headerWidth, 15)}>
                <NativeSkinView atlas={blueAtlas} color={FRAME_COLOR} height={15} layout="header" skin={SKINS.header} width={headerWidth} />
                <div className="native0-header__caption-bg" style={{ left: Math.floor((headerWidth - captionWidth) / 2), top: 0, width: captionWidth, height: 15 }} />
                <div ref={captionRef} className="native0-header__caption" style={{ left: Math.floor((headerWidth - captionWidth) / 2), top: 0, height: 15 }}>
                    <span className="native0-text__line is-bold">{caption}</span>
                </div>
                <div
                    className="native0-close"
                    style={rect(headerWidth - 15, 0, 15, 15)}
                    onClick={onClose}
                    onPointerDown={() => setCloseState('pressed')}
                    onPointerEnter={() => setCloseState('hovering')}
                    onPointerLeave={() => setCloseState('default')}
                    onPointerUp={() => setCloseState('hovering')}
                >
                    <NativeSkinView atlas={blueAtlas} height={15} fill={FRAME_COLOR} layout="button_close" skin={SKINS.close} state={closeState} width={15} />
                </div>
            </div>
            <div className="native0-client" style={{ left: 6, top: 25 }}>
                {children}
            </div>
        </section>
    );
};

export const NATIVE0_DROPMENU = SKINS.dropmenu;
export { blueAtlas as NATIVE0_ATLAS };
