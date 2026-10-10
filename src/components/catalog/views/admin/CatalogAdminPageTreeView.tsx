import { DragEvent, FC, useState } from 'react';
import { ICatalogNode, LocalizeText } from '../../../../api';
import { Button, StaffEmpty, StaffSection } from '../../../../common';
import {
    CATALOG_ADMIN_PAGE_DRAG_TYPE,
    CatalogAdminPageDropPosition,
    findCatalogAdminNode,
    getCatalogAdminNodeName,
    planCatalogAdminPageDrop,
    readCatalogAdminPageDrag,
    resolveCatalogAdminPageDropPosition
} from '../../../../hooks/catalog/catalogAdminTree.helpers';
import { useCatalogAdminPageActions } from '../../../../hooks/catalog/useCatalogAdminPageActions';
import { CatalogAdminPageTreeNodeView, CatalogAdminPageTreeState } from './CatalogAdminPageTreeNodeView';

interface CatalogAdminPageTreeViewProps {
    root: ICatalogNode | null;
    selectedPageId: number;
    onSelect: (node: ICatalogNode) => void;
}

/** Searchable page tree of the draft catalog; drag a page onto another to move it. */
export const CatalogAdminPageTreeView: FC<CatalogAdminPageTreeViewProps> = ({ root, selectedPageId, onSelect }) => {
    const { createSubpage, confirmMove } = useCatalogAdminPageActions();
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
    const [dropTarget, setDropTarget] = useState<CatalogAdminPageTreeState['dropTarget']>(null);
    const [rootDropActive, setRootDropActive] = useState(false);

    const expand = (pageId: number) => setExpanded((current) => new Set(current).add(pageId));

    const requestMove = (event: DragEvent, target: ICatalogNode | null, position: CatalogAdminPageDropPosition) => {
        const pageId = readCatalogAdminPageDrag(event.dataTransfer);
        const dragged = pageId === null ? null : findCatalogAdminNode(root, pageId);
        const plan = planCatalogAdminPageDrop(dragged, target, position, root);
        if (!plan) return;

        if (position === 'inside' && target) expand(target.pageId);

        const destination = plan.newParentId === -1 ? null : findCatalogAdminNode(root, plan.newParentId);
        confirmMove(dragged, plan, destination ? getCatalogAdminNodeName(destination) : LocalizeText('catalog.admin.root'));
    };

    const dropPosition = (event: DragEvent) => {
        const bounds = event.currentTarget.getBoundingClientRect();

        return resolveCatalogAdminPageDropPosition(event.clientY, bounds.top, bounds.height);
    };

    const tree: CatalogAdminPageTreeState = {
        query: search.trim().toLowerCase(),
        expanded,
        selectedPageId,
        dropTarget,
        onSelect: (node) => {
            if (node.children.length) expand(node.pageId);
            onSelect(node);
        },
        onToggle: (pageId) =>
            setExpanded((current) => {
                const next = new Set(current);
                if (!next.delete(pageId)) next.add(pageId);
                return next;
            }),
        onDragStart: (event, node) => {
            event.stopPropagation();
            event.dataTransfer.setData(CATALOG_ADMIN_PAGE_DRAG_TYPE, String(node.pageId));
            event.dataTransfer.effectAllowed = 'move';
        },
        onDragOver: (event, node) => {
            if (!event.dataTransfer.types.includes(CATALOG_ADMIN_PAGE_DRAG_TYPE)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            setRootDropActive(false);
            setDropTarget({ pageId: node.pageId, position: dropPosition(event) });
        },
        onDrop: (event, node) => {
            event.preventDefault();
            event.stopPropagation();
            setDropTarget(null);
            requestMove(event, node, dropPosition(event));
        },
        onDragEnd: () => {
            setDropTarget(null);
            setRootDropActive(false);
        }
    };

    return (
        <StaffSection className="volt-catalog-admin-tree-section" title={LocalizeText('catalog.admin.pages')}>
            <div className="volt-staff-row">
                <input
                    aria-label={LocalizeText('catalog.admin.search.pages')}
                    className="volt-catalog-admin-grow"
                    placeholder={LocalizeText('catalog.admin.search.pages')}
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <Button disabled={!root} variant="secondary" onClick={() => root && createSubpage(root)}>
                    {LocalizeText('catalog.admin.new.root.category')}
                </Button>
            </div>
            <div
                className={`volt-catalog-admin-root-drop ${rootDropActive ? 'is-active' : ''}`}
                onDragLeave={() => setRootDropActive(false)}
                onDragOver={(event) => {
                    if (!event.dataTransfer.types.includes(CATALOG_ADMIN_PAGE_DRAG_TYPE)) return;
                    event.preventDefault();
                    setDropTarget(null);
                    setRootDropActive(true);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setRootDropActive(false);
                    requestMove(event, null, 'root');
                }}
            >
                {LocalizeText('catalog.admin.tree.root.drop')}
            </div>
            <div
                aria-label={LocalizeText('catalog.admin.pages')}
                className="volt-staff-list volt-catalog-admin-tree"
                role="tree"
                onDragLeave={() => setDropTarget(null)}
            >
                {!root?.children.length && <StaffEmpty>{LocalizeText('catalog.admin.tree.empty')}</StaffEmpty>}
                {root?.children.map((child) => (
                    <CatalogAdminPageTreeNodeView key={child.pageId} depth={0} node={child} tree={tree} />
                ))}
            </div>
        </StaffSection>
    );
};
