import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { StaffSection } from '../../../../common';
import type { CatalogAdminPageForm } from '../../../../hooks/catalog/catalogAdmin.types';
import { CatalogAdminTextAreaField, CatalogAdminTextField } from './CatalogAdminFormControls';
import { CatalogAdminTranslateView } from './CatalogAdminTranslateView';

interface CatalogAdminPageContentViewProps {
    draft: CatalogAdminPageForm;
    patch: (patch: Partial<CatalogAdminPageForm>) => void;
    fieldErrors: Record<string, string>;
}

/** Images and texts a catalog page shows. Texts are edited as plain text, never rendered here. */
export const CatalogAdminPageContentView: FC<CatalogAdminPageContentViewProps> = ({ draft, patch, fieldErrors }) => (
    <StaffSection title={LocalizeText('catalog.admin.page.section.content')}>
        <div className="volt-staff-grid">
            <CatalogAdminTextField
                label={LocalizeText('catalog.admin.page.headline')}
                error={fieldErrors.pageHeadline}
                value={draft.pageHeadline}
                onChange={(pageHeadline) => patch({ pageHeadline })}
            />
            <CatalogAdminTextField
                label={LocalizeText('catalog.admin.page.teaser')}
                error={fieldErrors.pageTeaser}
                value={draft.pageTeaser}
                onChange={(pageTeaser) => patch({ pageTeaser })}
            />
        </div>
        <CatalogAdminTextField
            label={LocalizeText('catalog.admin.page.special')}
            error={fieldErrors.pageSpecial}
            value={draft.pageSpecial}
            onChange={(pageSpecial) => patch({ pageSpecial })}
        />
        <CatalogAdminTextAreaField
            label={LocalizeText('catalog.admin.page.text.1')}
            rows={4}
            error={fieldErrors.pageText1}
            value={draft.pageText1}
            onChange={(pageText1) => patch({ pageText1 })}
        />
        <CatalogAdminTranslateView text={draft.pageText1} onTranslated={(pageText1) => patch({ pageText1 })} />
        <CatalogAdminTextAreaField
            label={LocalizeText('catalog.admin.page.text.2')}
            error={fieldErrors.pageText2}
            value={draft.pageText2}
            onChange={(pageText2) => patch({ pageText2 })}
        />
        <CatalogAdminTextAreaField
            label={LocalizeText('catalog.admin.page.text.details')}
            error={fieldErrors.pageTextDetails}
            value={draft.pageTextDetails}
            onChange={(pageTextDetails) => patch({ pageTextDetails })}
        />
        <CatalogAdminTextAreaField
            label={LocalizeText('catalog.admin.page.text.teaser')}
            error={fieldErrors.pageTextTeaser}
            value={draft.pageTextTeaser}
            onChange={(pageTextTeaser) => patch({ pageTextTeaser })}
        />
    </StaffSection>
);
