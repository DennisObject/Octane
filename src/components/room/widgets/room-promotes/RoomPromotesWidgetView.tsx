import { CreateLinkEvent, DesktopViewEvent } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../api';
import contractedBackground from '../../../../assets/images/room/promotes/event_bg_contracted.png';
import eventIcon from '../../../../assets/images/room/promotes/event_icon.png';
import ownerBackground from '../../../../assets/images/room/promotes/event_bg_owner.png';
import visitorBackground from '../../../../assets/images/room/promotes/event_bg_visitor.png';
import { useActiveRoomSessionSnapshot, useMessageEvent, useRoomPromote } from '../../../../hooks';
import { RoomPromoteText } from './RoomPromoteText';
import { RoomPromoteEditWidgetView } from './views';

// Room controller level 1 (guest rights) can manage the room ad like the owner.
const GUEST_CONTROLLER_LEVEL = 1;

// RoomEventInfoCtrl (iro_event_info_xml): a 195px toolbar extension, 25px contracted or 135px expanded. Its backgrounds and icon are the originals of
// ${image.library.url}Events/ (images.habbo.com/c_images/Events, last modified 2011-08-26), bundled so a hotel without that folder still shows the window.
export const RoomPromotesWidgetView: FC<{}> = () => {
    const [isEditingPromote, setIsEditingPromote] = useState<boolean>(false);
    const [expanded, setExpanded] = useState<boolean>(true);
    const { promoteInformation, setPromoteInformation, setIsExtended } = useRoomPromote();
    const roomSession = useActiveRoomSessionSnapshot();
    const enabled = useMemo(() => GetConfigurationValue<boolean>('eventinfo.enabled', true), []);
    const roomId = roomSession?.roomId ?? -1;

    useMessageEvent<DesktopViewEvent>(DesktopViewEvent, () => setPromoteInformation(null));

    // Leaving a room drops its edit window and shows the next room's window expanded again.
    useEffect(() => {
        setIsEditingPromote(false);
        setExpanded(true);
    }, [roomId]);

    const eventData = promoteInformation?.data && promoteInformation.data.adId !== -1 ? promoteInformation.data : null;

    // The edit window belongs to the event it was opened for.
    useEffect(() => {
        if (!eventData) setIsEditingPromote(false);
    }, [eventData]);

    if (!enabled || !roomSession) return null;

    const hasEvent = !!eventData;
    const isOwner = roomSession.isRoomOwner;
    const canManage = isOwner || roomSession.controllerLevel === GUEST_CONTROLLER_LEVEL;

    if (!hasEvent && !canManage) return null;

    // RoomEventInfoCtrl.canExtend: with a total-time limit, an extension must still end inside the maximum.
    const canExtend = (() => {
        if (!eventData) return false;
        if (!GetConfigurationValue<boolean>('roomad.limit_total_time', false)) return true;

        const extension = GetConfigurationValue<number>('room_ad.duration.minutes', 120) * 60 * 1000;
        const maximum = GetConfigurationValue<number>('room_ad.maximum_total_time.minutes', 10080) * 60 * 1000;

        return eventData.expirationDate.getTime() + extension < Date.now() + maximum;
    })();

    const isExpanded = expanded && hasEvent;
    const showModify = isExpanded && canManage;
    const showInProgress = isExpanded && !canManage;

    const onBackgroundClick = () => {
        if (hasEvent) setExpanded((value) => !value);
        else CreateLinkEvent('catalog/open/room_ad');
    };

    const extend = () => {
        setIsExtended(true);
        CreateLinkEvent('catalog/open/room_ad');
    };

    return (
        <>
            <div className={`octane-event-info${isExpanded ? ' is-expanded' : ''}`}>
                <img alt="" className="octane-event-info__bg" draggable={false} src={isExpanded ? (isOwner ? ownerBackground : visitorBackground) : contractedBackground} />
                <div className="octane-event-info__region" onClick={onBackgroundClick} />
                {hasEvent && <RoomPromoteText alignCenter bold size={13} text={eventData.eventName} width={67} x={61} y={2} />}
                {!hasEvent && canManage && <RoomPromoteText className="is-link" height={17} text={LocalizeText('roomad.get.event')} underline width={126} x={31} y={3} onClick={onBackgroundClick} />}
                {isExpanded && <RoomPromoteText height={90} text={eventData.eventDescription} width={175} wrap x={10} y={27} />}
                {showInProgress && <RoomPromoteText alignCenter bold text={LocalizeText('navigator.eventinprogress')} width={156} x={18} y={107} />}
                {showModify && <RoomPromoteText className="is-link" height={17} text={LocalizeText('navigator.roominfo.editevent')} underline x={16} y={110} onClick={() => setIsEditingPromote(true)} />}
                {showModify && canExtend && <RoomPromoteText alignRight className="is-link" height={17} text={LocalizeText('roomad.extend.event')} underline width={88} x={88} y={110} onClick={extend} />}
                <img alt="" className="octane-event-info__icon" draggable={false} src={eventIcon} />
            </div>
            {isEditingPromote && hasEvent && <RoomPromoteEditWidgetView eventId={eventData.adId} eventName={eventData.eventName} eventDescription={eventData.eventDescription} onClose={() => setIsEditingPromote(false)} />}
        </>
    );
};
