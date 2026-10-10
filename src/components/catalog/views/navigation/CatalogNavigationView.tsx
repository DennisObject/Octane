import { FC, useMemo } from 'react';
import { ICatalogNode } from '../../../../api';
import { ClassicScrollAreaView } from '../../../../common';
import { useCatalogActions, useCatalogData } from '../../../../hooks';
import { CatalogNavigationItemView } from './CatalogNavigationItemView';
import { CatalogNavigationRuntime } from './CatalogNavigationRuntime';
import { CatalogNavigationSetView } from './CatalogNavigationSetView';

export interface CatalogNavigationViewProps {
    node: ICatalogNode;
}

export const CatalogNavigationView: FC<CatalogNavigationViewProps> = (props) => {
    const { node = null } = props;
    const { searchResult = null } = useCatalogData();
    const { activateNode = null } = useCatalogActions();

    const runtime = useMemo<CatalogNavigationRuntime>(() => ({ activateNode }), [activateNode]);

    return (
        <ClassicScrollAreaView
            aria-label="Catalog categories"
            className="volt-catalog-navigation-scroll-area"
            contentClassName="volt-catalog-navigation-list is-normal"
            role="tree"
        >
            {searchResult &&
                searchResult.filteredNodes.length > 0 &&
                searchResult.filteredNodes.map((n) => {
                    return <CatalogNavigationItemView key={n.id} node={n} runtime={runtime} />;
                })}
            {!searchResult && <CatalogNavigationSetView node={node} runtime={runtime} />}
        </ClassicScrollAreaView>
    );
};
