import { NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { VoltInfoAlertView } from './VoltInfoAlertView';
import { VoltSystemAlertView } from './VoltSystemAlertView';
import { NotificationDefaultAlertView } from './NotificationDefaultAlertView';
import { EVENT_ALERT_TYPES, NotificationEventAlertView } from './NotificationEventAlertView';
import { isFurniDataAlert, NotificationFurniDataAlertView } from './NotificationFurniDataAlertView';
import { NotificationSeachAlertView } from './NotificationSearchAlertView';
import { NativeWindowAlertView } from '../native/NativeWindowAlertView';

export const GetAlertLayout = (item: NotificationAlertItem, onClose: () => void) => {
    if (!item) return null;

    const key = item.id;
    const props = { item, onClose, autoCloseSeconds: item.timeoutSeconds };

    if (EVENT_ALERT_TYPES.includes(item.alertType)) return <NotificationEventAlertView key={key} {...props} />;

    switch (item.alertType) {
        case NotificationAlertType.VOLT:
            return <VoltSystemAlertView key={key} {...props} />;
        case NotificationAlertType.VOLT_INFO:
            return <VoltInfoAlertView key={key} {...props} />;
        case NotificationAlertType.SEARCH:
            return <NotificationSeachAlertView key={key} {...props} />;
        case NotificationAlertType.WINDOW:
            return <NativeWindowAlertView key={key} message={item.messages.join('\n')} title={item.title} onClose={onClose} />;
        default:
            if (isFurniDataAlert(item)) return <NotificationFurniDataAlertView key={key} {...props} />;

            return <NotificationDefaultAlertView key={key} {...props} />;
    }
};
