import { FC } from 'react';
import { NotificationBubbleItem, OpenUrl } from '../../../../api';
import { NativeNotificationBubbleView } from '../native/NativeNotificationBubbleView';

export interface NotificationDefaultBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

export const NotificationDefaultBubbleView: FC<NotificationDefaultBubbleViewProps> = ({ item = null, onClose = null }) => (
    <NativeNotificationBubbleView
        iconUrl={item.iconUrl}
        message={item.message}
        onActivate={() => item.linkUrl && item.linkUrl.length && OpenUrl(item.linkUrl)}
        onClose={onClose}
    />
);
