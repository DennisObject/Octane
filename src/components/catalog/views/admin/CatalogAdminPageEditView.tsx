import { FC, useEffect, useRef } from 'react';
import { LocalizeText } from '../../../../api';
import { StaffWindow } from '../../../../common';
import type { CatalogAdminPageEditorTarget } from '../../../../hooks/catalog/catalogAdmin.types';
import { useCatalogAdminUiStore } from '../../../../hooks/catalog/catalogAdminUiStore';
import { useCatalogAdminPageForm } from '../../../../hooks/catalog/useCatalogAdminPageForm';
import { useCatalogAdmin } from '../../CatalogAdminContext';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CatalogAdminEditorFooterView } from './CatalogAdminEditorFooterView';
import { CatalogAdminPageContentView } from './CatalogAdminPageContentView';
import { CatalogAdminPageSettingsView } from './CatalogAdminPageSettingsView';

const targetKey = (target: CatalogAdminPageEditorTarget) =>
    target.kind === 'edit' ? `edit:${target.catalogType}:${target.node.pageId}` : `create:${target.catalogType}:${target.parent.pageId}`;

const CatalogAdminPageEditorWindow: FC<{ target: CatalogAdminPageEditorTarget }> = ({ target }) => {
    const form = useCatalogAdminPageForm(target);
    const captionRef = useRef<HTMLInputElement>(null);
    const { draft } = form;
    const captionError = form.fieldErrors.caption;

    useEffect(() => {
        if (captionError) captionRef.current?.focus();
    }, [captionError]);

    return (
        <StaffWindow
            className="octane-catalog-admin-editor"
            title={form.isNew ? LocalizeText('catalog.admin.create.page') : LocalizeText('catalog.admin.edit.title', ['name'], [form.displayName])}
            uniqueKey="catalog-admin-page-editor"
            onClose={form.requestClose}
        >
            <div className="octane-catalog-admin-editor-layout" onKeyDown={form.onKeyDown}>
                <div className="octane-catalog-admin-editor-scroll">
                    <div className="octane-staff-row octane-catalog-admin-editor-head">
                        <span className="octane-catalog-admin-editor-icon">{draft.iconImage > 0 && <CatalogIconView icon={draft.iconImage} />}</span>
                        <div className="octane-catalog-admin-editor-titles">
                            <strong title={form.displayName}>{form.displayName}</strong>
                            <span className="octane-staff-muted">
                                {LocalizeText(
                                    'catalog.admin.page.meta',
                                    ['id', 'layout', 'mode'],
                                    [String(draft.pageId ?? '-'), draft.pageLayout, draft.catalogMode]
                                )}
                            </span>
                        </div>
                    </div>
                    {form.readOnlyLayout && (
                        <span className="octane-staff-muted">{LocalizeText('catalog.admin.page.readonly', ['layout'], [draft.pageLayout])}</span>
                    )}
                    <fieldset className="octane-catalog-admin-fieldset" disabled={!form.detailsReady}>
                        <CatalogAdminPageSettingsView captionRef={captionRef} draft={draft} fieldErrors={form.fieldErrors} patch={form.patch} />
                        <CatalogAdminPageContentView draft={draft} patch={form.patch} />
                    </fieldset>
                </div>
                <CatalogAdminEditorFooterView
                    canDelete={form.canDelete}
                    canSave={form.canSave}
                    isDirty={form.isDirty}
                    isNew={form.isNew}
                    isSaving={form.isSaving}
                    status={form.status}
                    onDelete={form.requestDelete}
                    onReset={form.reset}
                    onSave={form.save}
                />
            </div>
        </StaffWindow>
    );
};

/** The page editor window; one at a time, remounted for every page it opens. */
export const CatalogAdminPageEditView: FC = () => {
    const target = useCatalogAdminUiStore((state) => state.pageEditor);
    const canEdit = useCatalogAdmin()?.canEdit ?? false;

    if (!target || !canEdit) return null;

    return <CatalogAdminPageEditorWindow key={targetKey(target)} target={target} />;
};
