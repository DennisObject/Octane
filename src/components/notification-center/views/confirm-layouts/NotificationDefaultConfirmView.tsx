import { FC } from 'react';
import { NotificationConfirmItem } from '../../../../api';
import { LayoutNotificationAlertViewProps } from '../../../../common';
import { NativeConfirmView } from '../native/NativeConfirmView';

export interface NotificationDefaultConfirmViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationConfirmItem;
}

export const NotificationDefaultConfirmView: FC<NotificationDefaultConfirmViewProps> = (props) => {
    const { item = null, onClose = null } = props;
    const { message = null, onConfirm = null, onCancel = null, confirmText = null, cancelText = null, title = null } = item;

    const confirm = () => {
        if (onConfirm) onConfirm();

        onClose();
    };

    const cancel = () => {
        if (onCancel) onCancel();

        onClose();
    };

    return <NativeConfirmView cancelText={cancelText} confirmText={confirmText} message={message} title={title} onCancel={cancel} onConfirm={confirm} />;
};
