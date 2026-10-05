import { FC } from 'react';
import { LocalizeText, NotificationBubbleItem, OpenUrl } from '../../../../api';
import { LayoutCurrencyIcon } from '../../../../common';

export interface NotificationClubGiftBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

// club_gift_notification_xml: 192x82 style-9 border (0x686661), club icon (6,7), text (25,7) 174x36, button row at y=44 and an underlined
// "later" link at (8,49). It stays until the gift list is opened or the link is clicked.
export const NotificationClubGiftBubbleView: FC<NotificationClubGiftBubbleViewProps> = ({ item = null, onClose = null }) => (
    <div className="octane-native-club-gift">
        <div aria-hidden="true" className="octane-native-club-gift-chrome" />
        <LayoutCurrencyIcon className="octane-native-club-gift-icon" type="hc" />
        <div className="octane-native-club-gift-text">{LocalizeText('notifications.text.club_gift')}</div>
        <button
            className="octane-native-club-gift-button"
            type="button"
            onClick={() => {
                OpenUrl(item.linkUrl);
                onClose();
            }}
        >
            {LocalizeText('notifications.button.show_gift_list')}
        </button>
        <button className="octane-native-club-gift-later" type="button" onClick={onClose}>
            {LocalizeText('notifications.button.later')}
        </button>
    </div>
);
