import { ContextMenuEnum, CustomUserNotificationMessageEvent, GetSessionDataManager, RoomObjectCategory } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { GetGroupInformation, LocalizeText } from '../../../../../api';
import {
    EFFECTBOX_OPEN,
    GROUP_FURNITURE,
    MONSTERPLANT_SEED_CONFIRMATION,
    MYSTERYTROPHY_OPEN_DIALOG,
    PURCHASABLE_CLOTHING_CONFIRMATION,
    useFurnitureContextMenuWidget,
    useMessageEvent,
    useNotification
} from '../../../../../hooks';
import { ContextMenuHeaderView } from '../../context-menu/ContextMenuHeaderView';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';
import { FurnitureMysteryBoxOpenDialogView } from '../FurnitureMysteryBoxOpenDialogView';
import { FurnitureMysteryTrophyOpenDialogView } from '../FurnitureMysteryTrophyOpenDialogView';
import { EffectBoxConfirmView } from './EffectBoxConfirmView';
import { MonsterPlantSeedConfirmView } from './MonsterPlantSeedConfirmView';
import { PurchasableClothingConfirmView } from './PurchasableClothingConfirmView';

export const FurnitureContextMenuView: FC<{}> = (props) => {
    const {
        closeConfirm = null,
        processAction = null,
        onClose = null,
        objectId = -1,
        mode = null,
        confirmMode = null,
        confirmingObjectId = -1,
        groupData = null,
        isGroupMember = false,
        objectOwnerId = -1
    } = useFurnitureContextMenuWidget();
    const { simpleAlert = null } = useNotification();

    useMessageEvent<CustomUserNotificationMessageEvent>(CustomUserNotificationMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        // HOPPER_NO_COSTUME = 1; HOPPER_NO_HC = 2; GATE_NO_HC = 3; STARS_NOT_CANDIDATE = 4 (not coded in Emulator); STARS_NOT_ENOUGH_USERS = 5 (not coded in Emulator);

        switch (parser.count) {
            case 1:
                simpleAlert(
                    LocalizeText('costumehopper.costumerequired.bodytext'),
                    null,
                    'catalog/open/temporary_effects',
                    LocalizeText('costumehopper.costumerequired.buy'),
                    LocalizeText('costumehopper.costumerequired.header'),
                    null
                );
                break;
            case 2:
                simpleAlert(
                    LocalizeText('viphopper.viprequired.bodytext'),
                    null,
                    'catalog/open/habbo_club',
                    LocalizeText('viprequired.buy.vip'),
                    LocalizeText('viprequired.header'),
                    null
                );
                break;
            case 3:
                simpleAlert(
                    LocalizeText('gate.viprequired.bodytext'),
                    null,
                    'catalog/open/habbo_club',
                    LocalizeText('viprequired.buy.vip'),
                    LocalizeText('gate.viprequired.title'),
                    null
                );
                break;
        }
    });

    const isOwner = GetSessionDataManager().userId === objectOwnerId;

    // Title, its x in the header (the layouts differ: friendfurni_menu and mysterybox_menu start at 0, the others at 23) and the single action of each context menu, straight from the *_menu layouts.
    const menus: Record<string, { title: string; titleX: number; action: { name: string; label: string } }> = {
        [ContextMenuEnum.FRIEND_FURNITURE]: {
            title: LocalizeText('friendfurni.context.title'),
            titleX: 0,
            action: { name: 'use_friend_furni', label: LocalizeText('friendfurni.context.use') }
        },
        [ContextMenuEnum.MONSTERPLANT_SEED]: {
            title: LocalizeText('furni.mnstr_seed.name'),
            titleX: 23,
            action: { name: 'use_monsterplant_seed', label: LocalizeText('widget.monsterplant_seed.button.use') }
        },
        [ContextMenuEnum.RANDOM_TELEPORT]: {
            title: LocalizeText('furni.random_teleport.name'),
            titleX: 23,
            action: { name: 'use_random_teleport', label: LocalizeText('widget.random_teleport.button.use') }
        },
        [ContextMenuEnum.PURCHASABLE_CLOTHING]: {
            title: LocalizeText('furni.generic_usable.name'),
            titleX: 23,
            action: { name: 'use_purchaseable_clothing', label: LocalizeText('widget.generic_usable.button.use') }
        },
        [ContextMenuEnum.MYSTERY_BOX]: {
            title: LocalizeText('mysterybox.context.title'),
            titleX: 0,
            action: { name: 'use_mystery_box', label: LocalizeText('mysterybox.context.' + (isOwner ? 'owner' : 'other') + '.use') }
        },
        [ContextMenuEnum.MYSTERY_TROPHY]: {
            title: LocalizeText('mysterytrophy.header.title'),
            titleX: 23,
            action: { name: 'use_mystery_trophy', label: LocalizeText('friendfurni.context.use') }
        }
    };
    const { title = '', titleX = 23, action = null } = menus[mode] ?? {};
    const isGuildMenu = mode === GROUP_FURNITURE && !!groupData;

    return (
        <>
            {confirmMode === MONSTERPLANT_SEED_CONFIRMATION && <MonsterPlantSeedConfirmView objectId={confirmingObjectId} onClose={closeConfirm} />}
            {confirmMode === PURCHASABLE_CLOTHING_CONFIRMATION && <PurchasableClothingConfirmView objectId={confirmingObjectId} onClose={closeConfirm} />}
            {confirmMode === EFFECTBOX_OPEN && <EffectBoxConfirmView objectId={confirmingObjectId} onClose={closeConfirm} />}
            {confirmMode === MYSTERYTROPHY_OPEN_DIALOG && <FurnitureMysteryTrophyOpenDialogView objectId={confirmingObjectId} onClose={closeConfirm} />}
            <FurnitureMysteryBoxOpenDialogView ownerId={objectOwnerId} />
            {objectId >= 0 && mode && (
                <ContextMenuView
                    category={RoomObjectCategory.FLOOR}
                    anchorOffsets={{ user: -4, other: -4 }}
                    classNames={['octane-avatar-action-menu', 'octane-avatar-action-menu--own', 'octane-avatar-action-menu--furni', ...(isGuildMenu ? ['octane-avatar-action-menu--furni-guild'] : [])]}
                    collapsable={true}
                    fadeDelay={3000}
                    fadeLength={500}
                    fades={true}
                    freezePositionOnHover={true}
                    objectId={objectId}
                    showCaretIcon={false}
                    style={{ '--air-menu-title-x': isGuildMenu ? '22px' : `${titleX}px` } as CSSProperties}
                    onClose={onClose}
                >
                    {mode === GROUP_FURNITURE && groupData ? (
                        <ContextMenuHeaderView className="cursor-pointer" onClick={() => GetGroupInformation(groupData.guildId)}>
                            {groupData.guildName}
                        </ContextMenuHeaderView>
                    ) : (
                        <ContextMenuHeaderView>{title}</ContextMenuHeaderView>
                    )}
                    <div className="air-avatar-menu-buttons">
                        {mode === GROUP_FURNITURE && groupData && (
                            <>
                                {!isGroupMember && (
                                    <ContextMenuListItemView onClick={(event) => processAction('join_group')}>
                                        {LocalizeText('widget.furniture.button.join.group')}
                                    </ContextMenuListItemView>
                                )}
                                <ContextMenuListItemView onClick={(event) => processAction('go_to_group_homeroom')}>
                                    {LocalizeText('widget.furniture.button.go.to.group.home.room')}
                                </ContextMenuListItemView>
                                {groupData.guildHasReadableForum && (
                                    <ContextMenuListItemView onClick={(event) => processAction('open_forum')}>
                                        {LocalizeText('widget.furniture.button.open_group_forum')}
                                    </ContextMenuListItemView>
                                )}
                            </>
                        )}
                        {action && mode !== GROUP_FURNITURE && (
                            <ContextMenuListItemView onClick={(event) => processAction(action.name)}>{action.label}</ContextMenuListItemView>
                        )}
                    </div>
                </ContextMenuView>
            )}
        </>
    );
};
