import { FC, useEffect, useMemo, useState } from 'react';
import { ICatalogNode, LocalizeText } from '../../../../api';
import { StaffStatus, StaffWindow, StaffWindowTab } from '../../../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../hooks';
import { buildCatalogAdminDraftTree, findCatalogAdminNode } from '../../../../hooks/catalog/catalogAdminTree.helpers';
import { useCatalogStudio } from '../../../../hooks/catalog/useCatalogStudio';
import { useCatalogAdmin } from '../../CatalogAdminContext';
import { CatalogAdminHistoryView } from './CatalogAdminHistoryView';
import { CatalogAdminPageDetailView } from './CatalogAdminPageDetailView';
import { CatalogAdminPageTreeView } from './CatalogAdminPageTreeView';

type ManagerTab = 'catalog' | 'history';

const CatalogAdminManagerWindow: FC = () => {
    const admin = useCatalogAdmin();
    const studio = useCatalogStudio();
    // A request timed out: nothing more is sent until its answer arrives or the client reconnects.
    const resyncing = studio.requestState === 'resync';
    const { rootNode = null, currentPage = null } = useCatalogData();
    const { currentType } = useCatalogUiState();
    const { activateNode = null } = useCatalogActions();
    const [activeTab, setActiveTab] = useState<ManagerTab>('catalog');
    const [selectedPageId, setSelectedPageId] = useState(currentPage?.pageId ?? -1);
    const { session, loadHistory } = studio;
    const draftVersionId = session?.draftVersionId ?? 0;

    const draftRoot = useMemo(() => buildCatalogAdminDraftTree(rootNode, session?.pages ?? [], currentType), [currentType, rootNode, session?.pages]);
    const selectedNode = findCatalogAdminNode(draftRoot, selectedPageId);

    // Follow the page opened in the catalog itself.
    const currentPageId = currentPage?.pageId ?? null;
    const [followedPageId, setFollowedPageId] = useState(currentPageId);
    if (currentPageId !== followedPageId) {
        setFollowedPageId(currentPageId);
        if (currentPageId !== null) setSelectedPageId(currentPageId);
    }

    useEffect(() => {
        if (draftVersionId) loadHistory();
    }, [draftVersionId, loadHistory]);

    /** Selects a page here and opens it in the catalog, which loads its offers. */
    const selectPage = (pageId: number) => {
        if (pageId < 0) return;

        setSelectedPageId(pageId);
        const liveNode = findCatalogAdminNode(rootNode, pageId);
        if (liveNode) activateNode?.(liveNode);
    };

    const tabs: StaffWindowTab<ManagerTab>[] = [
        { id: 'catalog', label: LocalizeText('catalog.admin.tab.catalog') },
        { id: 'history', label: LocalizeText('catalog.admin.tab.history') }
    ];

    return (
        <StaffWindow<ManagerTab>
            activeTab={activeTab}
            className="volt-catalog-admin-manager"
            tabs={tabs}
            title={LocalizeText('catalog.admin.title')}
            uniqueKey="catalog-admin-manager"
            onClose={() => admin.setAdminMode(false)}
            onTabChange={setActiveTab}
        >
            {admin.lastError && (
                <StaffStatus dismissLabel={LocalizeText('generic.close')} message={admin.lastError} tone="error" onDismiss={admin.clearError} />
            )}
            {resyncing && <StaffStatus message={LocalizeText('catalog.admin.studio.resync')} tone="error" />}
            {!admin.lastError && !resyncing && !admin.sessionReady && <StaffStatus message={LocalizeText('catalog.admin.status.connecting')} tone="pending" />}
            {!admin.lastError && !resyncing && (admin.busy || studio.requestState === 'waiting') && (
                <StaffStatus message={LocalizeText('catalog.admin.status.working')} tone="pending" />
            )}
            {activeTab === 'catalog' && (
                <div className="volt-catalog-admin-workspace">
                    <CatalogAdminPageTreeView root={draftRoot} selectedPageId={selectedPageId} onSelect={(node: ICatalogNode) => selectPage(node.pageId)} />
                    <CatalogAdminPageDetailView node={selectedNode} root={draftRoot} />
                </div>
            )}
            {activeTab === 'history' && <CatalogAdminHistoryView />}
        </StaffWindow>
    );
};

/** The Catalog Admin Editor window, open while admin mode is on (which needs the server permission). */
export const CatalogAdminManagerView: FC = () => {
    const adminMode = useCatalogAdmin()?.adminMode ?? false;

    if (!adminMode) return null;

    return <CatalogAdminManagerWindow />;
};
