import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeBadgeDescription, LocalizeBadgeName, localizeWithFallback, UnseenItemCategory } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useInventoryBadges, useInventoryUnseenTracker } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';
import { InventoryBadgeItemView } from './InventoryBadgeItemView';

const ActiveBadgeSlot: FC<{
    slotIndex: number;
    badgeCode?: string;
    onDropBadge: (badgeCode: string, slotIndex: number, sourceSlot?: number) => void;
    onDragStartFromSlot: (event: React.DragEvent, badgeCode: string, slotIndex: number) => void;
    onSelectBadge: (badgeCode: string) => void;
    isSelected: boolean;
}> = ({ slotIndex, badgeCode, onDropBadge, onDragStartFromSlot, onSelectBadge, isSelected }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className={`octane-inventory-badge-slot ${badgeCode ? 'has-badge octane-inventory-thumb octane-inventory-badge-cell' : 'is-empty'} ${isSelected ? 'is-selected' : ''} ${isDragOver ? 'is-dragover' : ''}`}
            draggable={!!badgeCode}
            onDragEnd={() => undefined}
            onDragLeave={() => setIsDragOver(false)}
            onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setIsDragOver(true);
            }}
            onDragStart={(event) => {
                if (!badgeCode) return;
                onDragStartFromSlot(event, badgeCode, slotIndex);
            }}
            onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                const droppedBadgeCode = event.dataTransfer.getData('badgeCode');
                const sourceSlotStr = event.dataTransfer.getData('activeSlot');
                const sourceSlot = sourceSlotStr !== '' ? parseInt(sourceSlotStr) : undefined;
                if (droppedBadgeCode) onDropBadge(droppedBadgeCode, slotIndex, sourceSlot);
            }}
            onMouseDown={() => badgeCode && onSelectBadge(badgeCode)}
        >
            {badgeCode ? <LayoutBadgeImageView badgeCode={badgeCode} /> : null}
        </div>
    );
};

