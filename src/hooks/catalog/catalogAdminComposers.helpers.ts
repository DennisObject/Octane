import { CatalogAdminCreateOfferComposer, CatalogAdminCreatePageComposer, CatalogAdminSaveOfferComposer, CatalogAdminSavePageComposer } from '@octane/renderer';
import type { CatalogAdminOfferForm, CatalogAdminPageForm } from './catalogAdmin.types';

/** Draft version, expected revision and history line every catalog admin write carries. */
export interface CatalogAdminWriteContext {
    catalogType: string;
    draftVersionId: number;
    revision: number;
    summary: string;
    operationId: string;
}

// The lock token is unused by the live catalog editor; the server answers stale writes by revision.
const NO_LOCK_TOKEN = '';

/** Create when the form has no page id yet, save otherwise. Argument order follows the renderer composers. */
export const createPageWriteComposer = (form: CatalogAdminPageForm, write: CatalogAdminWriteContext) => {
    const { catalogType, draftVersionId, revision, summary, operationId } = write;

    if (form.pageId === null) {
        return new CatalogAdminCreatePageComposer(
            form.caption,
            form.captionSave,
            form.pageLayout,
            form.iconImage,
            form.requiredPermission,
            form.visible,
            form.enabled,
            form.orderNum,
            form.parentId,
            catalogType,
            form.catalogMode,
            form.iconColor,
            form.clubOnly,
            form.pageHeadline,
            form.pageTeaser,
            form.pageSpecial,
            form.pageText1,
            form.pageText2,
            form.pageTextDetails,
            form.pageTextTeaser,
            form.roomId,
            form.includes,
            draftVersionId,
            revision,
            NO_LOCK_TOKEN,
            summary,
            operationId
        );
    }

    return new CatalogAdminSavePageComposer(
        form.pageId,
        form.caption,
        form.captionSave,
        form.pageLayout,
        form.iconImage,
        form.requiredPermission,
        form.visible,
        form.enabled,
        form.orderNum,
        form.parentId,
        form.pageHeadline,
        form.pageTeaser,
        form.pageTextDetails,
        catalogType,
        form.catalogMode,
        form.pageText1,
        form.iconColor,
        form.clubOnly,
        form.pageSpecial,
        form.pageText2,
        form.pageTextTeaser,
        form.roomId,
        form.includes,
        draftVersionId,
        revision,
        NO_LOCK_TOKEN,
        summary,
        operationId
    );
};

/** Create when the form has no offer id yet, save otherwise. Argument order follows the renderer composers. */
export const createOfferWriteComposer = (form: CatalogAdminOfferForm, write: CatalogAdminWriteContext) => {
    const { catalogType, draftVersionId, revision, summary, operationId } = write;
    const clubOnly = form.clubOnly ? 1 : 0;

    if (form.offerId === null) {
        return new CatalogAdminCreateOfferComposer(
            form.pageId,
            form.itemIds,
            form.catalogName,
            form.costCredits,
            form.costPoints,
            form.pointsType,
            form.amount,
            clubOnly,
            form.extradata,
            form.haveOffer,
            form.offerIdGroup,
            form.limitedStack,
            form.orderNumber,
            form.songId,
            catalogType,
            draftVersionId,
            revision,
            NO_LOCK_TOKEN,
            summary,
            operationId
        );
    }

    return new CatalogAdminSaveOfferComposer(
        form.offerId,
        form.pageId,
        form.itemIds,
        form.catalogName,
        form.costCredits,
        form.costPoints,
        form.pointsType,
        form.amount,
        clubOnly,
        form.extradata,
        form.haveOffer,
        form.offerIdGroup,
        form.limitedStack,
        form.orderNumber,
        form.songId,
        catalogType,
        draftVersionId,
        revision,
        NO_LOCK_TOKEN,
        summary,
        operationId
    );
};
