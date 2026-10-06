import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, SanitizeHtml } from '../../../../api';
import frankNeutral from '../../../../assets/images/notifications/frank-neutral.png';
import { NativeText } from '../../../../common/native-text/NativeText';
import { NativeModalView } from './NativeModalView';
import { openNativeNotificationLink } from './openNativeNotificationLink';

export interface NativeSimpleAlertViewProps {
    /** Frame caption (simple_alert_xml caption). */
    caption: string;
    /** Red heading above the message (il_heading_1); omitted when empty. */
    subtitle?: string;
    message: string;
    linkTitle?: string;
    linkUrl?: string;
    imageUrl?: string;
    onClose: () => void;
}

// simple_alert_xml (HabboWindowManagerCom): 310 wide modal frame, no header close button, Close button below an etched separator.
export const NativeSimpleAlertView: FC<NativeSimpleAlertViewProps> = (props) => {
    const { caption, subtitle = '', message, linkTitle = '', linkUrl = '', imageUrl = frankNeutral, onClose } = props;
    const [imageFailed, setImageFailed] = useState(false);
    const [imageWidth, setImageWidth] = useState(32);
    const closeRef = useRef<HTMLButtonElement>(null);
    const hasImage = !!imageUrl && !imageFailed;
    const hasLink = !!linkTitle && !!linkUrl;
    const messageMarkup = useMemo(() => SanitizeHtml(message.replace(/\r\n|\r|\n/g, '<br />')), [message]);
    const plainMessage = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const template = document.createElement('template');
        template.innerHTML = messageMarkup;
        let text = '';
        for (const node of template.content.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
            else if (node.nodeName === 'BR') text += '\n';
            else return null;
        }
        return text;
    }, [messageMarkup]);

    useEffect(() => {
        closeRef.current?.focus({ preventScroll: true });
    }, []);

    const openLink = () => {
        openNativeNotificationLink(linkUrl);
        if (linkUrl.startsWith('event:')) onClose();
    };

    return (
        <NativeModalView>
            <section
                aria-label={caption}
                aria-modal="true"
                className={`octane-alert octane-card-shell octane-card-frame-3 octane-native-alert is-simple${hasImage ? ' has-image' : ''}`}
                role="alertdialog"
                style={{ width: hasImage ? imageWidth + 320 : 310 }}
            >
                <div className="octane-card-header-shell">
                    <span className="octane-card-title">{caption}</span>
                </div>
                <div className="octane-native-alert-list">
                    <div className="octane-native-alert-row">
                        {hasImage && (
                            <img
                                alt=""
                                className="octane-native-alert-illustration"
                                src={imageUrl}
                                onError={() => setImageFailed(true)}
                                onLoad={(event) => setImageWidth(event.currentTarget.naturalWidth)}
                            />
                        )}
                        <div className="octane-native-alert-top">
                            {!!subtitle && <div className="octane-native-alert-subtitle">{subtitle}</div>}
                            {plainMessage !== null ? (
                                <div className="octane-native-alert-message uses-native-text">
                                    <NativeText text={plainMessage} textStyle="il_regular" background={0xe9e9e1} maxWidth={291} />
                                </div>
                            ) : (
                                <div className="octane-native-alert-message" dangerouslySetInnerHTML={{ __html: messageMarkup }} />
                            )}
                        </div>
                    </div>
                    <div className="octane-native-alert-bottom">
                        <div aria-hidden="true" className="octane-native-alert-separator" />
                        <button ref={closeRef} className="octane-native-button is-thick" type="button" onClick={onClose}>
                            {localizeWithFallback('alert.close.button', 'Close')}
                        </button>
                        {hasLink && (
                            <button className="octane-native-link" type="button" onClick={openLink}>
                                {linkTitle}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </NativeModalView>
    );
};
