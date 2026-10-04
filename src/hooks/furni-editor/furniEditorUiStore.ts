import { createOctaneStore } from '../../state/createOctaneStore';

/** Field groups of the edit sheet; each is a tab of the window next to Search. */
export type FurniEditorGroup = 'names' | 'behaviour' | 'placement' | 'catalogue' | 'data';

export type FurniEditorTab = 'search' | FurniEditorGroup;

export const FURNI_EDITOR_GROUPS: FurniEditorGroup[] = ['names', 'behaviour', 'placement', 'catalogue', 'data'];

interface FurniEditorUiState {
    isVisible: boolean;
    activeTab: FurniEditorTab;
    setVisible: (visible: boolean) => void;
    setTab: (tab: FurniEditorTab) => void;
}

// Shared by the window, the link handlers and the packet source (which opens
// the sheet once a requested furni arrives).
export const useFurniEditorUiStore = createOctaneStore<FurniEditorUiState>()((set) => ({
    isVisible: false,
    activeTab: 'search',
    setVisible: (isVisible) => set({ isVisible }),
    setTab: (activeTab) => set({ activeTab })
}));
