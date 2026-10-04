import { registerSharedHook, useSharedHook } from '../../state/useSharedHook';
import { useFurniEditorStore } from './useFurniEditorStore';

/** Read-only view of the furni editor data (search page, open furni, pending work). */
export const useFurniEditorState = () => {
    const {
        items,
        total,
        page,
        criteria,
        isSearching,
        interactions,
        detail,
        isLoadingDetail,
        relatedItems,
        importResult,
        isImporting,
        importUnavailable,
        pendingMutation,
        notice,
        isResyncing,
        writeBlock,
        fieldError
    } = useSharedHook(useFurniEditorStore);

    return {
        items,
        total,
        page,
        criteria,
        isSearching,
        interactions,
        detail,
        isLoadingDetail,
        relatedItems,
        importResult,
        isImporting,
        importUnavailable,
        pendingMutation,
        notice,
        isResyncing,
        writeBlock,
        fieldError
    };
};

registerSharedHook(useFurniEditorStore);
