import { FC, useMemo } from 'react';
import { NativeText } from '../../../../common/native-text/NativeText';
import { getPlainNotificationText } from './getPlainNotificationText';
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
    const { markup: messageMarkup, text: plainMessage } = useMemo(() => getPlainNotificationText(message), [message]);

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
                {plainMessage !== null ? (
                    <div className="octane-native-bubble-text uses-native-text">
                        <NativeText
                            text={plainMessage}
                            textStyle="bold"
                            background={0x3d3d3d}
                            maxWidth={116}
                            overrides={{ color: 0xffffff, antiAliasType: 'advanced', sharpness: 0, thickness: 0, kerning: false }}
                        />
                    </div>
                ) : (
                    <div className="octane-native-bubble-text" dangerouslySetInnerHTML={{ __html: messageMarkup }} />
                )}
            </div>
        </div>
    );
};
