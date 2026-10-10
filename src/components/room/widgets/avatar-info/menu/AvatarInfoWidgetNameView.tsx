import { GetSessionDataManager } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { AvatarInfoName, MessengerFriend } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetNameViewProps {
    nameInfo: AvatarInfoName;
    onClose: () => void;
    /** A friend entering the room (AvatarInfoWidget.showUserName / UserNameView): green bubble and an 8000ms delay instead of the 3000ms of a clicked avatar. */
    isFriendEntry?: boolean;
}

export const AvatarInfoWidgetNameView: FC<AvatarInfoWidgetNameViewProps> = (props) => {
    const { nameInfo = null, onClose = null, isFriendEntry = false } = props;

    const relationIconClass = useMemo(() => {
        switch (nameInfo.relationshipStatus) {
            case MessengerFriend.RELATIONSHIP_HEART:
                return 'icon-heart';
            case MessengerFriend.RELATIONSHIP_SMILE:
                return 'icon-smile';
            case MessengerFriend.RELATIONSHIP_BOBBA:
                return 'icon-bobba';
            default:
                return null;
        }
    }, [nameInfo]);

    // avatar_info_widget: a 129x39 bubble (skin style 0 tinted 0x3d3d3d), relationship icon at (2,4) and the name at (16,3) as 11px u_regular white, both inside the
    // layout's 8px content margin (it has no margin_* variables). getOffset puts it 10px (avatars) or 4px above the object and the fade takes 500ms. A clicked avatar
    // (AvatarContextInfoButtonView) waits ContextInfoView's 3000ms; a friend entering the room (UserNameView) tints it 0x9dbf5a and waits 8000ms.
    return (
        <ContextMenuView
            anchorOffsets={{ user: -10, other: -4 }}
            category={nameInfo.category}
            classNames={isFriendEntry ? ['air-name-bubble', 'air-name-bubble--friend'] : ['air-name-bubble']}
            fadeDelay={isFriendEntry ? 8000 : 3000}
            fadeLength={500}
            fades={nameInfo.id !== GetSessionDataManager().userId}
            maximumVerticalLeadRatio={0.05}
            objectId={nameInfo.roomIndex}
            userType={nameInfo.userType}
            onClose={onClose}
        >
            {relationIconClass && <div className={`air-name-bubble__relation octane-friends-spritesheet ${relationIconClass}`} />}
            <NativeText background={isFriendEntry ? 0x72893f : 0x2c2c2b} className="air-name-bubble__name" overrides={{ size: 11, color: 0xffffff }} text={nameInfo.name} textStyle="u_regular" />
        </ContextMenuView>
    );
};
