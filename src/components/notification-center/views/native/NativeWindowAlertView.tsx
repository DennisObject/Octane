import { FC, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { DraggableWindow } from '../../../../common';
import { NativeText } from '../../../../common/native-text/NativeText';

const FRAME_HEIGHT = 141;

// auto_size="center": the TextField sits at floor((width - fieldWidth) / 2) inside its window, never on a half pixel.
const CenteredField: FC<{ width: number; children: ReactNode }> = ({ width, children }) => {
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
            {children}
        </span>
    );
};

export interface NativeWindowAlertViewProps {
    title: string;
    message: string;
    onClose: () => void;
}

// habbo_window_alert_xml (HabboWindowManagerCom), the windowManager.alert frame: 278x141, content origin (6,25), text at (27,14) 210 wide
// (57 high at least), thick Ok button 50x24 centred once the cancel and custom buttons collapse. The header close button answers like Ok.
// Not modal; opened centred, and a longer text only grows the window downwards.
export const NativeWindowAlertView: FC<NativeWindowAlertViewProps> = ({ title, message, onClose }) => {
    const frameRef = useRef<HTMLElement>(null);
    const okRef = useRef<HTMLButtonElement>(null);
    const [growth, setGrowth] = useState(0);

    useEffect(() => {
        okRef.current?.focus({ preventScroll: true });
    }, []);

    // The native text arrives after the font loads and a replaced message re-wraps, so follow the frame instead of measuring once.
    useLayoutEffect(() => {
        const frame = frameRef.current;

        if (!frame) return;

        const measure = () => setGrowth(Math.max(0, frame.offsetHeight - FRAME_HEIGHT));
        const observer = new ResizeObserver(measure);

        measure();
        observer.observe(frame);

        return () => observer.disconnect();
    }, []);

    return (
        <DraggableWindow dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }} handleSelector=".volt-card-header-shell" offsetTop={growth / 2}>
            <section ref={frameRef} aria-label={title} className="volt-alert volt-card-shell volt-card-frame-3 volt-native-confirm volt-native-window-alert" role="alertdialog">
                <div className="volt-card-header-shell">
                    <span className="volt-card-title">
                        <CenteredField width={278}>
                            <NativeText background={0x377998} overrides={{ color: 0xffffff }} text={title} textStyle="u_frame_title" />
                        </CenteredField>
                    </span>
                    <button aria-label={LocalizeText('generic.close')} className="volt-card-close-button" type="button" onClick={onClose} />
                </div>
                <div className="volt-native-window-alert-body">
                    <div className="volt-native-window-alert-text">
                        <NativeText text={message} textStyle="u_regular" background={0xe9e9e1} maxWidth={210} />
                    </div>
                    <button ref={okRef} className="volt-native-button is-thick volt-native-window-alert-ok" type="button" onClick={onClose}>
                        <span className="volt-native-window-alert-ok-label">
                            <CenteredField width={50}>
                                <NativeText background={0xffffff} overrides={{ color: 0x000000 }} style={{ mixBlendMode: 'multiply' }} text="Ok" textStyle="button_shiny_bold" />
                            </CenteredField>
                        </span>
                    </button>
                </div>
            </section>
        </DraggableWindow>
    );
};
