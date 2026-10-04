import { useCallback } from 'react';
import { useFurniEditorActions } from './useFurniEditorActions';
import { useFurniEditorConfirm } from './useFurniEditorConfirm';
import { useFurniEditorUiStore } from './furniEditorUiStore';

/**
 * Moving away from the open furni (another furni, back to the list) asks
 * first while the sheet holds unsaved changes. Closing the window does not:
 * the sheet keeps its state until the window opens again.
 */
export const useFurniEditorNavigation = (openItem: { id: number; spriteId: number } | null, hasUnsavedChanges: boolean) => {
    const { openItem: loadItem, openSprite, closeItem } = useFurniEditorActions();
    const openItemId = openItem?.id ?? 0;
    const openSpriteId = openItem?.spriteId ?? 0;
    const confirm = useFurniEditorConfirm();
    const setTab = useFurniEditorUiStore((state) => state.setTab);
    const setVisible = useFurniEditorUiStore((state) => state.setVisible);

    const unlessUnsaved = useCallback(
        (proceed: () => void) => {
            if (!hasUnsavedChanges) {
                proceed();
                return;
            }

            confirm(
                {
                    titleKey: 'furni.editor.confirm.discard.title',
                    messageKey: 'furni.editor.confirm.discard.message',
                    confirmKey: 'furni.editor.confirm.discard.button'
                },
                proceed
            );
        },
        [hasUnsavedChanges, confirm]
    );

    const open = useCallback(
        (id: number) => {
            if (id === openItemId) {
                setTab('names');
                return;
            }

            unlessUnsaved(() => loadItem(id));
        },
        [openItemId, unlessUnsaved, loadItem, setTab]
    );

    // A link for the furni already on the sheet just shows it.
    const openBySprite = useCallback(
        (spriteId: number) => {
            if (spriteId === openSpriteId) {
                setTab('names');
                return;
            }

            unlessUnsaved(() => openSprite(spriteId));
        },
        [openSpriteId, unlessUnsaved, openSprite, setTab]
    );

    const back = useCallback(
        () =>
            unlessUnsaved(() => {
                closeItem();
                setTab('search');
            }),
        [unlessUnsaved, closeItem, setTab]
    );

    const close = useCallback(() => setVisible(false), [setVisible]);

    return { open, openBySprite, back, close };
};
