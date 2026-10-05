import { FC } from 'react';
import { SanitizeHtml } from '../../../../api';
import { BUBBLE_FADE_IN_MS, useNativeBubbleLife } from './useNativeBubbleLife';

export interface NativeNotificationBubbleViewProps {
    message: string;
    iconUrl?: string;
    /** Run when the bubble is clicked, before it fades out. */
    onActivate?: () => void;
    onClose: () => void;
}

// layout_notification_xml: 190x66 style-1 (black) border, 50x50 icon at (8,8), Volter Bold white text at (66,8) 116 wide. Click acts on
// the item's link and fades the bubble out; it fades in and out over a second each and stays 15 s.
export const NativeNotificationBubbleView: FC<NativeNotificationBubbleViewProps> = ({ message, iconUrl, onActivate, onClose }) => {
    const { shown, dismiss, hoverProps } = useNativeBubbleLife(onClose);

    return (
        <div className="octane-native-bubble-slot">
            <div
                className="octane-native-bubble"
                style={{ opacity: shown ? 1 : 0, transition: `opacity ${BUBBLE_FADE_IN_MS}ms linear` }}
                onClick={() => {
                    onActivate?.();
                    dismiss();
                }}
                {...hoverProps}
            >
                <div aria-hidden="true" className="octane-native-bubble-chrome" />
                <div className="octane-native-bubble-icon">{!!iconUrl && <img alt="" draggable={false} src={iconUrl} />}</div>
                <div className="octane-native-bubble-text" dangerouslySetInnerHTML={{ __html: SanitizeHtml(message.replace(/\r\n|\r|\n/g, '<br />')) }} />
            </div>
        </div>
    );
};
