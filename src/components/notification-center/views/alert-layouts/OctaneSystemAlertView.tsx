import { FC } from 'react';
import { NotificationAlertItem } from '../../../../api';
import { Column, LayoutNotificationAlertView, LayoutNotificationAlertViewProps, Text } from '../../../../common';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

export const OctaneSystemAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { title = 'Octane', onClose = null, classNames = [], ...rest } = props;

    return (
        <LayoutNotificationAlertView title={title} onClose={onClose} classNames={['octane-alert-system', ...classNames]} {...rest}>
            <Column alignItems="center">
                <Text center>
                    Octane is a fork of Nitro React and its companion Nitro Renderer, and is developed completely independently with no further ties to Billsonnn / Nitro.
                </Text>
                <Text center>
                    We&apos;re very grateful to Bill for all the work he put into Nitro. Octane wouldn&apos;t exist without it.
                </Text>
            </Column>
        </LayoutNotificationAlertView>
    );
};
