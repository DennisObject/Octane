import { FC, Ref } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { StaffSection } from '../../../../common';
import { usePurse } from '../../../../hooks';
import type { CatalogAdminOfferForm } from '../../../../hooks/catalog/catalogAdmin.types';
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

/** Credits, duckets and diamonds plus every seasonal currency the user's purse knows about. */
const useCurrencyOptions = (selected: number) => {
    const { purse = null } = usePurse();
    const types = Array.from(new Set([0, 5, 101, selected, ...Array.from(purse?.activityPoints?.keys?.() ?? [])]))
        .filter((type) => type >= 0)
        .sort((left, right) => left - right);

    return types.map((type) => {
        const name = localizeWithFallback(`purse.seasonal.currency.${type}`, LocalizeText('catalog.admin.offer.currency', ['type'], [String(type)]));

        return { value: String(type), label: `${name} (${type})` };
    });
};

export const CatalogAdminOfferFieldsView: FC<CatalogAdminOfferFieldsViewProps> = (props) => {
    const { draft, patch, fieldErrors, isNew, limitedSells, nameRef, itemIdsRef } = props;
    const currencyOptions = useCurrencyOptions(draft.pointsType);

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
                        fallback={1}
                        label={LocalizeText('catalog.admin.offer.quantity')}
                        min={1}
                        value={draft.amount}
                        onChange={(amount) => patch({ amount })}
                    />
                    <CatalogAdminNumberField
                        label={LocalizeText('catalog.admin.order')}
                        value={draft.orderNumber}
                        onChange={(orderNumber) => patch({ orderNumber })}
                    />
                    <CatalogAdminNumberField
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
                        label={LocalizeText('catalog.admin.offer.credits')}
                        min={0}
                        value={draft.costCredits}
                        onChange={(costCredits) => patch({ costCredits })}
                    />
                    <CatalogAdminNumberField
                        label={LocalizeText('catalog.admin.offer.points')}
                        min={0}
                        value={draft.costPoints}
                        onChange={(costPoints) => patch({ costPoints })}
                    />
                    <CatalogAdminSelectField
                        label={LocalizeText('catalog.admin.offer.points.type')}
                        options={currencyOptions}
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
                    <CatalogAdminNumberField
                        label={LocalizeText('catalog.admin.offer.song.id')}
                        min={0}
                        value={draft.songId}
                        onChange={(songId) => patch({ songId })}
                    />
                </div>
                <CatalogAdminTextField
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
