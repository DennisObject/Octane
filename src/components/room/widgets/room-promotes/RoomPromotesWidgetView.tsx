import { CreateLinkEvent, DesktopViewEvent } from '@octane/renderer';
import { FC, SyntheticEvent, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../api';
import { useActiveRoomSessionSnapshot, useMessageEvent, useRoomPromote } from '../../../../hooks';
import { RoomPromoteEditWidgetView } from './views';

// Room controller level 1 (guest rights) can manage the room ad like the owner.
const GUEST_CONTROLLER_LEVEL = 1;

const hideBrokenBitmap = (event: SyntheticEvent<HTMLImageElement>) => (event.currentTarget.style.visibility = 'hidden');

// RoomEventInfoCtrl (iro_event_info_xml): a 195px toolbar extension, 25px contracted or 135px expanded.
export const RoomPromotesWidgetView: FC<{}> = (props) => {
    const [ isEditingPromote, setIsEditingPromote ] = useState<boolean>(false);
    const [ expanded, setExpanded ] = useState<boolean>(true);
    const { promoteInformation, setPromoteInformation } = useRoomPromote();
    const roomSession = useActiveRoomSessionSnapshot();
    const enabled = useMemo(() => GetConfigurationValue<boolean>('eventinfo.enabled', true), []);
    const imageLibraryUrl = useMemo(() => GetConfigurationValue<string>('image.library.url', ''), []);

    useMessageEvent<DesktopViewEvent>(DesktopViewEvent, (event) => {
        setPromoteInformation(null);
    });

    if (!enabled || !roomSession) return null;

    const eventData = (promoteInformation?.data && (promoteInformation.data.adId !== -1)) ? promoteInformation.data : null;
    const hasEvent = !!eventData;
    const isOwner = roomSession.isRoomOwner;
    const canManage = isOwner || (roomSession.controllerLevel === GUEST_CONTROLLER_LEVEL);

    if (!hasEvent && !isOwner && !canManage) return null;

    const isExpanded = expanded && hasEvent;
    const showOwnerBg = isExpanded && isOwner;
    const showVisitorBg = isExpanded && !isOwner;
    const showContractedBg = !isExpanded;
    const showModify = isExpanded && canManage;
    const showGetEvent = !hasEvent && canManage;
    const showInProgress = isExpanded && !canManage;

    const onBackgroundClick = () => {
        if (hasEvent) setExpanded(value => !value);
        else CreateLinkEvent('catalog/open/room_event');
    };

    return (
        <>
            <div className={`octane-event-info ${ isExpanded ? 'is-expanded' : '' }`}>
                {showOwnerBg && <img className="octane-event-info__bg" src={`${ imageLibraryUrl }Events/event_bg_owner.png`} alt="" onError={hideBrokenBitmap} />}
                {showVisitorBg && <img className="octane-event-info__bg" src={`${ imageLibraryUrl }Events/event_bg_visitor.png`} alt="" onError={hideBrokenBitmap} />}
                {showContractedBg && <img className="octane-event-info__bg" src={`${ imageLibraryUrl }Events/event_bg_contracted.png`} alt="" onError={hideBrokenBitmap} />}
                <div className="octane-event-info__region" onClick={onBackgroundClick} />
                {hasEvent && <span className="octane-event-info__header">{eventData.eventName}</span>}
                {showGetEvent && <span className="octane-event-info__get-event" onClick={onBackgroundClick}>{LocalizeText('roomad.get.event')}</span>}
                {isExpanded && <span className="octane-event-info__desc">{eventData.eventDescription}</span>}
                {showInProgress && <span className="octane-event-info__in-progress">{LocalizeText('navigator.eventinprogress')}</span>}
                {showModify && (
                    <>
                        <span className="octane-event-info__modify" onClick={() => setIsEditingPromote(true)}>{LocalizeText('navigator.roominfo.editevent')}</span>
                        <span className="octane-event-info__extend" onClick={() => CreateLinkEvent('catalog/open/room_event')}>{LocalizeText('roomad.extend.event')}</span>
                    </>
                )}
                <img className="octane-event-info__icon" src={`${ imageLibraryUrl }Events/event_icon.png`} alt="" onError={hideBrokenBitmap} />
            </div>
            {isEditingPromote && hasEvent && (
                <RoomPromoteEditWidgetView
                    eventDescription={eventData.eventDescription}
                    eventId={eventData.adId}
                    eventName={eventData.eventName}
                    setIsEditingPromote={() => setIsEditingPromote(false)}
                />
            )}
        </>
    );
};
