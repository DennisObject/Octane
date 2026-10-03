import { LocalizeText } from '../../api/utils/LocalizeText';
import type { CatalogAdminStatus } from './catalogAdmin.types';
import type { CatalogAdminSaveStatus } from './catalogAdminSmartSave.reducer';

interface CatalogAdminEditorStatusInput {
    sessionReady: boolean;
    detailsReady: boolean;
    /** Localisation key shown while the stored row is loading. */
    loadingKey: string;
    /** Localisation key of the first validation problem, if any. */
    validationKey: string | null;
    isDirty: boolean;
    saveStatus: CatalogAdminSaveStatus;
    saveMessage: string | null;
    lastSavedAt: number | null;
}

/** The one line an editor shows above its buttons, most urgent first. */
export const resolveCatalogAdminEditorStatus = (input: CatalogAdminEditorStatusInput): CatalogAdminStatus | null => {
    if (!input.sessionReady) return { tone: 'pending', message: LocalizeText('catalog.admin.status.connecting') };
    if (!input.detailsReady) return { tone: 'pending', message: LocalizeText(input.loadingKey) };

    switch (input.saveStatus) {
        case 'saving':
            return { tone: 'pending', message: LocalizeText('catalog.admin.status.saving') };
        case 'conflict':
            return { tone: 'error', message: input.saveMessage || LocalizeText('catalog.admin.status.conflict') };
        case 'error':
            return { tone: 'error', message: input.saveMessage || LocalizeText('catalog.admin.error.failed') };
    }

    if (input.validationKey) return { tone: input.isDirty ? 'error' : 'pending', message: LocalizeText(input.validationKey) };
    if (input.isDirty) return { tone: 'pending', message: LocalizeText('catalog.admin.status.unsaved') };
    if (!input.lastSavedAt) return null;

    const time = new Date(input.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return { tone: 'success', message: LocalizeText('catalog.admin.status.saved', ['time'], [time]) };
};
