import { NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { OctaneInfoAlertView } from './OctaneInfoAlertView';
import { OctaneSystemAlertView } from './OctaneSystemAlertView';
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
        case NotificationAlertType.OCTANE:
            return <OctaneSystemAlertView key={key} {...props} />;
        case NotificationAlertType.OCTANE_INFO:
            return <OctaneInfoAlertView key={key} {...props} />;
        case NotificationAlertType.SEARCH:
            return <NotificationSeachAlertView key={key} {...props} />;
        case NotificationAlertType.WINDOW:
            return <NativeWindowAlertView key={key} message={item.messages.join('\n')} title={item.title} onClose={onClose} />;
        default:
            if (isFurniDataAlert(item)) return <NotificationFurniDataAlertView key={key} {...props} />;

            return <NotificationDefaultAlertView key={key} {...props} />;
    }
};
