import { ICatalogNode } from '../../../../api';

export interface CatalogNavigationRuntime {
    activateNode: (node: ICatalogNode) => void;
}
