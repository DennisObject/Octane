import type { ICatalogNode } from '../../api/catalog/ICatalogNode';
import { LocalizeText } from '../../api/utils/LocalizeText';
import { useCatalogAdmin } from '../../components/catalog/CatalogAdminContext';
import { useNotificationActions } from '../notification/useNotification';
import { CatalogAdminPageMovePlan, getCatalogAdminNodeName } from './catalogAdminTree.helpers';
import { useCatalogAdminUiStore } from './catalogAdminUiStore';
import { useCatalogUiState } from './useCatalog';

/**
 * Page actions shared by the catalog navigation and the manager tree. Destructive and
 * structural ones (delete, drag move) ask first; the server still authorises each of them.
 */
export const useCatalogAdminPageActions = () => {
    const admin = useCatalogAdmin();
    const { currentType } = useCatalogUiState();
    const { showConfirm } = useNotificationActions();
    const editPageInStore = useCatalogAdminUiStore((state) => state.editPage);
    const createPageInStore = useCatalogAdminUiStore((state) => state.createPage);

    const editPage = (node: ICatalogNode) => editPageInStore(node, currentType);

    const createSubpage = (parent: ICatalogNode) => createPageInStore(parent, currentType);

    const confirmDelete = (node: ICatalogNode) => {
        if (!admin || admin.busy) return;

        const name = getCatalogAdminNodeName(node);
        const message = node.children.length
            ? LocalizeText('catalog.admin.delete.category.confirm', ['name'], [name])
            : LocalizeText('catalog.admin.delete.page.confirm', ['name'], [name]);

        showConfirm(
            message,
            () => admin.deletePage(node.pageId, name),
            null,
            LocalizeText('catalog.admin.delete'),
            null,
            LocalizeText('catalog.admin.delete.page')
        );
    };

    /** Moves without asking; for the explicit move up / move down buttons. */
    const move = (node: ICatalogNode, plan: CatalogAdminPageMovePlan) =>
        admin?.movePage(plan.pageId, plan.newParentId, plan.newIndex, getCatalogAdminNodeName(node));

    /** Asks before a drag-and-drop move, which carries the whole sub-tree along. */
    const confirmMove = (node: ICatalogNode, plan: CatalogAdminPageMovePlan, targetName: string) => {
        if (!admin || admin.busy) return;

        const name = getCatalogAdminNodeName(node);

        showConfirm(
            LocalizeText('catalog.admin.move.confirm', ['name', 'target'], [name, targetName]),
            () => admin.movePage(plan.pageId, plan.newParentId, plan.newIndex, name),
            null,
            LocalizeText('catalog.admin.move'),
            null,
            LocalizeText('catalog.admin.move.title')
        );
    };

    const toggleVisible = (node: ICatalogNode) => admin?.setPageVisible(node.pageId, !node.isVisible, getCatalogAdminNodeName(node));

    return { adminMode: admin?.adminMode ?? false, editPage, createSubpage, confirmDelete, move, confirmMove, toggleVisible };
};
