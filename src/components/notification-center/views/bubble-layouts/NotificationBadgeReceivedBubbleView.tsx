import { FC } from 'react';
import { AchievementNotificationBubbleItem, CreateLinkEvent, localizeWithFallback, LocalizeText, NotificationBubbleItem } from '../../../../api';
import { NativeNotificationBubbleView } from '../native/NativeNotificationBubbleView';

export interface NotificationBadgeReceivedBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

// v75 shows achievement and badge notifications as default bubbles; clicking opens the achievements (by category) or the badge inventory.
export const NotificationBadgeReceivedBubbleView: FC<NotificationBadgeReceivedBubbleViewProps> = ({ item = null, onClose = null }) => {
    const isAchievement = item instanceof AchievementNotificationBubbleItem;
    const message = isAchievement
        ? item.message
        : item.senderName
          ? LocalizeText('notifications.text.received.badge', ['user_name'], [item.senderName])
          : localizeWithFallback('notification.new.badge', `You received the badge ${item.message}`, ['badge_name'], [item.message]);

    return (
        <NativeNotificationBubbleView
            iconUrl={item.iconUrl}
            message={message}
            onActivate={() => CreateLinkEvent(isAchievement ? item.linkUrl : 'inventory/open/badges')}
            onClose={onClose}
        />
    );
};
