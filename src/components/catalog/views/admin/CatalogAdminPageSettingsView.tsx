import { FC, Ref } from 'react';
import { LocalizeText } from '../../../../api';
import { StaffSection } from '../../../../common';
import type { CatalogAdminPageForm } from '../../../../hooks/catalog/catalogAdmin.types';
import { CATALOG_ADMIN_PAGE_MODES } from '../../../../hooks/catalog/catalogAdminForms.helpers';
import { CATALOG_STUDIO_LAYOUT_CODES } from '../page/layout/catalogLayoutRegistry';
import { CatalogAdminCheckbox, CatalogAdminNumberField, CatalogAdminSelectField, CatalogAdminTextField } from './CatalogAdminFormControls';

interface CatalogAdminPageSettingsViewProps {
    draft: CatalogAdminPageForm;
    patch: (patch: Partial<CatalogAdminPageForm>) => void;
    fieldErrors: Record<string, string>;
    captionRef: Ref<HTMLInputElement>;
}

const LAYOUT_OPTIONS = CATALOG_STUDIO_LAYOUT_CODES.map((code) => ({ value: code, label: code }));

/** Name, placement and access settings of a catalog page. */
export const CatalogAdminPageSettingsView: FC<CatalogAdminPageSettingsViewProps> = ({ draft, patch, fieldErrors, captionRef }) => {
    const modeOptions = CATALOG_ADMIN_PAGE_MODES.map((mode) => ({ value: mode, label: LocalizeText(`catalog.admin.page.mode.${mode.toLowerCase()}`) }));

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
                    label={LocalizeText('catalog.admin.page.caption.save')}
                    value={draft.captionSave}
                    onChange={(captionSave) => patch({ captionSave })}
                />
                <div className="octane-staff-grid octane-catalog-admin-grid-3">
                    <CatalogAdminNumberField
                        fallback={1}
                        label={LocalizeText('catalog.admin.page.min.rank')}
                        min={1}
                        value={draft.minRank}
                        onChange={(minRank) => patch({ minRank })}
                    />
                    <CatalogAdminNumberField
                        label={LocalizeText('catalog.admin.page.icon.image')}
                        min={0}
                        value={draft.iconImage}
                        onChange={(iconImage) => patch({ iconImage })}
                    />
                    <CatalogAdminNumberField
                        label={LocalizeText('catalog.admin.page.icon.color')}
                        min={0}
                        value={draft.iconColor}
                        onChange={(iconColor) => patch({ iconColor })}
                    />
                </div>
            </StaffSection>
            <StaffSection title={LocalizeText('catalog.admin.page.section.display')}>
                <div className="octane-staff-grid">
                    <CatalogAdminSelectField
                        label={LocalizeText('catalog.admin.page.mode')}
                        options={modeOptions}
                        value={draft.catalogMode}
                        onChange={(catalogMode) => patch({ catalogMode })}
                    />
                    <CatalogAdminSelectField
                        label={LocalizeText('catalog.admin.page.layout')}
                        options={LAYOUT_OPTIONS}
                        value={draft.pageLayout}
                        onChange={(pageLayout) => patch({ pageLayout })}
                    />
                    <CatalogAdminNumberField label={LocalizeText('catalog.admin.order')} value={draft.orderNum} onChange={(orderNum) => patch({ orderNum })} />
                    <CatalogAdminNumberField
                        fallback={-1}
                        label={LocalizeText('catalog.admin.page.parent.id')}
                        value={draft.parentId}
                        onChange={(parentId) => patch({ parentId })}
                    />
                    <CatalogAdminNumberField
                        label={LocalizeText('catalog.admin.page.room.id')}
                        min={0}
                        value={draft.roomId}
                        onChange={(roomId) => patch({ roomId })}
                    />
                    <CatalogAdminTextField
                        label={LocalizeText('catalog.admin.page.includes')}
                        placeholder="1;2;3"
                        value={draft.includes}
                        onChange={(includes) => patch({ includes })}
                    />
                </div>
                <div className="octane-staff-row octane-catalog-admin-flags">
                    <CatalogAdminCheckbox label={LocalizeText('catalog.admin.visible')} value={draft.visible} onChange={(visible) => patch({ visible })} />
                    <CatalogAdminCheckbox label={LocalizeText('catalog.admin.enabled')} value={draft.enabled} onChange={(enabled) => patch({ enabled })} />
                    <CatalogAdminCheckbox
                        label={LocalizeText('catalog.admin.page.club.only')}
                        value={draft.clubOnly}
                        onChange={(clubOnly) => patch({ clubOnly })}
                    />
                    <CatalogAdminCheckbox
                        label={LocalizeText('catalog.admin.page.vip.only')}
                        value={draft.vipOnly}
                        onChange={(vipOnly) => patch({ vipOnly })}
                    />
                </div>
            </StaffSection>
        </>
    );
};
