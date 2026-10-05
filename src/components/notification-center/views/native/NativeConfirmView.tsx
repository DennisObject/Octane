import { FC } from 'react';
import { DraggableWindow } from '../../../../common';

export interface NativeConfirmViewProps {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
}

// habbo_window_confirm_xml (HabboWindowManagerCom): 300x165 frame, text at (16,14) 253x72, underlined cancel link at (20,102) and
// a thick OK button at (196,98). The header close button answers as cancel. Not modal; opened centred.
export const NativeConfirmView: FC<NativeConfirmViewProps> = ({ title, message, confirmText, cancelText, onConfirm, onCancel }) => (
    <DraggableWindow dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }} handleSelector=".octane-card-header-shell">
        <section aria-label={title} className="octane-alert octane-card-shell octane-card-frame-3 octane-native-confirm" role="dialog">
            <div className="octane-card-header-shell">
                <span className="octane-card-title">{title}</span>
                <button aria-label={cancelText} className="octane-card-close-button" type="button" onClick={onCancel} />
            </div>
            <div className="octane-native-confirm-body">
                <div className="octane-native-confirm-text">{message}</div>
                <button className="octane-native-link octane-native-confirm-cancel" type="button" onClick={onCancel}>
                    {cancelText}
                </button>
                <button className="octane-native-button is-thick octane-native-confirm-ok" type="button" onClick={onConfirm}>
                    {confirmText}
                </button>
            </div>
        </section>
    </DraggableWindow>
);
