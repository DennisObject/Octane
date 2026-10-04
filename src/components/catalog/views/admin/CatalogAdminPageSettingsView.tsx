import { FC, Ref, useId } from 'react';
import { LocalizeText } from '../../../../api';
import { StaffSection } from '../../../../common';
import { useUserPermissions } from '../../../../hooks';
import type { CatalogAdminPageForm } from '../../../../hooks/catalog/catalogAdmin.types';
import { CATALOG_STUDIO_LAYOUT_CODES } from '../page/layout/catalogLayoutRegistry';
import { CatalogAdminCheckbox, CatalogAdminNumberField, CatalogAdminSelectField, CatalogAdminTextField } from './CatalogAdminFormControls';

interface CatalogAdminPageSettingsViewProps {
    draft: CatalogAdminPageForm;
    patch: (patch: Partial<CatalogAdminPageForm>) => void;
    fieldErrors: Record<string, string>;
    captionRef: Ref<HTMLInputElement>;
}

const LAYOUT_OPTIONS = CATALOG_STUDIO_LAYOUT_CODES.map((code) => ({ value: code, label: code }));

/**
 * Name, placement and access settings of a catalog page. The hotel does not store HC-only pages,
 * a room link, included pages or the icon colour, so those keep the values they were loaded with
 * and are not offered; the mode follows the catalog the page lives in and cannot change.
 */
export const CatalogAdminPageSettingsView: FC<CatalogAdminPageSettingsViewProps> = ({ draft, patch, fieldErrors, captionRef }) => {
    const permissions = useUserPermissions();
    const permissionSuggestionsId = useId();
    const permissionKeys = Array.from(permissions).filter(([, value]) => value === 1).map(([key]) => key).sort();
    const modeLabel = LocalizeText(`catalog.admin.page.mode.${draft.catalogMode.toLowerCase()}`);

    return (
        <>
            <StaffSection title={LocalizeText('catalog.admin.page.section.identity')}>
                <CatalogAdminTextField
                    error={fieldErrors.caption}
                    inputRef={captionRef}
                    label={LocalizeText('catalog.admin.page.caption')}
                    value={draft.caption}
                    onChange={(caption) => patch({ caption })}
                />
                <CatalogAdminTextField
                    error={fieldErrors.captionSave}
                    label={LocalizeText('catalog.admin.page.caption.save')}
                    value={draft.captionSave}
                    onChange={(captionSave) => patch({ captionSave })}
                />
                <div className="octane-staff-grid">
                    <CatalogAdminTextField
                        error={fieldErrors.requiredPermission}
                        label={LocalizeText('catalog.admin.page.required.permission')}
                        list={permissionSuggestionsId}
                        placeholder={LocalizeText('catalog.admin.page.required.permission.everyone')}
                        value={draft.requiredPermission}
                        onChange={(requiredPermission) => patch({ requiredPermission })}
                    />
                    <datalist id={permissionSuggestionsId}>
                        {permissionKeys.map((key) => <option key={key} value={key} />)}
                    </datalist>
                    <CatalogAdminNumberField
                        error={fieldErrors.iconImage}
                        label={LocalizeText('catalog.admin.page.icon.image')}
                        min={0}
                        value={draft.iconImage}
                        onChange={(iconImage) => patch({ iconImage })}
                    />
                </div>
            </StaffSection>
            <StaffSection title={LocalizeText('catalog.admin.page.section.display')}>
                <div className="octane-staff-grid">
                    <CatalogAdminTextField readOnly error={fieldErrors.catalogMode} label={LocalizeText('catalog.admin.page.mode')} value={modeLabel} />
                    <CatalogAdminSelectField
                        error={fieldErrors.pageLayout}
                        label={LocalizeText('catalog.admin.page.layout')}
                        options={LAYOUT_OPTIONS}
                        value={draft.pageLayout}
                        onChange={(pageLayout) => patch({ pageLayout })}
                    />
                    <CatalogAdminNumberField
                        error={fieldErrors.orderNum}
                        label={LocalizeText('catalog.admin.order')}
                        value={draft.orderNum}
                        onChange={(orderNum) => patch({ orderNum })}
                    />
                    <CatalogAdminNumberField
                        error={fieldErrors.parentId}
                        fallback={-1}
                        label={LocalizeText('catalog.admin.page.parent.id')}
                        value={draft.parentId}
                        onChange={(parentId) => patch({ parentId })}
                    />
                </div>
                <div className="octane-staff-row octane-catalog-admin-flags">
                    <CatalogAdminCheckbox label={LocalizeText('catalog.admin.visible')} value={draft.visible} onChange={(visible) => patch({ visible })} />
                    <CatalogAdminCheckbox label={LocalizeText('catalog.admin.enabled')} value={draft.enabled} onChange={(enabled) => patch({ enabled })} />
                </div>
            </StaffSection>
        </>
    );
};
