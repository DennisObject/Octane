import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { AvatarInfoName, MessengerFriend } from '../../../../../api';
import { loadNativeFont, measureNativeText } from '../../../../../common/native-text/NativeFont';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { nativeTextStyles } from '../../../../../common/native-text/NativeTextStyles';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

/** Half of the requested 24/24 centering. Native auto_size keeps the field at x=16 with a 32px remainder; the +48 total stays supported. */
const NAME_BUBBLE_INSET = 24;
/** NativeText's left-aligned field is ceil(advance) plus its 4px gutter. The gutter is inside the field, so the window uses the field width. */
const NAME_RASTER_GUTTER = 4;
const nameMeasureStyle = { ...nativeTextStyles.u_regular, size: 11, color: 0xffffff };

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

    const [measuredBubble, setMeasuredBubble] = useState<{ name: string; width: number } | null>(null);

    useEffect(() =>
    {
        let disposed = false;
        const name = nameInfo.name ?? '';

        loadNativeFont(nameMeasureStyle)
            .then((loaded) =>
            {
                if (disposed) return;

                const textWidth = measureNativeText(loaded.font, name, nameMeasureStyle);

                setMeasuredBubble({ name, width: Math.ceil(textWidth) + NAME_RASTER_GUTTER + NAME_BUBBLE_INSET * 2 });
            })
            .catch(() =>
            {
                if (disposed) return;

                setMeasuredBubble(null);
            });

        return () =>
        {
            disposed = true;
        };
    }, [nameInfo.name]);

    // A stored width is used only for the name it was measured for. A changed name or a failed font load falls back to the 129px skin.
    const bubbleWidth = measuredBubble !== null && measuredBubble.name === (nameInfo.name ?? '') ? measuredBubble.width : null;

    const bubbleStyle = useMemo(() => (bubbleWidth === null ? undefined : { width: bubbleWidth, minWidth: bubbleWidth }), [bubbleWidth]);

    // avatar_info_widget: a 129x39 bubble (skin style 0 tinted 0x3d3d3d), relationship icon at (2,4) and the name at (16,3) as 11px u_regular white, both inside the
    // layout's 8px content margin (it has no margin_* variables). Native auto_size keeps the field at x=16 with a 32px remainder. The 24/24 width is Dennis's requested centering; the +48 total stays supported.
    // getOffset puts it 10px (avatars) or 4px above the object and the fade takes 500ms. A clicked avatar
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
            repositionKey={bubbleWidth ?? 0}
            style={bubbleStyle}
            userType={nameInfo.userType}
            onClose={onClose}
        >
            {relationIconClass && <div className={`air-name-bubble__relation octane-friends-spritesheet ${relationIconClass}`} />}
            <NativeText background={isFriendEntry ? 0x72893f : 0x2c2c2b} className="air-name-bubble__name" overrides={{ size: 11, color: 0xffffff }} text={nameInfo.name} textStyle="u_regular" />
        </ContextMenuView>
    );
};
