import { GetSessionDataManager } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { AvatarInfoName, MessengerFriend } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetNameViewProps {
    nameInfo: AvatarInfoName;
    onClose: () => void;
}

export const AvatarInfoWidgetNameView: FC<AvatarInfoWidgetNameViewProps> = (props) => {
    const { nameInfo = null, onClose = null } = props;

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
    // layout's 8px content margin. AvatarContextInfoView.getOffset puts it 10px (avatars) or 4px above the object, and ContextInfoView fades it after 3000ms over 500ms.
    return (
        <ContextMenuView
            anchorOffsets={{ user: -10, other: -4 }}
            category={nameInfo.category}
            classNames={['air-name-bubble']}
            fadeDelay={3000}
            fadeLength={500}
            fades={nameInfo.id !== GetSessionDataManager().userId}
            maximumVerticalLeadRatio={0.05}
            objectId={nameInfo.roomIndex}
            userType={nameInfo.userType}
            onClose={onClose}
        >
            {relationIconClass && <div className={`air-name-bubble__relation octane-friends-spritesheet ${relationIconClass}`} />}
            <NativeText background={0x2c2c2b} className="air-name-bubble__name" overrides={{ size: 11, color: 0xffffff }} text={nameInfo.name} textStyle="u_regular" />
        </ContextMenuView>
    );
};
