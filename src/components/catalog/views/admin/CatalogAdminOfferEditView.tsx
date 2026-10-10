import { FC, useEffect, useRef } from 'react';
import { LocalizeText } from '../../../../api';
import { StaffWindow } from '../../../../common';
import type { CatalogAdminOfferEditorTarget } from '../../../../hooks/catalog/catalogAdmin.types';
import { getCatalogAdminOfferIconUrl } from '../../../../hooks/catalog/catalogAdminForms.helpers';
import { useCatalogAdminUiStore } from '../../../../hooks/catalog/catalogAdminUiStore';
import { useCatalogAdminOfferForm } from '../../../../hooks/catalog/useCatalogAdminOfferForm';
import { useCatalogAdmin } from '../../CatalogAdminContext';
import { CatalogAdminEditorFooterView } from './CatalogAdminEditorFooterView';
import { CatalogAdminOfferFieldsView } from './CatalogAdminOfferFieldsView';
import { CatalogAdminOfferIconView } from './CatalogAdminOfferIconView';
import { CatalogAdminOfferPriceView } from './CatalogAdminOfferPriceView';

const CatalogAdminOfferEditorWindow: FC<{ target: CatalogAdminOfferEditorTarget }> = ({ target }) => {
    const form = useCatalogAdminOfferForm(target);
    const nameRef = useRef<HTMLInputElement>(null);
    const itemIdsRef = useRef<HTMLInputElement>(null);
    const { draft, fieldErrors } = form;

    useEffect(() => {
        if (fieldErrors.catalogName) nameRef.current?.focus();
        else if (fieldErrors.itemIds) itemIdsRef.current?.focus();
    }, [fieldErrors]);

    const offerMeta = form.isNew
        ? LocalizeText('catalog.admin.offer.new')
        : LocalizeText('catalog.admin.offer.meta', ['id', 'amount'], [String(draft.offerId), String(draft.amount)]);

    return (
        <StaffWindow
            className="volt-catalog-admin-editor"
            title={form.isNew ? LocalizeText('catalog.admin.offer.new') : LocalizeText('catalog.admin.offer.edit')}
            uniqueKey="catalog-admin-offer-editor"
            onClose={form.requestClose}
        >
            <div className="volt-catalog-admin-editor-layout" onKeyDown={form.onKeyDown}>
                <div className="volt-catalog-admin-editor-scroll">
                    <div className="volt-staff-row volt-catalog-admin-editor-head">
                        <span className="volt-catalog-admin-editor-icon">
                            {!form.isNew && target.offer && <CatalogAdminOfferIconView offer={target.offer} url={getCatalogAdminOfferIconUrl(target.offer)} />}
                        </span>
                        <div className="volt-catalog-admin-editor-titles">
                            <strong title={form.displayName}>{form.displayName}</strong>
                            <span className="volt-staff-muted">{offerMeta}</span>
                        </div>
                        <CatalogAdminOfferPriceView credits={draft.costCredits} points={draft.costPoints} pointsType={draft.pointsType} />
                    </div>
                    <fieldset className="volt-catalog-admin-fieldset" disabled={!form.detailsReady}>
                        <CatalogAdminOfferFieldsView
                            draft={draft}
                            fieldErrors={fieldErrors}
                            isNew={form.isNew}
                            itemIdsRef={itemIdsRef}
                            limitedSells={form.limitedSells}
                            nameRef={nameRef}
                            patch={form.patch}
                        />
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

/** The offer editor window; one at a time, remounted for every offer it opens. */
export const CatalogAdminOfferEditView: FC = () => {
    const target = useCatalogAdminUiStore((state) => state.offerEditor);
    const canEdit = useCatalogAdmin()?.canEdit ?? false;

    if (!target || !canEdit) return null;

    return <CatalogAdminOfferEditorWindow key={target.key} target={target} />;
};
