import { FC } from 'react';
import { Column } from '../../common';
import { OfferView } from '../catalog/views/targeted-offer/OfferView';
import { GroupRoomInformationView } from '../groups/views/GroupRoomInformationView';
import { NotificationCenterView } from '../notification-center/NotificationCenterView';
import { PurseView } from '../purse/PurseView';
import { MysteryBoxExtensionView } from '../room/widgets/mysterybox/MysteryBoxExtensionView';
import { RoomPromotesWidgetView } from '../room/widgets/room-promotes/RoomPromotesWidgetView';

export const RightSideView: FC<{}> = (props) => {
    return (
        <div className="absolute top-0 right-1 z-10 w-[min(230px,calc(100vw-16px))] sm:w-[min(230px,calc(100vw-20px))] h-[calc(100%-55px)] pointer-events-none">
            {/* extension_grid_xml: 2px item spacing; the grid sits at y = 3 - 8 while the purse is in it. */}
            <Column gap={0} position="relative" alignItems="end" className="-mt-[5px] w-full gap-[2px]">
                <div className="relative left-px w-[230px] shrink-0">
                    <PurseView />
                </div>
                <GroupRoomInformationView />
                <MysteryBoxExtensionView />
                <OfferView />
                <RoomPromotesWidgetView />
                <NotificationCenterView />
            </Column>
        </div>
    );
};
