import { IRoomSession, RoomPreviewer } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { attemptBotPlacement, LocalizeText, UnseenItemCategory } from '../../../../api';
import { ClassicScrollAreaView } from '../../../../common/scroll-area/ClassicScrollAreaView';
import { useInventoryBots, useInventoryUnseenTracker } from '../../../../hooks';
import { VoltButton } from '../../../../layout';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { InventoryBotImageView } from './InventoryBotImageView';
import { InventoryBotItemView } from './InventoryBotItemView';

export const InventoryBotView: FC<{
    roomSession: IRoomSession;
    roomPreviewer: RoomPreviewer;
}> = (props) => {
    const { roomSession = null } = props;
    const [isVisible, setIsVisible] = useState(false);
    const { botItems = [], selectedBot = null, activate = null, deactivate = null } = useInventoryBots();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();

    useEffect(() => {
        if (!selectedBot || !isUnseen(UnseenItemCategory.BOT, selectedBot.botData.id)) return;
        removeUnseen(UnseenItemCategory.BOT, selectedBot.botData.id);
    }, [selectedBot, isUnseen, removeUnseen]);

    useEffect(() => {
        if (!isVisible) return;
        const id = activate();
        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        setIsVisible(true);
        return () => setIsVisible(false);
    }, []);

    if (!botItems || !botItems.length) {
        return <InventoryCategoryEmptyView desc={LocalizeText('inventory.empty.desc')} title={LocalizeText('inventory.empty.title')} />;
    }

    return (
        <div className="volt-inventory-animals is-bots">
            <div className="volt-inventory-animal-grid">
                <ClassicScrollAreaView className="size-full">
                    <div className="volt-inventory-animal-cells">
                        {botItems.map((item) => (
                            <InventoryBotItemView key={item.botData.id} botItem={item} />
                        ))}
                    </div>
                </ClassicScrollAreaView>
            </div>
            <div className="volt-inventory-animal-preview">
                <div className="volt-inventory-animal-name">{selectedBot?.botData.name}</div>
                <div className="volt-inventory-animal-image">
                    {selectedBot && <InventoryBotImageView figure={selectedBot.botData.figure} gender={selectedBot.botData.gender} preview />}
                </div>
                <div className="volt-inventory-animal-description">{selectedBot?.botData.motto}</div>
                <div className="volt-inventory-animal-actions">
                    <VoltButton
                        className="volt-inventory-animal-place"
                        disabled={!selectedBot || !roomSession?.isRoomOwner}
                        onClick={() => attemptBotPlacement(selectedBot)}
                    >
                        {LocalizeText('inventory.bot.placetoroom')}
                    </VoltButton>
                </div>
            </div>
        </div>
    );
};
