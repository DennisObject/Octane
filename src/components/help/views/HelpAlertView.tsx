import { createContext, FC, useContext, useEffect, useRef } from 'react';
import { LocalizeText } from '../../../api';
import { NativeModalView } from '../../notification-center/views/native/NativeModalView';
import { HelpCenteredText, HelpFrameTitle, HelpText } from './HelpText';

export const HelpAlertContext = createContext<(messageKey: string) => void>(() => {});

export const useHelpAlert = () => useContext(HelpAlertContext);

// habbo_window_alert_xml (HabboWindowManagerCom): 278x141 frame, content origin (6,25), text at (27,14) 210 wide, thick Ok button
// centred at (108,81) once the hidden cancel/custom buttons collapse. The header close button answers like Ok.
export const HelpAlertView: FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
    const okRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        okRef.current?.focus({ preventScroll: true });
    }, []);

    const title = LocalizeText('generic.alert.title');

    return (
        <NativeModalView>
            <section aria-label={title} aria-modal="true" className="volt-alert volt-card-shell volt-card-frame-3 volt-native-confirm volt-help-alert" role="alertdialog">
                <div className="volt-card-header-shell">
                    <span className="volt-card-title">
                        <HelpFrameTitle text={title} width={278} />
                    </span>
                    <button aria-label={LocalizeText('generic.close')} className="volt-card-close-button" type="button" onClick={onClose} />
                </div>
                <div className="volt-help-alert-body">
                    <div className="volt-help-alert-text">
                        <HelpText text={message} maxWidth={210} />
                    </div>
                    <button ref={okRef} className="volt-native-button is-thick volt-help-alert-ok" type="button" onClick={onClose}>
                        <span className="volt-help-alert-ok-label">
                            <HelpCenteredText width={50} text="Ok" textStyle="u_regular" onButton="dark" />
                        </span>
                    </button>
                </div>
            </section>
        </NativeModalView>
    );
};
