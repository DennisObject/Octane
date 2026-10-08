import { FC, useMemo } from 'react';
import { ICatalogNode, LocalizeText } from '../../../../api';
import { ClassicScrollAreaView } from '../../../../common';
import { useCatalogActions, useCatalogData } from '../../../../hooks';
import { findCatalogAdminNode, getCatalogAdminNodeName } from '../../../../hooks/catalog/catalogAdminTree.helpers';
import { useCatalogAdminPageActions } from '../../../../hooks/catalog/useCatalogAdminPageActions';
import { CatalogNavigationItemView } from './CatalogNavigationItemView';
import { CatalogNavigationRuntime } from './CatalogNavigationRuntime';
import { CatalogNavigationSetView } from './CatalogNavigationSetView';

export interface CatalogNavigationViewProps {
    node: ICatalogNode;
}

export const CatalogNavigationView: FC<CatalogNavigationViewProps> = (props) => {
    const { node = null } = props;
    const { searchResult = null, rootNode = null } = useCatalogData();
    const { activateNode = null } = useCatalogActions();
    const { adminMode, createSubpage, confirmDelete, confirmMove } = useCatalogAdminPageActions();

    const runtime = useMemo<CatalogNavigationRuntime>(
        () => ({
            activateNode,
            adminMode,
            createSubpage,
            deletePage: confirmDelete,
            reorderPage: (pageId, parentId, index) => {
                const dragged = findCatalogAdminNode(rootNode, pageId);
                const destination = parentId === -1 ? null : findCatalogAdminNode(rootNode, parentId);
                if (!dragged) return;

                confirmMove(
                    dragged,
                    { pageId, newParentId: parentId, newIndex: index },
                    destination ? getCatalogAdminNodeName(destination) : LocalizeText('catalog.admin.root')
                );
            }
        }),
        [activateNode, adminMode, confirmDelete, confirmMove, createSubpage, rootNode]
    );

    return (
        <ClassicScrollAreaView
            aria-label="Catalog categories"
            className="octane-catalog-navigation-scroll-area"
            contentClassName="octane-catalog-navigation-list is-normal"
            role="tree"
        >
            {searchResult &&
                searchResult.filteredNodes.length > 0 &&
                searchResult.filteredNodes.map((n, index) => {
                    return <CatalogNavigationItemView key={n.pageId} node={n} runtime={runtime} />;
                })}
            {!searchResult && <CatalogNavigationSetView node={node} runtime={runtime} />}
        </ClassicScrollAreaView>
    );
};
