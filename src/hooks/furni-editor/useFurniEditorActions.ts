import { registerSharedHook, useSharedHook } from '../../state/useSharedHook';
import { useFurniEditorStore } from './useFurniEditorStore';

/** Requests and mutations of the furni editor. Mutations return false while another one is pending. */
export const useFurniEditorActions = () => {
    const {
        search,
        refreshSearch,
        openItem,
        openSprite,
        reloadOpenItem,
        closeItem,
        loadInteractions,
        clearNotice,
        updateItem,
        deleteItem,
        updateFurnidata,
        updateFurnidataStructure,
        revertFurnidata,
        syncPublicName,
        importText
    } = useSharedHook(useFurniEditorStore);

    return {
        search,
        refreshSearch,
        openItem,
        openSprite,
        reloadOpenItem,
        closeItem,
        loadInteractions,
        clearNotice,
        updateItem,
        deleteItem,
        updateFurnidata,
        updateFurnidataStructure,
        revertFurnidata,
        syncPublicName,
        importText
    };
};

registerSharedHook(useFurniEditorStore);