export const InventoryBadgeView: FC<{ filteredBadgeCodes?: string[] }> = (props) => {
    const { filteredBadgeCodes = null } = props;
    const [isVisible, setIsVisible] = useState(false);
    const {
        badgeCodes = [],
        activeBadgeCodes = [],
        selectedBadgeCode = null,
        isWearingBadge = null,
        canWearBadges = null,
        toggleBadge = null,
        getBadgeId = null,
        setBadgeAtSlot = null,
        removeBadge = null,
        reorderBadges = null,
        setSelectedBadgeCode = null,
        activate = null,
        deactivate = null
    } = useInventoryBadges();
    const { isUnseen = null, removeUnseen = null } = useInventoryUnseenTracker();
    const [isDragOverInventory, setIsDragOverInventory] = useState(false);
    const [isDraggingFromActive, setIsDraggingFromActive] = useState(false);
    const maxSlots = useMemo(() => GetConfigurationValue<number>('user.badges.max.slots', 5), []);
    const [page, setPage] = useState(0);

    const baseCodes = filteredBadgeCodes !== null ? filteredBadgeCodes : badgeCodes;
    const inactiveCodes = baseCodes.filter((code) => !isWearingBadge(code));
    // AIR BadgeGridView uses pages of 200 and keeps the integer-division extra page.
    const pageCount = Math.floor(inactiveCodes.length / 200) + 1;
    const currentPage = Math.min(page, pageCount - 1);

    const handleDropOnSlot = useCallback(
        (badgeCode: string, slotIndex: number, sourceSlot?: number) => {
            if (sourceSlot !== undefined) reorderBadges(sourceSlot, slotIndex);
            else setBadgeAtSlot(badgeCode, slotIndex);
        },
        [setBadgeAtSlot, reorderBadges]
    );

    const handleDragStartFromSlot = useCallback((event: React.DragEvent, badgeCode: string, slotIndex: number) => {
        event.dataTransfer.setData('badgeCode', badgeCode);
        event.dataTransfer.setData('activeSlot', slotIndex.toString());
        event.dataTransfer.setData('source', 'active');
        event.dataTransfer.effectAllowed = 'move';
        const badgeUrl = GetConfigurationValue<string>('badge.asset.url').replace('%badgename%', badgeCode);
        const img = new Image();
        img.src = badgeUrl;
        event.dataTransfer.setDragImage(img, 20, 20);
    }, []);

    useEffect(() => {
        if (!selectedBadgeCode || !isUnseen(UnseenItemCategory.BADGE, getBadgeId(selectedBadgeCode))) return;
        removeUnseen(UnseenItemCategory.BADGE, getBadgeId(selectedBadgeCode));
    }, [selectedBadgeCode, isUnseen, removeUnseen, getBadgeId]);

    useEffect(() => {
        if (!isVisible) return;
        const id = activate();
        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        setIsVisible(true);
        return () => setIsVisible(false);
    }, []);

    const description = selectedBadgeCode ? LocalizeBadgeDescription(selectedBadgeCode) : '';
    // v75 only learns a badge's rarity from BADGE_INFO; without it every badge reads "Common badge".
    const rarityLabel = localizeWithFallback('badge.rarity.common', 'Common');
    const rarityText = localizeWithFallback('badge.rarity.badge', `${rarityLabel} badge`, ['rarity'], [rarityLabel]);

    return (
        <div className="octane-inventory-badges">
            <div className="octane-inventory-badges-main">
                <div
                    className={`octane-inventory-badges-owned ${isDragOverInventory && isDraggingFromActive ? 'is-drop-remove' : ''}`}
                    onDragLeave={() => {
                        setIsDragOverInventory(false);
                        setIsDraggingFromActive(false);
                    }}
                    onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setIsDraggingFromActive(event.dataTransfer.types.includes('activeslot'));
                        setIsDragOverInventory(true);
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        setIsDragOverInventory(false);
                        setIsDraggingFromActive(false);
                        const badgeCode = event.dataTransfer.getData('badgeCode');
                        const source = event.dataTransfer.getData('source');
                        if (source === 'active' && badgeCode) removeBadge(badgeCode);
                    }}
                >
                    <div className="octane-inventory-badges-owned-grid" key={currentPage}>
                        {inactiveCodes.slice(currentPage * 200, (currentPage + 1) * 200).map((code) => (
                            <InventoryBadgeItemView key={code} badgeCode={code} />
                        ))}
                    </div>
                    {pageCount > 1 && (
                        <div className="octane-inventory-badges-pages">
                            {Array.from({ length: pageCount }, (_, index) => (
                                <button key={index} type="button" className={currentPage === index ? 'is-active' : ''} onClick={() => setPage(index)}>
                                    {index}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="octane-inventory-badges-wearing">
                    <div className="octane-inventory-badges-wearing-title">{localizeWithFallback('inventory.badges.activebadges', 'Wearing')}</div>
                    <div className="octane-inventory-badges-wearing-grid">
                        {Array.from({ length: maxSlots }).map((_, index) => (
                            <ActiveBadgeSlot
                                key={index}
                                badgeCode={activeBadgeCodes[index]}
                                isSelected={selectedBadgeCode === activeBadgeCodes[index] && !!activeBadgeCodes[index]}
                                slotIndex={index}
                                onDropBadge={handleDropOnSlot}
                                onDragStartFromSlot={handleDragStartFromSlot}
                                onSelectBadge={setSelectedBadgeCode}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className="octane-inventory-badges-footer">
                {selectedBadgeCode ? (
                    <>
                        <div className="octane-inventory-badges-footer-image">
                            <LayoutBadgeImageView badgeCode={selectedBadgeCode} />
                        </div>
                        <div className="octane-inventory-badges-footer-details">
                            <div className="octane-inventory-badges-footer-name">{LocalizeBadgeName(selectedBadgeCode)}</div>
                            {description && description !== selectedBadgeCode && description !== `badge_desc_${selectedBadgeCode}` && <div className="octane-inventory-badges-footer-desc">{description}</div>}
                            <div className="octane-inventory-badges-footer-meta">
                                <span className="octane-inventory-badge-rarity">{rarityText}</span>
                            </div>
                        </div>
                        <div className="octane-inventory-badges-footer-actions">
                            <OctaneButton
                                className={`button-shiny octane-inventory-btn-wear ${isWearingBadge(selectedBadgeCode) ? 'is-clear' : ''}`}
                                disabled={!isWearingBadge(selectedBadgeCode) && !canWearBadges()}
                                onClick={() => toggleBadge(selectedBadgeCode)}
                            >
                                {isWearingBadge(selectedBadgeCode)
                                    ? localizeWithFallback('inventory.badges.clearbadge', 'Clear badge')
                                    : localizeWithFallback('inventory.badges.wearbadge', 'Wear badge')}
                            </OctaneButton>
                        </div>
                    </>
                ) : (
                    <OctaneButton className="button-shiny octane-inventory-btn-wear octane-inventory-badge-wear-empty" disabled>
                        {localizeWithFallback('inventory.badges.wearbadge', 'Wear badge')}
                    </OctaneButton>
                )}
            </div>
        </div>
    );
};
