import { DragEvent, FC } from 'react';
import { ICatalogNode, LocalizeText } from '../../../../api';
import { CatalogAdminPageDropPosition, catalogAdminSubtreeMatches, getCatalogAdminNodeName } from '../../../../hooks/catalog/catalogAdminTree.helpers';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';

export interface CatalogAdminPageTreeState {
    query: string;
    expanded: ReadonlySet<number>;
    selectedPageId: number;
    dropTarget: { pageId: number; position: CatalogAdminPageDropPosition } | null;
    onSelect: (node: ICatalogNode) => void;
    onToggle: (pageId: number) => void;
    onDragStart: (event: DragEvent, node: ICatalogNode) => void;
    onDragOver: (event: DragEvent, node: ICatalogNode) => void;
    onDrop: (event: DragEvent, node: ICatalogNode) => void;
    onDragEnd: () => void;
}

interface CatalogAdminPageTreeNodeViewProps {
    node: ICatalogNode;
    depth: number;
    tree: CatalogAdminPageTreeState;
}

export const CatalogAdminPageTreeNodeView: FC<CatalogAdminPageTreeNodeViewProps> = ({ node, depth, tree }) => {
    if (!catalogAdminSubtreeMatches(node, tree.query)) return null;

    const name = getCatalogAdminNodeName(node);
    const hasChildren = node.children.length > 0;
    const isOpen = hasChildren && (!!tree.query || tree.expanded.has(node.pageId));
    const isSelected = node.pageId === tree.selectedPageId;
    const dropPosition = tree.dropTarget?.pageId === node.pageId ? tree.dropTarget.position : null;
    const classNames = [
        'volt-staff-list-row',
        'is-interactive',
        'volt-catalog-admin-tree-row',
        isSelected ? 'is-selected' : '',
        node.isVisible ? '' : 'is-hidden',
        dropPosition ? `is-drop-${dropPosition}` : ''
    ];

    return (
        <>
            <div
                aria-expanded={hasChildren ? isOpen : undefined}
                aria-level={depth + 1}
                aria-selected={isSelected}
                className={classNames.filter(Boolean).join(' ')}
                draggable
                role="treeitem"
                style={{ paddingLeft: 4 + depth * 12 }}
                tabIndex={0}
                onClick={() => tree.onSelect(node)}
                onDragEnd={tree.onDragEnd}
                onDragOver={(event) => tree.onDragOver(event, node)}
                onDragStart={(event) => tree.onDragStart(event, node)}
                onDrop={(event) => tree.onDrop(event, node)}
                onKeyDown={(event) => {
                    // Keys on the disclosure button belong to that button, not to the row.
                    if (event.target !== event.currentTarget) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    tree.onSelect(node);
                }}
            >
                {hasChildren ? (
                    <button
                        aria-label={LocalizeText(isOpen ? 'catalog.admin.tree.collapse' : 'catalog.admin.tree.expand', ['name'], [name])}
                        className={`volt-catalog-admin-tree-caret ${isOpen ? 'is-open' : ''}`}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            tree.onToggle(node.pageId);
                        }}
                    />
                ) : (
                    <span className="volt-catalog-admin-tree-caret is-empty" />
                )}
                <span className="volt-catalog-admin-tree-icon">{node.iconId > 0 && <CatalogIconView icon={node.iconId} />}</span>
                <span className="volt-catalog-admin-tree-label" title={name}>
                    {name}
                </span>
                {!node.isVisible && <span className="volt-staff-flag is-muted">{LocalizeText('catalog.admin.hidden')}</span>}
                <span className="volt-staff-muted">{node.pageId}</span>
            </div>
            {isOpen && node.children.map((child) => <CatalogAdminPageTreeNodeView key={child.pageId} depth={depth + 1} node={child} tree={tree} />)}
        </>
    );
};
