import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, StaffStatus } from '../../../../common';
import type { CatalogAdminStatus } from '../../../../hooks/catalog/catalogAdmin.types';

interface CatalogAdminEditorFooterViewProps {
    status: CatalogAdminStatus | null;
    isNew: boolean;
    isDirty: boolean;
    isSaving: boolean;
    canSave: boolean;
    canDelete: boolean;
    onDelete: () => void;
    onReset: () => void;
    onSave: (closeAfter: boolean) => void;
}

/** Status line and the Delete / Reset / Save buttons shared by the page and offer editors. */
export const CatalogAdminEditorFooterView: FC<CatalogAdminEditorFooterViewProps> = (props) => {
    const { status, isNew, isDirty, isSaving, canSave, canDelete, onDelete, onReset, onSave } = props;
    const canReset = isDirty && !isSaving;

    return (
        <div className="octane-catalog-admin-editor-footer">
            {status && <StaffStatus message={status.message} tone={status.tone} />}
            <div className="octane-staff-row">
                {!isNew && (
                    <Button disabled={!canDelete} variant="danger" onClick={() => canDelete && onDelete()}>
                        {LocalizeText('catalog.admin.delete')}
                    </Button>
                )}
                <span className="octane-catalog-admin-spacer" />
                <Button disabled={!canReset} variant="secondary" onClick={() => canReset && onReset()}>
                    {LocalizeText('catalog.admin.reset')}
                </Button>
                <Button disabled={!canSave} variant="secondary" onClick={() => canSave && onSave(true)}>
                    {LocalizeText('catalog.admin.save.close')}
                </Button>
                <Button disabled={!canSave} variant="primary" onClick={() => canSave && onSave(false)}>
                    {LocalizeText(isNew ? 'catalog.admin.create' : 'catalog.admin.save')}
                </Button>
            </div>
        </div>
    );
};
