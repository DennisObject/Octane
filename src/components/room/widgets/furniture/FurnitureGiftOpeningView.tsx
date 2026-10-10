import {
    CreateLinkEvent,
    GetExtendedProfileByNameMessageComposer,
    GetRoomEngine,
    GetSessionDataManager,
    RoomObjectCategory,
    RoomObjectOperationType
} from '@volt/renderer';
import { FC } from 'react';
import { attemptItemPlacement, CatalogPageName, ProductTypeEnum, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import giftCardImage from '../../../../assets/images/catalog/air/gift/gift-card-blank.png';
import giftIncognitoImage from '../../../../assets/images/catalog/air/gift/incognito.png';
import warningAlertImage from '../../../../assets/images/room-widgets/present-widget/warning-alert.png';
import giftIconBackgroundImage from '../../../../assets/images/room-widgets/present-widget/gift-icon-background.png';
import { VoltCardHeaderView, VoltCardView } from '../../../../common';
import { useCatalogUiState, useFurniturePresentWidget, useInventoryFurni } from '../../../../hooks';
import { FurnitureGiftAvatar } from './FurnitureGiftAvatar';

// v75 packagecard_new (unopened) and packagecard_new_opened (the gift's contents) in the style 3 frame. The unopened
// frame is a 306px element_list at x=10 with 10px spacing; the opened one is a 336px container.
export const FurnitureGiftOpeningView: FC<{}> = (props) => {
    const {
        objectId = -1,
        classId = -1,
        itemType = null,
        text = null,
        isOwnerOfFurniture = false,
        senderName = null,
        senderFigure = null,
        placedItemId = -1,
        placedInRoom = false,
        imageUrl = null,
        openPresent = null,
        onClose = null
    } = useFurniturePresentWidget();
    const { groupItems = [] } = useInventoryFurni();
    const { setGiftReceiver = null } = useCatalogUiState();

    if (objectId === -1) return null;

    const hasSender = !!senderName && senderName.length > 0;
    const isOpened = placedItemId > -1;
    const isClubItem = itemType === ProductTypeEnum.HABBO_CLUB;
    const spaceName = itemType === ProductTypeEnum.WALL ? GetSessionDataManager().getWallItemData(classId)?.className : null;
    const isSpacesItem = spaceName === 'floor' || spaceName === 'landscape' || spaceName === 'wallpaper';
    const showPlacementButtons = !isSpacesItem && !isClubItem;

    const place = (itemId: number) => {
        const groupItem = groupItems.find((group) => group.getItemById(itemId)?.id === itemId);

        if (groupItem) attemptItemPlacement(groupItem);

        onClose();
    };

    // The item is already standing in the room: take it back into the inventory; otherwise it simply stays there.
    const putInInventory = () => {
        if (placedInRoom) GetRoomEngine().processRoomObjectOperation(placedItemId, RoomObjectCategory.FLOOR, RoomObjectOperationType.OBJECT_PICKUP);

        onClose();
    };

    const giveGiftBack = () => {
        setGiftReceiver?.(senderName);
        CreateLinkEvent(`catalog/open/${CatalogPageName.GIFT_SHOP}`);
    };

    const openSenderProfile = () => hasSender && SendMessageComposer(new GetExtendedProfileByNameMessageComposer(senderName));

    const avatar = hasSender ? (
        <FurnitureGiftAvatar figure={senderFigure} onClick={openSenderProfile} />
    ) : (
        <FurnitureGiftAvatar imageUrl={giftIncognitoImage} />
    );

    return (
        <VoltCardView
            className={'volt-furni-gift ' + (isOpened ? 'is-opened' : 'is-closed')}
            frameStyle={3}
            isResizable={false}
            uniqueKey="volt-furni-gift"
        >
            <VoltCardHeaderView
                headerText={LocalizeText(hasSender ? 'widget.furni.present.window.title_from' : 'widget.furni.present.window.title', ['name'], [senderName])}
                onCloseClick={onClose}
            />
            {!isOpened && (
                <div className="fnd-gift-content">
                    {/* The renderer does not carry furniture_trusted_sender, so every sender is untrusted (native default). */}
                    <div className="fnd-gift-warning">
                        <div className="fnd-gift-warning-body">
                            <img alt="" className="fnd-gift-warning-icon" draggable={false} src={warningAlertImage} />
                            <div className="fnd-gift-warning-text">
                                {localizeWithFallback(
                                    'gift.untrusted.banner.text',
                                    'It\u2019s wise to NEVER visit websites linked in gift box messages. They are almost always scam websites that will drain your account.'
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="fnd-gift-card">
                        <img alt="" className="fnd-gift-card-image" draggable={false} src={giftCardImage} />
                        {avatar}
                        <div className="fnd-gift-message">{text}</div>
                        {hasSender && (
                            <div className="fnd-gift-from" onClick={openSenderProfile}>
                                {LocalizeText('widget.furni.present.message_from', ['name'], [senderName])}
                            </div>
                        )}
                    </div>
                    {isOwnerOfFurniture && (
                        <button type="button" className="fnd-button fnd-button-thick fnd-button-green" onClick={openPresent}>
                            {LocalizeText('widget.furni.present.open_gift')}
                        </button>
                    )}
                    {isOwnerOfFurniture && hasSender && (
                        <button type="button" className="fnd-button" onClick={giveGiftBack}>
                            {LocalizeText('widget.furni.present.give_gift', ['name'], [senderName])}
                        </button>
                    )}
                    <div className="fnd-gift-separator" />
                </div>
            )}
            {isOpened && (
                <div className="fnd-gift-content">
                    <div className="fnd-gift-opened-message">
                        <div className="fnd-gift-image">
                            <img alt="" className="fnd-gift-image-bg" draggable={false} src={giftIconBackgroundImage} />
                            {imageUrl && <img alt="" className="fnd-gift-image-product" draggable={false} src={imageUrl} />}
                        </div>
                        <div className="fnd-gift-opened-text">
                            {text &&
                                (isClubItem
                                    ? text
                                    : LocalizeText(
                                          isSpacesItem ? 'widget.furni.present.spaces.message_opened' : 'widget.furni.present.message_opened',
                                          ['product'],
                                          [text]
                                      ))}
                        </div>
                    </div>
                    <div className="fnd-gift-opened-buttons">
                        {showPlacementButtons && placedInRoom && (
                            <button type="button" className="fnd-button fnd-button-thick" onClick={onClose}>
                                {LocalizeText('widget.furni.present.keep_in_room')}
                            </button>
                        )}
                        {showPlacementButtons && !placedInRoom && (
                            <button type="button" className="fnd-button fnd-button-thick" onClick={() => place(placedItemId)}>
                                {LocalizeText('widget.furni.present.place_in_room')}
                            </button>
                        )}
                        {showPlacementButtons && (
                            <button type="button" className="fnd-button" onClick={putInInventory}>
                                {LocalizeText('widget.furni.present.put_in_inventory')}
                            </button>
                        )}
                        {!hasSender && <div className="fnd-gift-separator" />}
                    </div>
                    {hasSender && (
                        <div className="fnd-gift-give">
                            <button type="button" className="fnd-button fnd-button-thick fnd-button-green" onClick={giveGiftBack}>
                                {LocalizeText('widget.furni.present.give_gift', ['name'], [senderName])}
                            </button>
                            {avatar}
                        </div>
                    )}
                </div>
            )}
        </VoltCardView>
    );
};
