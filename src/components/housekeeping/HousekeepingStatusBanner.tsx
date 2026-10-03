import { FC, useEffect } from 'react';
import { LocalizeText } from '../../api';
import { StaffStatus } from '../../common';
import { localizeHousekeepingMessage, useHousekeepingStore } from '../../hooks';

const SUCCESS_DISMISS_MS = 4000;

export const HousekeepingStatusBanner: FC = () => {
    const { lastError, lastSuccess, clearStatus, isActionPending } = useHousekeepingStore();

    useEffect(() => {
        if (!lastSuccess) return;

        const handle = window.setTimeout(clearStatus, SUCCESS_DISMISS_MS);

        return () => window.clearTimeout(handle);
    }, [lastSuccess, clearStatus]);

    const dismissLabel = LocalizeText('housekeeping.status.dismiss');

    if (lastError) return <StaffStatus dismissLabel={dismissLabel} message={localizeHousekeepingMessage(lastError)} tone="error" onDismiss={clearStatus} />;

    if (lastSuccess) return <StaffStatus dismissLabel={dismissLabel} message={localizeHousekeepingMessage(lastSuccess)} tone="success" onDismiss={clearStatus} />;

    if (isActionPending) return <StaffStatus message={LocalizeText('housekeeping.action.pending')} tone="pending" />;

    return null;
};
