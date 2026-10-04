import type { ICatalogNode } from '../../api/catalog/ICatalogNode';
import type { IPurchasableOffer } from '../../api/catalog/IPurchasableOffer';
import { createOctaneStore } from '../../state/createOctaneStore';
import type { CatalogAdminOfferEditorTarget, CatalogAdminPageEditorTarget } from './catalogAdmin.types';

export type CatalogAdminEditorKind = 'page' | 'offer';

/** Lets the open editor ask before it is replaced; it calls `proceed` when it may go. */
type CatalogAdminEditorGuard = (proceed: () => void) => void;

interface CatalogAdminUiState {
    adminMode: boolean;
    pageEditor: CatalogAdminPageEditorTarget | null;
    offerEditor: CatalogAdminOfferEditorTarget | null;
    guards: Partial<Record<CatalogAdminEditorKind, { key: string; guard: CatalogAdminEditorGuard }>>;
    setAdminMode: (adminMode: boolean) => void;
    editPage: (node: ICatalogNode, catalogType: string) => void;
    createPage: (parent: ICatalogNode, catalogType: string) => void;
    editOffer: (offer: IPurchasableOffer, pageId: number, catalogType: string) => void;
    createOffer: (pageId: number, catalogType: string) => void;
    /** Closes the editor only if `key` is still the one open, so an old dialog cannot close a newer editor. */
    closeEditor: (kind: CatalogAdminEditorKind, key: string) => void;
    /** Records the row a create editor just made, so later deletes and saves recognise it. */
    bindCreated: (kind: CatalogAdminEditorKind, key: string, entityId: number) => void;
    registerGuard: (kind: CatalogAdminEditorKind, key: string, guard: CatalogAdminEditorGuard) => void;
    unregisterGuard: (kind: CatalogAdminEditorKind, key: string) => void;
    /** Closes editors of pages and offers the server just deleted (a deleted page takes its offers along). */
    closeDeleted: (pageIds: readonly number[], offerIds: readonly number[]) => void;
    reset: () => void;
}

const initialState = {
    adminMode: false,
    pageEditor: null as CatalogAdminPageEditorTarget | null,
    offerEditor: null as CatalogAdminOfferEditorTarget | null,
    guards: {} as CatalogAdminUiState['guards']
};

let editorSequence = 0;
const nextEditorKey = (kind: CatalogAdminEditorKind) => `${kind}-${++editorSequence}`;

/**
 * UI state of the catalog admin editor: whether admin mode is on and which page/offer editor
 * windows are open. Server data and mutations live in CatalogAdminProvider.
 */
export const useCatalogAdminUiStore = createOctaneStore<CatalogAdminUiState>()((set, get) => {
    /** Opens `target` once the current editor of that kind agreed to give way. */
    const open = (kind: CatalogAdminEditorKind, target: CatalogAdminPageEditorTarget | CatalogAdminOfferEditorTarget) => {
        const current = kind === 'page' ? get().pageEditor : get().offerEditor;

        // Editing the row that is already open keeps that editor and its changes.
        if (current && target.entityId !== null && current.entityId === target.entityId && current.catalogType === target.catalogType) return;

        const replace = () =>
            set(kind === 'page' ? { pageEditor: target as CatalogAdminPageEditorTarget } : { offerEditor: target as CatalogAdminOfferEditorTarget });
        const guard = get().guards[kind];

        if (current && guard?.key === current.key) guard.guard(replace);
        else replace();
    };

    return {
        ...initialState,
        // Leaving admin mode keeps open editors (they may hold unsaved changes); they close themselves.
        setAdminMode: (adminMode) => set({ adminMode }),
        editPage: (node, catalogType) => open('page', { kind: 'edit', node, catalogType, key: nextEditorKey('page'), entityId: node.pageId }),
        createPage: (parent, catalogType) => open('page', { kind: 'create', parent, catalogType, key: nextEditorKey('page'), entityId: null }),
        editOffer: (offer, pageId, catalogType) =>
            open('offer', { offerId: offer.offerId, pageId, catalogType, offer, key: nextEditorKey('offer'), entityId: offer.offerId }),
        createOffer: (pageId, catalogType) => open('offer', { offerId: null, pageId, catalogType, offer: null, key: nextEditorKey('offer'), entityId: null }),
        closeEditor: (kind, key) =>
            set((state) => {
                if (kind === 'page') return state.pageEditor?.key === key ? { pageEditor: null } : {};

                return state.offerEditor?.key === key ? { offerEditor: null } : {};
            }),
        bindCreated: (kind, key, entityId) =>
            set((state) => {
                if (kind === 'page') return state.pageEditor?.key === key ? { pageEditor: { ...state.pageEditor, entityId } } : {};

                return state.offerEditor?.key === key ? { offerEditor: { ...state.offerEditor, entityId } } : {};
            }),
        registerGuard: (kind, key, guard) => set((state) => ({ guards: { ...state.guards, [kind]: { key, guard } } })),
        unregisterGuard: (kind, key) => set((state) => (state.guards[kind]?.key === key ? { guards: { ...state.guards, [kind]: undefined } } : {})),
        closeDeleted: (pageIds, offerIds) =>
            set((state) => {
                const page = state.pageEditor;
                const offer = state.offerEditor;
                // A create editor belongs to the page it adds to until it has made its own row.
                const pageEditorPage = page ? (page.entityId ?? (page.kind === 'create' ? page.parent.pageId : null)) : null;
                const closePage = pageEditorPage !== null && pageIds.includes(pageEditorPage);
                const closeOffer = !!offer && ((offer.entityId !== null && offerIds.includes(offer.entityId)) || pageIds.includes(offer.pageId));

                return { ...(closePage ? { pageEditor: null } : {}), ...(closeOffer ? { offerEditor: null } : {}) };
            }),
        reset: () => set(initialState)
    };
});
