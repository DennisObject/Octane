import { BotRemoveComposer, RoomControllerLevel, RoomObjectCategory, RoomObjectOperationType } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { AvatarInfoRentableBot, BotSkillsEnum, LocalizeText, ProcessRoomObjectOperation, SendMessageComposer } from '../../../../../api';
import { Button, LayoutBadgeImageView } from '../../../../../common';
import { InfoStandAvatarView } from './InfoStandAvatarView';
import { InfoStandHeaderView } from './InfoStandHeaderView';

interface InfoStandWidgetRentableBotViewProps {
    avatarInfo: AvatarInfoRentableBot;
    onClose: () => void;
}

export const InfoStandWidgetRentableBotView: FC<InfoStandWidgetRentableBotViewProps> = (props) => {
    const { avatarInfo = null, onClose = null } = props;

    const canPickup = useMemo(() => {
        if (!avatarInfo) return false;

        if (avatarInfo.botSkills.indexOf(BotSkillsEnum.NO_PICK_UP) >= 0) return false;

        if (!avatarInfo.amIOwner && !avatarInfo.amIAnyRoomController) return false;

        return true;
    }, [avatarInfo]);

    // rentable_bot_view: move and rotate follow the room rights, pick up only the owner or any room controller.
    const canManage = useMemo(() => !!avatarInfo && avatarInfo.ownerId > -1 && (avatarInfo.amIOwner || avatarInfo.amIAnyRoomController || avatarInfo.roomControllerLevel >= RoomControllerLevel.GUEST), [avatarInfo]);

    const pickupBot = () => SendMessageComposer(new BotRemoveComposer(avatarInfo.webID));

    if (!avatarInfo) return null;

    // rentable_bot_view: the bot circuit board behind the avatar, one skill badge at (100,21), description 31px, owner 13px.
    return (
        <div className="octane-infostand-stack">
            <div className="octane-infostand pointer-events-auto z-30">
                <InfoStandHeaderView name={avatarInfo.name} onClose={onClose} />
                <div className="octane-infostand__rule" />
                <div className="octane-infostand__figure-row">
                    <div className="octane-infostand__avatar-well octane-infostand__avatar-well--bot">
                        <InfoStandAvatarView direction={4} figure={avatarInfo.figure} top={24} left={17} />
                    </div>
                    <div className="octane-infostand__rentable-badge">
                        {avatarInfo.badges.length > 0 && <LayoutBadgeImageView badgeCode={avatarInfo.badges[0]} showInfo={true} />}
                    </div>
                </div>
                {avatarInfo.carryItem > 0 && (
                    <>
                        <div className="octane-infostand__rule" />
                        <div className="octane-infostand__carry">
                            {LocalizeText('infostand.text.handitem', ['item'], [LocalizeText('handitem' + avatarInfo.carryItem)])}
                        </div>
                    </>
                )}
                <div className="octane-infostand__description">{avatarInfo.motto}</div>
                {avatarInfo.ownerId > -1 && <div className="octane-infostand__owner-line">{LocalizeText('infostand.text.botowner', ['name'], [avatarInfo.ownerName])}</div>}
            </div>
            {(canManage || canPickup) && (
                <div className="octane-infostand-actions octane-infostand-actions--tight">
                    {canManage && (
                        <>
                            <Button variant="dark" size={null} className="habbo-btn-black" onClick={() => ProcessRoomObjectOperation(avatarInfo.roomIndex, RoomObjectCategory.UNIT, RoomObjectOperationType.OBJECT_MOVE)}>
                                {LocalizeText('infostand.button.move')}
                            </Button>
                            <Button variant="dark" size={null} className="habbo-btn-black" onClick={() => ProcessRoomObjectOperation(avatarInfo.roomIndex, RoomObjectCategory.UNIT, RoomObjectOperationType.OBJECT_ROTATE_POSITIVE)}>
                                {LocalizeText('infostand.button.rotate')}
                            </Button>
                        </>
                    )}
                    {canPickup && (
                        <Button variant="dark" size={null} className="habbo-btn-black" onClick={pickupBot}>
                            {LocalizeText('infostand.button.pickup')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
