import { FC } from 'react';
import { ICatalogNode, LocalizeText } from '../../../../api';
import { Button, StaffEmpty, StaffSection } from '../../../../common';
import { useCatalogData, useCatalogUiState } from '../../../../hooks';
import { getCatalogAdminNodeName, toStudioCatalogType } from '../../../../hooks/catalog/catalogAdminTree.helpers';
import { useCatalogAdminPageActions } from '../../../../hooks/catalog/useCatalogAdminPageActions';
import { useCatalogStudio } from '../../../../hooks/catalog/useCatalogStudio';
import { useCatalogAdmin } from '../../CatalogAdminContext';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { isReadOnlyCatalogAdminLayout } from '../page/layout/catalogLayoutRegistry';
import { CatalogAdminOfferListView } from './CatalogAdminOfferListView';

interface CatalogAdminPageDetailViewProps {
    node: ICatalogNode | null;
    root: ICatalogNode | null;
}

/** The selected page: its settings actions and its offers. */
export const CatalogAdminPageDetailView: FC<CatalogAdminPageDetailViewProps> = ({ node, root }) => {
    const admin = useCatalogAdmin();
    const studio = useCatalogStudio();
    const { currentPage = null } = useCatalogData();
    const { currentType } = useCatalogUiState();
    const { editPage, createSubpage, confirmDelete, move, toggleVisible } = useCatalogAdminPageActions();

    if (!node) {
        return (
            <StaffSection className="octane-catalog-admin-detail">
                <StaffEmpty>{LocalizeText('catalog.admin.page.select')}</StaffEmpty>
            </StaffSection>
        );
    }

    const name = getCatalogAdminNodeName(node);
    const parent = node.parent ?? root;
    const siblings = parent?.children ?? [];
    const index = siblings.indexOf(node);
    const busy = admin?.busy ?? false;
    const page = currentPage?.pageId === node.pageId ? currentPage : null;
    const studioType = toStudioCatalogType(currentType);
    const layout = studio.session?.pages.find((entry) => entry.pageId === node.pageId && entry.catalogType === studioType)?.pageLayout ?? null;
    const readOnly = isReadOnlyCatalogAdminLayout(layout);
    const parentId = parent && parent !== root ? parent.pageId : -1;

    const moveBy = (offset: -1 | 1) => {
        const target = index + offset;
        if (busy || index < 0 || target < 0 || target >= siblings.length) return;

        move(node, { pageId: node.pageId, newParentId: parentId, newIndex: target });
    };

    return (
        <div className="octane-catalog-admin-detail">
            <StaffSection>
                <div className="octane-staff-row octane-catalog-admin-editor-head">
                    <span className="octane-catalog-admin-editor-icon">{node.iconId > 0 && <CatalogIconView icon={node.iconId} />}</span>
                    <div className="octane-catalog-admin-editor-titles">
                        <strong title={name}>{name}</strong>
                        <span className="octane-staff-muted">
                            {LocalizeText(
                                'catalog.admin.page.summary',
                                ['id', 'pages', 'offers', 'revision'],
                                [String(node.pageId), String(node.children.length), String(page?.offers.length ?? 0), String(studio.revision)]
                            )}
                        </span>
                    </div>
                    {!node.isVisible && <span className="octane-staff-flag is-muted">{LocalizeText('catalog.admin.hidden')}</span>}
                </div>
                <div className="octane-staff-row octane-catalog-admin-actions">
                    <Button variant="secondary" onClick={() => editPage(node)}>
                        {LocalizeText('catalog.admin.edit.page')}
                    </Button>
                    <Button variant="secondary" onClick={() => createSubpage(node)}>
                        {LocalizeText('catalog.admin.create.subpage')}
                    </Button>
                    <Button disabled={busy} variant="secondary" onClick={() => !busy && toggleVisible(node)}>
                        {LocalizeText(node.isVisible ? 'catalog.admin.hide' : 'catalog.admin.show')}
                    </Button>
                    <Button disabled={busy || index <= 0} variant="secondary" onClick={() => moveBy(-1)}>
                        {LocalizeText('catalog.admin.move.up')}
                    </Button>
                    <Button disabled={busy || index < 0 || index >= siblings.length - 1} variant="secondary" onClick={() => moveBy(1)}>
                        {LocalizeText('catalog.admin.move.down')}
                    </Button>
                    <Button disabled={busy} variant="danger" onClick={() => !busy && confirmDelete(node)}>
                        {LocalizeText('catalog.admin.delete')}
                    </Button>
                </div>
            </StaffSection>
            {readOnly ? (
                <StaffSection title={LocalizeText('catalog.admin.offers')}>
                    <StaffEmpty>{LocalizeText('catalog.admin.page.readonly', ['layout'], [layout])}</StaffEmpty>
                </StaffSection>
            ) : (
                <CatalogAdminOfferListView page={page} pageName={name} />
            )}
        </div>
    );
};
