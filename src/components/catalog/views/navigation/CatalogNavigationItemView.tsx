import { FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import { ICatalogNode, LocalizeText } from '../../../../api';
import { useCatalogNodeState } from '../../../../hooks';
import {
    CATALOG_ADMIN_PAGE_DRAG_TYPE,
    findCatalogAdminNode,
    planCatalogAdminPageDrop,
    readCatalogAdminPageDrag
} from '../../../../hooks/catalog/catalogAdminTree.helpers';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CatalogNavigationRuntime } from './CatalogNavigationRuntime';
import { CatalogNavigationSetView } from './CatalogNavigationSetView';

export interface CatalogNavigationItemViewProps {
    node: ICatalogNode;
    runtime: CatalogNavigationRuntime;
    child?: boolean;
}

export const CatalogNavigationItemView: FC<CatalogNavigationItemViewProps> = (props) => {
    const { node = null, runtime, child = false } = props;
    const { activateNode, adminMode, createSubpage, deletePage, reorderPage } = runtime;
    const { isActive, isOpen } = useCatalogNodeState(node);
    const [isDragOver, setIsDragOver] = useState(false);
    const dragRef = useRef<HTMLDivElement>(null);
    // Strip only technical technical suffixes; labels such as
    // "Flags (Wall)" or "Forest (Blue)" are meaningful catalog names.
    const swfLabel = (node?.localization || '').replace(/\s*\((?:BC|Hot)\)\s*$/i, '').trim();

    const handleDragStart = useCallback(
        (e: React.DragEvent) => {
            if (!adminMode) return;

            e.dataTransfer.setData(CATALOG_ADMIN_PAGE_DRAG_TYPE, String(node.pageId));
            e.dataTransfer.effectAllowed = 'move';
        },
        [adminMode, node]
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            if (!adminMode || !e.dataTransfer.types.includes(CATALOG_ADMIN_PAGE_DRAG_TYPE)) return;

            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setIsDragOver(true);
        },
        [adminMode]
    );

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            if (!adminMode) return;

            e.preventDefault();
            setIsDragOver(false);

            const pageId = readCatalogAdminPageDrag(e.dataTransfer);
            if (pageId === null) return;

            // Dropping onto a branch moves the page into it, onto a leaf places it before that leaf.
            let root = node;
            while (root.parent) root = root.parent;

            const plan = planCatalogAdminPageDrop(findCatalogAdminNode(root, pageId), node, node.isBranch ? 'inside' : 'before', root);
            if (plan) reorderPage(plan.pageId, plan.newParentId, plan.newIndex);
        },
        [adminMode, node, reorderPage]
    );

    useEffect(() => {
        if (!isActive || !dragRef.current?.scrollIntoView) return;

        dragRef.current.scrollIntoView({ block: 'nearest' });
    }, [isActive]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            event.preventDefault();
            activateNode(node);
        },
        [activateNode, node]
    );

    return (
        <div className={`octane-catalog-navigation-node ${child ? 'is-child' : ''}`}>
            <div
                ref={dragRef}
                className={`octane-catalog-navigation-item ${adminMode ? 'is-admin' : ''} ${isActive ? 'is-active' : ''} ${node.isBranch ? 'is-branch' : 'is-leaf'} ${isOpen ? 'is-open' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
                draggable={adminMode}
                role="treeitem"
                tabIndex={0}
                aria-expanded={node.isBranch ? isOpen : undefined}
                aria-level={(node.depth ?? 0) + 1}
                aria-selected={isActive}
                onClick={() => activateNode(node)}
                onKeyDown={handleKeyDown}
                onDragLeave={adminMode ? handleDragLeave : undefined}
                onDragOver={adminMode ? handleDragOver : undefined}
                onDragStart={adminMode ? handleDragStart : undefined}
                onDrop={adminMode ? handleDrop : undefined}
            >
                <div className="octane-catalog-navigation-icon">
                    <CatalogIconView icon={node.iconId} />
                </div>
                <span
                    className="octane-catalog-navigation-label"
                    title={adminMode ? LocalizeText('catalog.admin.page.id.title', ['id'], [String(node.pageId)]) : undefined}
                >
                    {swfLabel}
                </span>
                {adminMode && (
                    <span className="octane-catalog-navigation-admin">
                        <button
                            className="octane-catalog-navigation-admin-action"
                            title={LocalizeText('catalog.admin.create.subpage')}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                createSubpage(node);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            {LocalizeText('catalog.admin.new')}
                        </button>
                        <button
                            className="octane-catalog-navigation-admin-action"
                            title={LocalizeText('catalog.admin.delete.page')}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                deletePage(node);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            {LocalizeText('catalog.admin.delete')}
                        </button>
                    </span>
                )}
                {node.isBranch && (
                    <span className="octane-catalog-navigation-caret text-[9px] text-muted shrink-0">{isOpen ? <FaCaretUp /> : <FaCaretDown />}</span>
                )}
            </div>
            {isOpen && node.isBranch && <CatalogNavigationSetView child={true} node={node} runtime={runtime} />}
        </div>
    );
};
