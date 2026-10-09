import { FC, useLayoutEffect, useRef, useState } from 'react';
import { SanitizeHtml } from '../../../api';
import { NativeText } from '../../../common/native-text/NativeText';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';

export const HELP_PANEL_COLOR = 0xe9e9e1;
export const HELP_WHITE_COLOR = 0xffffff;
export const HELP_USER_HEADER_COLOR = 0x8899a2;

interface HelpTextProps {
    text: string;
    textStyle?: NativeTextStyleName;
    maxWidth?: number;
    background?: number;
    color?: number;
    size?: number;
    underline?: boolean;
    /** Player-derived text (chat lines, names, the typed report): always literal, never markup or <br>. Only localized copy may carry markup. */
    plain?: boolean;
    /** Label drawn over a button skin. Light: white glyphs on black with screen blend; dark: black glyphs on white with multiply blend. Both equal source-over. */
    onButton?: 'light' | 'dark';
}

const hasMarkup = (value: string) => /<(?!br\s*\/?>)[a-z/]/i.test(value);
const toPlainText = (value: string) => value.replace(/<br\s*\/?>/gi, '\n');

// v75 TextField raster (HabboWindowManagerCom text_styles_css); markup the native text cannot express keeps the DOM text.
export const HelpText: FC<HelpTextProps> = ({ text, textStyle = 'u_regular', maxWidth, background = HELP_PANEL_COLOR, color, size, underline, onButton, plain }) => {
    if (!plain && !onButton && hasMarkup(text)) return <span dangerouslySetInnerHTML={{ __html: SanitizeHtml(text) }} />;

    if (onButton) {
        const light = onButton === 'light';

        return (
            <NativeText
                text={toPlainText(text)}
                textStyle={textStyle}
                background={light ? 0x000000 : 0xffffff}
                overrides={{ color: light ? 0xffffff : 0x000000, ...(size === undefined ? {} : { size }) }}
                maxWidth={maxWidth}
                style={{ mixBlendMode: light ? 'screen' : 'multiply' }}
            />
        );
    }

    const overrides = { ...(color === undefined ? {} : { color }), ...(size === undefined ? {} : { size }), ...(underline === undefined ? {} : { underline }) };

    return <NativeText text={plain ? text : toPlainText(text)} textStyle={textStyle} background={background} maxWidth={maxWidth} overrides={overrides} />;
};

// auto_size="center": the TextField is placed at floor((width - fieldWidth) / 2) inside its window, never on a half pixel.
export const HelpCenteredText: FC<HelpTextProps & { width: number }> = ({ width, ...props }) => {
    const fieldRef = useRef<HTMLSpanElement>(null);
    const [left, setLeft] = useState(0);

    useLayoutEffect(() => {
        const field = fieldRef.current;

        if (!field) return;

        const place = () => setLeft(Math.floor((width - field.offsetWidth) / 2));
        const observer = new ResizeObserver(place);

        place();
        observer.observe(field);

        return () => observer.disconnect();
    }, [width]);

    return (
        <span ref={fieldRef} style={{ display: 'inline-block', position: 'relative', left }}>
            <HelpText {...props} />
        </span>
    );
};

export const HELP_FRAME_TITLE_COLOR = 0x377998;

// Frame caption: u_frame_title, white on the flat 0x377998 header, centred in the strip left of the close button (frame width - 20).
export const HelpFrameTitle: FC<{ text: string; width: number }> = ({ text, width }) => (
    <HelpCenteredText text={text} width={width - 20} textStyle="u_frame_title" color={0xffffff} background={HELP_FRAME_TITLE_COLOR} />
);
