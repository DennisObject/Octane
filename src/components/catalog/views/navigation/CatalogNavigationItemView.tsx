import { FC, KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import { ICatalogNode } from '../../../../api';
import { useCatalogNodeState } from '../../../../hooks';
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
    const { activateNode } = runtime;
    const { isActive, isOpen } = useCatalogNodeState(node);
    const itemRef = useRef<HTMLDivElement>(null);
    // Strip only technical technical suffixes; labels such as
    // "Flags (Wall)" or "Forest (Blue)" are meaningful catalog names.
    const swfLabel = (node?.localization || '').replace(/\s*\((?:BC|Hot)\)\s*$/i, '').trim();

    useEffect(() => {
        if (!isActive || !itemRef.current?.scrollIntoView) return;

        itemRef.current.scrollIntoView({ block: 'nearest' });
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
        <div className={`volt-catalog-navigation-node ${child ? 'is-child' : ''}`}>
            <div
                ref={itemRef}
                className={`volt-catalog-navigation-item ${isActive ? 'is-active' : ''} ${node.isBranch ? 'is-branch' : 'is-leaf'} ${isOpen ? 'is-open' : ''}`}
                role="treeitem"
                tabIndex={0}
                aria-expanded={node.isBranch ? isOpen : undefined}
                aria-level={(node.depth ?? 0) + 1}
                aria-selected={isActive}
                onClick={() => activateNode(node)}
                onKeyDown={handleKeyDown}
            >
                <div className="volt-catalog-navigation-icon">
                    <CatalogIconView icon={node.iconId} />
                </div>
                <span className="volt-catalog-navigation-label">{swfLabel}</span>
                {node.isBranch && (
                    <span className="volt-catalog-navigation-caret text-[9px] text-muted shrink-0">{isOpen ? <FaCaretUp /> : <FaCaretDown />}</span>
                )}
            </div>
            {isOpen && node.isBranch && <CatalogNavigationSetView child={true} node={node} runtime={runtime} />}
        </div>
    );
};
