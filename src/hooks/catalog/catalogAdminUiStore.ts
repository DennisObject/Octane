import type { ICatalogNode } from '../../api/catalog/ICatalogNode';
import type { IPurchasableOffer } from '../../api/catalog/IPurchasableOffer';
import { createOctaneStore } from '../../state/createOctaneStore';
import type { CatalogAdminOfferEditorTarget, CatalogAdminPageEditorTarget } from './catalogAdmin.types';

/**
 * UI state of the catalog admin editor: whether admin mode is on and which page/offer
 * editor windows are open. Server data and mutations live in CatalogAdminProvider.
 */
interface CatalogAdminUiState {
    adminMode: boolean;
    pageEditor: CatalogAdminPageEditorTarget | null;
    offerEditor: CatalogAdminOfferEditorTarget | null;
    setAdminMode: (adminMode: boolean) => void;
    editPage: (node: ICatalogNode, catalogType: string) => void;
    createPage: (parent: ICatalogNode, catalogType: string) => void;
    closePageEditor: () => void;
    editOffer: (offer: IPurchasableOffer, pageId: number, catalogType: string) => void;
    createOffer: (pageId: number, catalogType: string) => void;
    closeOfferEditor: () => void;
    /** Closes the editor of an entity the server just deleted. */
    closeDeleted: (entityType: 'PAGE' | 'OFFER', entityId: number) => void;
    reset: () => void;
}

const initialState = {
    adminMode: false,
    pageEditor: null as CatalogAdminPageEditorTarget | null,
    offerEditor: null as CatalogAdminOfferEditorTarget | null
};

export const useCatalogAdminUiStore = createOctaneStore<CatalogAdminUiState>()((set) => ({
    ...initialState,
    // Leaving admin mode keeps open editors (they may hold unsaved changes); they close themselves.
    setAdminMode: (adminMode) => set({ adminMode }),
    editPage: (node, catalogType) => set({ pageEditor: { kind: 'edit', node, catalogType } }),
    createPage: (parent, catalogType) => set({ pageEditor: { kind: 'create', parent, catalogType } }),
    closePageEditor: () => set({ pageEditor: null }),
    editOffer: (offer, pageId, catalogType) => set({ offerEditor: { offerId: offer.offerId, pageId, catalogType, offer } }),
    createOffer: (pageId, catalogType) => set({ offerEditor: { offerId: null, pageId, catalogType, offer: null } }),
    closeOfferEditor: () => set({ offerEditor: null }),
    closeDeleted: (entityType, entityId) =>
        set((state) => {
            if (entityType === 'OFFER') return state.offerEditor?.offerId === entityId ? { offerEditor: null } : {};

            const editor = state.pageEditor;
            const editedPageId = editor?.kind === 'edit' ? editor.node.pageId : editor?.parent.pageId;
            const offerOnPage = state.offerEditor?.pageId === entityId;

            return {
                ...(editedPageId === entityId ? { pageEditor: null } : {}),
                ...(offerOnPage ? { offerEditor: null } : {})
            };
        }),
    reset: () => set(initialState)
}));
