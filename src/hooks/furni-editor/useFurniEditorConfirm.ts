import { useCallback } from 'react';
import { LocalizeText } from '../../api';
import { useNotification } from '../notification';

export interface FurniEditorConfirmText {
    titleKey: string;
    messageKey: string;
    confirmKey: string;
    values?: Record<string, string | number>;
    /** Extra lines under the message, e.g. the changed fields of a save. */
    details?: string[];
}

/** Asks through the hotel confirm dialog; the action only runs on confirm. */
export const useFurniEditorConfirm = () => {
    const { showConfirm } = useNotification();

    return useCallback(
        ({ titleKey, messageKey, confirmKey, values, details = [] }: FurniEditorConfirmText, onConfirm: () => void) => {
            const names = values ? Object.keys(values) : null;
            const message = LocalizeText(messageKey, names, names ? names.map((name) => String(values[name])) : null);

            showConfirm([message, ...details].join('\n'), onConfirm, null, LocalizeText(confirmKey), null, LocalizeText(titleKey));
        },
        [showConfirm]
    );
};
