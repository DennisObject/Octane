import { FC, Ref } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { StaffSection } from '../../../../common';
import type { CatalogAdminOfferForm } from '../../../../hooks/catalog/catalogAdmin.types';
import { CATALOG_ADMIN_MAX_OFFER_AMOUNT } from '../../../../hooks/catalog/catalogAdminForms.helpers';
import { CatalogAdminCheckbox, CatalogAdminNumberField, CatalogAdminSelectField, CatalogAdminTextField } from './CatalogAdminFormControls';

interface CatalogAdminOfferFieldsViewProps {
    draft: CatalogAdminOfferForm;
    patch: (patch: Partial<CatalogAdminOfferForm>) => void;
    fieldErrors: Record<string, string>;
    isNew: boolean;
    limitedSells: number;
    nameRef: Ref<HTMLInputElement>;
    itemIdsRef: Ref<HTMLInputElement>;
}

/** The hotel prices offers in duckets (0) or diamonds (5); a stored other type stays listed so it shows. */
const SUPPORTED_POINT_TYPES = [0, 5];

const currencyOptions = (selected: number) => {
    const types = Array.from(new Set([...SUPPORTED_POINT_TYPES, selected]))
        .filter((type) => type >= 0)
        .sort((left, right) => left - right);

    return types.map((type) => {
        const name = localizeWithFallback(`purse.seasonal.currency.${type}`, LocalizeText('catalog.admin.offer.currency', ['type'], [String(type)]));

        return { value: String(type), label: `${name} (${type})` };
    });
};

/** Offer fields the hotel stores; it sells one furni per offer and keeps no song id, so neither is offered. */
export const CatalogAdminOfferFieldsView: FC<CatalogAdminOfferFieldsViewProps> = (props) => {
    const { draft, patch, fieldErrors, isNew, limitedSells, nameRef, itemIdsRef } = props;
    const pointTypeOptions = currencyOptions(draft.pointsType);

    return (
        <>
            <StaffSection title={LocalizeText('catalog.admin.offer.general')}>
                <CatalogAdminTextField
                    error={fieldErrors.catalogName}
                    inputRef={nameRef}
                    label={LocalizeText('catalog.admin.offer.name')}
                    placeholder={LocalizeText('catalog.admin.offer.name.placeholder')}
                    value={draft.catalogName}
                    onChange={(catalogName) => patch({ catalogName })}
                />
                <CatalogAdminTextField
                    error={fieldErrors.itemIds}
                    inputRef={itemIdsRef}
                    label={LocalizeText('catalog.admin.offer.item.ids')}
                    placeholder={LocalizeText('catalog.admin.offer.item.ids.placeholder')}
                    value={draft.itemIds}
                    onChange={(itemIds) => patch({ itemIds })}
                />
                <div className="octane-staff-grid octane-catalog-admin-grid-3">
                    <CatalogAdminNumberField
                        error={fieldErrors.amount}
                        fallback={1}
                        label={LocalizeText('catalog.admin.offer.quantity')}
                        max={CATALOG_ADMIN_MAX_OFFER_AMOUNT}
                        min={1}
                        value={draft.amount}
                        onChange={(amount) => patch({ amount })}
                    />
                    <CatalogAdminNumberField
                        error={fieldErrors.orderNumber}
                        label={LocalizeText('catalog.admin.order')}
                        value={draft.orderNumber}
                        onChange={(orderNumber) => patch({ orderNumber })}
                    />
                    <CatalogAdminNumberField
                        error={fieldErrors.offerIdGroup}
                        fallback={-1}
                        label={LocalizeText('catalog.admin.offer.client.id')}
                        value={draft.offerIdGroup}
                        onChange={(offerIdGroup) => patch({ offerIdGroup })}
                    />
                </div>
            </StaffSection>
            <StaffSection title={LocalizeText('catalog.admin.offer.prices')}>
                <div className="octane-staff-grid octane-catalog-admin-grid-3">
                    <CatalogAdminNumberField
                        error={fieldErrors.costCredits}
                        label={LocalizeText('catalog.admin.offer.credits')}
                        min={0}
                        value={draft.costCredits}
                        onChange={(costCredits) => patch({ costCredits })}
                    />
                    <CatalogAdminNumberField
                        error={fieldErrors.costPoints}
                        label={LocalizeText('catalog.admin.offer.points')}
                        min={0}
                        value={draft.costPoints}
                        onChange={(costPoints) => patch({ costPoints })}
                    />
                    <CatalogAdminSelectField
                        label={LocalizeText('catalog.admin.offer.points.type')}
                        error={fieldErrors.pointsType}
                        options={pointTypeOptions}
                        value={String(draft.pointsType)}
                        onChange={(value) => patch({ pointsType: Number(value) })}
                    />
                </div>
            </StaffSection>
            <StaffSection title={LocalizeText('catalog.admin.offer.options')}>
                <div className="octane-staff-grid octane-catalog-admin-grid-3">
                    <CatalogAdminNumberField
                        error={fieldErrors.limitedStack}
                        label={LocalizeText('catalog.admin.offer.limited.stack')}
                        min={0}
                        value={draft.limitedStack}
                        onChange={(limitedStack) => patch({ limitedStack })}
                    />
                    {!isNew && (
                        <CatalogAdminNumberField
                            readOnly
                            label={LocalizeText('catalog.admin.offer.limited.sold')}
                            value={limitedSells}
                            onChange={() => undefined}
                        />
                    )}
                </div>
                <CatalogAdminTextField
                    error={fieldErrors.extradata}
                    label={LocalizeText('catalog.admin.offer.extradata')}
                    value={draft.extradata}
                    onChange={(extradata) => patch({ extradata })}
                />
                <div className="octane-staff-row octane-catalog-admin-flags">
                    <CatalogAdminCheckbox
                        label={LocalizeText('catalog.admin.offer.club.only')}
                        value={draft.clubOnly}
                        onChange={(clubOnly) => patch({ clubOnly })}
                    />
                    <CatalogAdminCheckbox
                        label={LocalizeText('catalog.admin.offer.have.offer')}
                        value={draft.haveOffer}
                        onChange={(haveOffer) => patch({ haveOffer })}
                    />
                </div>
            </StaffSection>
        </>
    );
};
