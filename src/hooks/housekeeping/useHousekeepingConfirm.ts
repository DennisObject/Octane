import { useCallback } from 'react';
import { LocalizeText } from '../../api';
import { useNotification } from '../notification';

/** The in-client confirm dialog with the housekeeping labels, for every destructive action. */
export const useHousekeepingConfirm = () => {
    const { showConfirm } = useNotification();

    return useCallback(
        (message: string, onConfirm: () => void) =>
            showConfirm(
                message,
                onConfirm,
                () => {},
                LocalizeText('housekeeping.confirm.proceed'),
                LocalizeText('housekeeping.confirm.cancel'),
                LocalizeText('housekeeping.confirm.title')
            ),
        [showConfirm]
    );
};
