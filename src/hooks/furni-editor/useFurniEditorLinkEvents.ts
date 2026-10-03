import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { useEffect } from 'react';
import { useFurniEditorUiStore } from './furniEditorUiStore';

const MAX_SPRITE_ID = 2_147_483_647;

/** The sprite id of `furni-editor/open/<spriteId>`, or null when it is not a positive whole number. */
export const parseSpriteId = (value: string | undefined): number | null => {
    if (!value || !/^\d{1,10}$/.test(value)) return null;

    const spriteId = Number(value);

    return spriteId > 0 && spriteId <= MAX_SPRITE_ID ? spriteId : null;
};

interface FurniEditorLinkHandlers {
    /** Server-confirmed acc_catalogfurni; links are ignored without it. */
    canEdit: boolean;
    onClose: () => void;
    onOpenSprite: (spriteId: number) => void;
}

/**
 * furni-editor/show, /hide, /toggle and /open/<spriteId>. The tracker is
 * always registered so a link never falls through to another handler, but
 * does nothing for a user without the permission. The permission is only a
 * UI gate: the server checks it again on every packet.
 */
export const useFurniEditorLinkEvents = ({ canEdit, onClose, onOpenSprite }: FurniEditorLinkHandlers) => {
    useEffect(() => {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                if (!canEdit) return;

                const parts = url.split('/');
                const ui = useFurniEditorUiStore.getState();

                switch (parts[1]) {
                    case 'show':
                        ui.setVisible(true);
                        return;
                    case 'hide':
                        onClose();
                        return;
                    case 'toggle':
                        if (ui.isVisible) onClose();
                        else ui.setVisible(true);
                        return;
                    case 'open': {
                        const spriteId = parseSpriteId(parts[2]);

                        if (spriteId === null) return;

                        ui.setVisible(true);
                        onOpenSprite(spriteId);
                        return;
                    }
                }
            },
            eventUrlPrefix: 'furni-editor/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, [canEdit, onClose, onOpenSprite]);
};
