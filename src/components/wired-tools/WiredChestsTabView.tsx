import { WiredChestLockComposer, WiredChestLockStateEvent } from '@octane/renderer';
import { FC, useCallback, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { WiredMenuButton, WiredMenuItem, WiredMenuPanel, WiredMenuText } from './WiredMenuParts';
import { useMessageEvent, useNotification, useRoom } from '../../hooks';

const LOCK_COOLDOWN_MS = 500;

export const WiredChestsTabView: FC<{}> = () => {
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();
    const [lockBusy, setLockBusy] = useState(false);
    const [lockResult, setLockResult] = useState('');
    const canManageOwn = !!roomSession;
    const canManageAll = !!roomSession?.isRoomOwner;

    useMessageEvent<WiredChestLockStateEvent>(WiredChestLockStateEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        if (!parser.affected) {
            setLockResult(
                localizeWithFallback(
                    'wiredmenu.chests.chest_control.result.none',
                    'Nothing changed - the chests were already in that state.',
                ),
            );
            return;
        }

        setLockResult(
            localizeWithFallback(
                parser.locked ? 'wiredmenu.chests.chest_control.result.locked' : 'wiredmenu.chests.chest_control.result.unlocked',
                parser.locked ? '%count% chests locked.' : '%count% chests unlocked.',
                ['count'],
                [String(parser.affected)],
            ),
        );
    });

    const sendLock = useCallback(
        (lock: boolean, all: boolean) => {
            if (lockBusy) return;

            setLockBusy(true);
            setLockResult('');
            SendMessageComposer(new WiredChestLockComposer(lock, all));
            window.setTimeout(() => setLockBusy(false), LOCK_COOLDOWN_MS);
        },
        [lockBusy],
    );

    const lockEveryChest = useCallback(() => {
        if (!canManageAll || !showConfirm) return;

        showConfirm(
            localizeWithFallback(
                'wiredmenu.chests.chest_control.lock_all.transfer_warning',
                'This locks every chest in the room, including the ones other people own. Locked chests stop Wired transfers; owners can still withdraw their stock.',
            ),
            () => sendLock(true, true),
            () => {
                // nothing to undo: the confirm was declined before anything was sent
            },
            null,
            null,
            localizeWithFallback('wiredmenu.chests.chest_control.lock_all.warning.title', 'Lock every chest'),
        );
    }, [canManageAll, sendLock, showConfirm]);

    return (
        <>
            <WiredMenuItem h={17} w={84} x={14} y={18}>
                <span className="octane-wired-menu__text octane-wired-menu__text--bold">Chest control:</span>
            </WiredMenuItem>
            <WiredMenuPanel h={90} w={472} x={14} y={38}>
                <WiredMenuButton disabled={!canManageOwn || lockBusy} h={30} w={221} x={10} y={10} onClick={() => sendLock(true, false)}>
                    Lock all your chests
                </WiredMenuButton>
                <WiredMenuButton disabled={!canManageOwn || lockBusy} h={30} w={221} x={241} y={10} onClick={() => sendLock(false, false)}>
                    Unlock all your chests
                </WiredMenuButton>
                <WiredMenuButton disabled={!canManageAll || lockBusy} h={30} w={221} x={10} y={50} onClick={lockEveryChest}>
                    Lock all chests
                </WiredMenuButton>
                {!!lockResult && (
                    <WiredMenuText h={19} w={221} x={241} y={55}>
                        {lockResult}
                    </WiredMenuText>
                )}
            </WiredMenuPanel>
            <WiredMenuText h={40} w={472} x={14} y={139}>
                {localizeWithFallback('wiredmenu.chests.chest_control.transfer_hint', 'Locked chests stop Wired transfers. Owners can still withdraw their stock.')}
            </WiredMenuText>
        </>
    );
};
