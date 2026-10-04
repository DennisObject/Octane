import { useCallback } from 'react';
import { LocalizeText } from '../../api';
import { useNotification } from '../notification';
import { useHousekeepingStore } from './useHousekeepingStore';

/**
 * The in-client confirm dialog with the housekeeping labels, for every destructive action.
 * A dialog still open when the panel closes (or, for `selection`, when another user or
 * room is picked) does nothing when confirmed.
 */
export const useHousekeepingConfirm = (scope: 'panel' | 'selection' = 'selection') => {
    const { showConfirm } = useNotification();
    const { captureConfirmScope, isConfirmScopeCurrent } = useHousekeepingStore();

    return useCallback(
        (message: string, onConfirm: () => void) => {
            const token = captureConfirmScope(scope);

            showConfirm(
                message,
                () => isConfirmScopeCurrent(token) && onConfirm(),
                () => {},
                LocalizeText('housekeeping.confirm.proceed'),
                LocalizeText('housekeeping.confirm.cancel'),
                LocalizeText('housekeeping.confirm.title')
            );
        },
        [showConfirm, captureConfirmScope, isConfirmScopeCurrent, scope]
    );
};
