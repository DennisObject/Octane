import { FC } from 'react';
import { NotificationAlertItem } from '../../../../api';
import { Column, LayoutNotificationAlertView, LayoutNotificationAlertViewProps, Text } from '../../../../common';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

export const VoltSystemAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { title = 'Volt', onClose = null, classNames = [], ...rest } = props;

    return (
        <LayoutNotificationAlertView title={title} onClose={onClose} classNames={['volt-alert-system', ...classNames]} {...rest}>
            <Column alignItems="center">
                <Text center>
                    Volt started as a fork of duckietm&apos;s Octane, which itself is a fork of Nitro React and its companion Nitro Renderer. It is developed independently, with no further ties to Octane or Billsonnn / Nitro.
                </Text>
                <Text center>
                    We&apos;re very grateful to duckietm for Octane and to Bill for all the work he put into Nitro. Volt wouldn&apos;t exist without them.
                </Text>
            </Column>
        </LayoutNotificationAlertView>
    );
};
