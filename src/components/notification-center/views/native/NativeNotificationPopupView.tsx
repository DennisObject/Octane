import { FC, useState } from 'react';
import { SanitizeHtml } from '../../../../api';
import { NativeModalView } from './NativeModalView';
import { openNativeNotificationLink } from './openNativeNotificationLink';

export interface NativeNotificationPopupViewProps {
    title: string;
    message: string;
    linkTitle?: string;
    linkUrl?: string;
    imageUrl?: string;
    onClose: () => void;
}

// layout_notification_popup_xml (HabboNotificationsCom): modal frame with an optional illustration, the message and either an underlined
// link (web pages) or an "action" button ("event:" links, which also close the popup). Closed only by the header button.
export const NativeNotificationPopupView: FC<NativeNotificationPopupViewProps> = (props) => {
    const { title, message, linkTitle = '', linkUrl = '', imageUrl = '', onClose } = props;
    const [imageFailed, setImageFailed] = useState(false);
    const hasImage = !!imageUrl && !imageFailed;
    const isEvent = linkUrl.startsWith('event:');
    const linkCaption = linkTitle || linkUrl;

    return (
        <NativeModalView baseHeight={87} baseWidth={306} offsetY={14}>
            <section
                aria-label={title}
                aria-modal="true"
                className={`volt-alert volt-card-shell volt-card-frame-3 volt-native-alert is-popup`}
                role="dialog"
            >
                <div aria-hidden="true" className="volt-native-popup-tint" />
                <div className="volt-card-header-shell">
                    <span className="volt-card-title">{title}</span>
                    <button aria-label={title} className="volt-card-close-button" type="button" onClick={onClose} />
                </div>
                <div className="volt-native-popup-list">
                    {hasImage && <img alt="" className="volt-native-popup-illustration" src={imageUrl} onError={() => setImageFailed(true)} />}
                    <div className="volt-native-popup-column">
                        <div className="volt-native-popup-message" dangerouslySetInnerHTML={{ __html: SanitizeHtml(message.replace(/\r\n|\r|\n/g, '<br />')) }} />
                        {!!linkUrl && !isEvent && (
                            <button className="volt-native-link" type="button" onClick={() => openNativeNotificationLink(linkUrl)}>
                                {linkCaption}
                            </button>
                        )}
                        {!!linkUrl && isEvent && (
                            <button
                                className="volt-native-button"
                                type="button"
                                onClick={() => {
                                    openNativeNotificationLink(linkUrl);
                                    onClose();
                                }}
                            >
                                {linkCaption}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </NativeModalView>
    );
};
