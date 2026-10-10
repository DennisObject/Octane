import { GetSessionDataManager, RoomSettingsComposer, UpdateHomeRoomMessageComposer } from '@volt/renderer';
import { CSSProperties, FC, useEffect, useId, useState } from 'react';
import { FriendlyTime, GetConfigurationValue, GetGroupInformation, GetUserProfile, LocalizeText, ReportType, SendMessageComposer } from '../../../../api';
import nativeAtlas from '../../../../assets/images/navigator/air/room-info-native-atlas.png';
import { LayoutBadgeImageView, LayoutRoomThumbnailView } from '../../../../common';
import { useHelp, useNavigatorData, useNavigatorFavourite, useNavigatorRoomInfoPopupStore, useNavigatorUiStore } from '../../../../hooks';
import { classNames } from '../../../../layout';

// Native bubble layout bounds are 27 × 38, including its null spacer.
// Fixed corners copy their full source; scaled strips use the layout rectangle.
const BUBBLE_PIECES: { source: number[]; style: CSSProperties }[] = [
    { source: [0, 120, 7, 7], style: { left: 6, top: 6, width: 7, height: 7 } },
    { source: [0, 127, 7, 7], style: { left: 6, top: 11, width: 5, height: 'calc(100% - 23px)' } },
    { source: [0, 145, 7, 8], style: { left: 6, bottom: 6, width: 7, height: 8 } },
    { source: [7, 120, 7, 7], style: { left: 11, top: 6, width: 'calc(100% - 22px)', height: 5 } },
    { source: [7, 127, 7, 7], style: { left: 11, top: 11, width: 'calc(100% - 22px)', height: 'calc(100% - 23px)' } },
    { source: [7, 146, 7, 8], style: { left: 11, bottom: 6, width: 'calc(100% - 22px)', height: 6 } },
    { source: [27, 120, 7, 7], style: { right: 5, top: 6, width: 7, height: 7 } },
    { source: [27, 127, 7, 7], style: { right: 6, top: 11, width: 5, height: 'calc(100% - 23px)' } },
    { source: [27, 146, 7, 8], style: { right: 6, bottom: 6, width: 7, height: 8 } }
];

const BubbleSkin = () => (
    <div aria-hidden="true" className="volt-navigator-air__room-bubble-skin">
        {BUBBLE_PIECES.map(({ source, style }, index) => (
            <svg key={index} style={style} viewBox={source.join(' ')} preserveAspectRatio="none">
                <image href={nativeAtlas} width={256} height={256} />
            </svg>
        ))}
    </div>
);

// Native style-2 colorless header: fixed six-pixel corners, source regions in the local atlas.
const HeaderSkin = () => (
    <svg aria-hidden="true" className="volt-navigator-air__room-popover-header-skin" width={345} height={125}>
        {[
            { source: 0, position: 0, size: 6 },
            { source: 6, position: 6, size: 333 },
            { source: 7, position: 339, size: 6 }
        ].map((x, xi) =>
            [
                { source: 96, position: 0, size: 6 },
                { source: 102, position: 6, size: 113 },
                { source: 103, position: 119, size: 6 }
            ].map((y, yi) => (
                <svg
                    key={xi + '-' + yi}
                    x={x.position}
                    y={y.position}
                    width={x.size}
                    height={y.size}
                    viewBox={`${x.source} ${y.source} ${xi === 1 ? 1 : 6} ${yi === 1 ? 1 : 6}`}
                    preserveAspectRatio="none"
                >
                    <image href={nativeAtlas} width={256} height={256} />
                </svg>
            ))
        )}
    </svg>
);

const EventSkin = () => {
    const tintId = useId();
    return (
        <svg aria-hidden="true" className="volt-navigator-air__room-popover-event-skin" width={331} height={55}>
            <defs>
                <filter id={tintId} colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values="0.945098039 0 0 0 0 0 0.654901961 0 0 0 0 0 0 0 0 0 0 0 1 0" />
                </filter>
            </defs>
            <g filter={'url(#' + tintId + ')'}>
                {[
                    { source: 24, position: 0, size: 3 },
                    { source: 27, position: 3, size: 325 },
                    { source: 28, position: 328, size: 3 }
                ].map((x, xi) =>
                    [
                        { source: 96, position: 0, size: 3 },
                        { source: 99, position: 3, size: 49 },
                        { source: 100, position: 52, size: 3 }
                    ].map((y, yi) => (
                        <svg
                            key={xi + '-' + yi}
                            x={x.position}
                            y={y.position}
                            width={x.size}
                            height={y.size}
                            viewBox={`${x.source} ${y.source} ${xi === 1 ? 1 : 3} ${yi === 1 ? 1 : 3}`}
                            preserveAspectRatio="none"
                        >
                            <image href={nativeAtlas} width={256} height={256} />
                        </svg>
                    ))
                )}
            </g>
        </svg>
    );
};

const getTradeModeText = (tradeMode: number) => {
    switch (tradeMode) {
        case 1:
            return LocalizeText('trading.mode.controller');
        case 2:
            return LocalizeText('trading.mode.free');
        default:
            return LocalizeText('trading.mode.not.allowed');
    }
};

export const NavigatorRoomInfoPopupView: FC<{}> = () => {
    const room = useNavigatorRoomInfoPopupStore((state) => state.room);
    const visible = useNavigatorRoomInfoPopupStore((state) => state.visible);
    const x = useNavigatorRoomInfoPopupStore((state) => state.x);
    const y = useNavigatorRoomInfoPopupStore((state) => state.y);
    const { navigatorData } = useNavigatorData();
    const { isFavourite, toggle: toggleFavourite } = useNavigatorFavourite(room?.roomId ?? 0);
    const { report = null } = useHelp();
    const [homeOverride, setHomeOverride] = useState(0);

    useEffect(() => {
        setHomeOverride(0);
    }, [room?.roomId, visible]);

    if (!visible || !room) return null;

    const hasGroup = room.groupBadgeCode?.length > 0;
    const showOwner = room.showOwner;
    const hasActiveRoomAd = room.roomAdExpiresInMin > 0;
    const rankingEnabled = GetConfigurationValue<boolean>('room.ranking.enabled', false);
    const roomReportingEnabled = GetConfigurationValue<boolean>('room.report.enabled', false);
    const isOwner = GetSessionDataManager().userName === room.ownerName;
    const isHome = homeOverride === room.roomId || navigatorData?.homeRoomId === room.roomId;

    const closePopup = () => useNavigatorRoomInfoPopupStore.getState().hide();

    const searchTag = (tag: string) => {
        useNavigatorUiStore.getState().setSearch('hotel_view', `tag:${tag}`);
        closePopup();
    };

    const bubbleStyle = { left: x, top: y, width: 374, transform: 'translateY(-50%)' };

    return (
        <div
            role="dialog"
            aria-label={LocalizeText('navigator.room.info.popup.title')}
            className="volt-navigator-air__room-bubble"
            style={bubbleStyle}
            onMouseEnter={() => useNavigatorRoomInfoPopupStore.getState().setHovered(true)}
            onMouseLeave={() => useNavigatorRoomInfoPopupStore.getState().setHovered(false)}
            onClick={(event) => event.stopPropagation()}
        >
            <BubbleSkin />
            <div className="volt-navigator-air__room-bubble-content">
                <div className="volt-navigator-air__room-popover-header">
                    <HeaderSkin />
                    <LayoutRoomThumbnailView className="volt-navigator-air__room-popover-thumbnail" customUrl={room.officialRoomPicRef} roomId={room.roomId}>
                        {hasGroup && <LayoutBadgeImageView badgeCode={room.groupBadgeCode} className="volt-navigator-air__room-badge" isGroup={true} />}
                    </LayoutRoomThumbnailView>
                    <div className="volt-navigator-air__room-popover-copy">
                        <div className="volt-navigator-air__room-popover-title">{room.roomName}</div>
                        <div className="volt-navigator-air__room-popover-description">{room.description}</div>
                    </div>
                </div>
                {(showOwner || hasGroup) && (
                    <div className="volt-navigator-air__room-popover-owner-row">
                        {showOwner && (
                            <button
                                type="button"
                                className="volt-navigator-air__room-owner"
                                onClick={() => {
                                    GetUserProfile(room.ownerId);
                                    closePopup();
                                }}
                            >
                                <svg
                                    aria-hidden="true"
                                    className="volt-navigator-air__room-owner-eye"
                                    width={15}
                                    height={13}
                                    viewBox="0 56 21 21"
                                    preserveAspectRatio="none"
                                >
                                    <image href={nativeAtlas} width={256} height={256} />
                                </svg>
                                <span>{room.ownerName}</span>
                            </button>
                        )}
                        {hasGroup && (
                            <button
                                type="button"
                                className="volt-navigator-air__room-group"
                                onClick={() => {
                                    GetGroupInformation(room.habboGroupId);
                                    closePopup();
                                }}
                            >
                                <i className="volt-navigator-air__group" />
                                <span>{room.groupName}</span>
                            </button>
                        )}
                    </div>
                )}
                <div className="volt-navigator-air__room-popover-details">
                    <div className="volt-navigator-air__room-popover-properties">
                        <span className="is-label">{LocalizeText('navigator.roompopup.property.trading')}</span>
                        <span>{getTradeModeText(room.tradeMode)}</span>
                        {rankingEnabled && (
                            <>
                                <span className="is-label">{LocalizeText('navigator.roompopup.property.ranking')}</span>
                                <span>{room.ranking}</span>
                            </>
                        )}
                        <span className="is-label">{LocalizeText('navigator.roompopup.property.max_users')}</span>
                        <span>{room.maxUserCount}</span>
                    </div>
                    <div className="volt-navigator-air__room-popover-actions">
                        <button type="button" onClick={() => toggleFavourite()}>
                            <i className={classNames('icon icon-navigator-favorite-room', isFavourite ? 'active' : '')} />
                            <span>{LocalizeText('navigator.room.popup.room.info.favorite')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!isHome) {
                                    SendMessageComposer(new UpdateHomeRoomMessageComposer(room.roomId));
                                    setHomeOverride(room.roomId);
                                }
                            }}
                        >
                            <i className={classNames('icon icon-navigator-my-room', isHome ? 'active' : '')} />
                            <span>{LocalizeText('navigator.room.popup.room.info.home')}</span>
                        </button>
                        {isOwner && (
                            <button
                                type="button"
                                onClick={() => {
                                    SendMessageComposer(new RoomSettingsComposer(room.roomId));
                                    closePopup();
                                }}
                            >
                                <i className="icon icon-navigator-room-settings" />
                                <span>{LocalizeText('navigator.room.popup.info.room.settings')}</span>
                            </button>
                        )}
                        {roomReportingEnabled && !isOwner && (
                            <button
                                type="button"
                                onClick={() => {
                                    report?.(ReportType.ROOM, { roomId: room.roomId, roomName: room.roomName });
                                    closePopup();
                                }}
                            >
                                <i className="icon icon-navigator-room-report" />
                                <span>{LocalizeText('navigator.room.popup.report.room')}</span>
                            </button>
                        )}
                    </div>
                </div>
                <div className="volt-navigator-air__room-popover-bottom">
                    <div className="volt-navigator-air__room-popover-tag-group">
                        <div className="volt-navigator-air__room-popover-tags">
                            {room.tags?.map((tag, index) => (
                                <button key={index} type="button" className="volt-navigator-air__tag" onClick={() => searchTag(tag)}>
                                    #{tag}
                                </button>
                            ))}
                        </div>
                        {/* Native group role/type/decorate metadata is unavailable in this facade. */}
                    </div>
                    {hasActiveRoomAd && (
                        <div className="volt-navigator-air__room-popover-event">
                            <EventSkin />
                            <i className="volt-navigator-air__room-popover-event-icon" aria-hidden="true" />
                            <div className="volt-navigator-air__room-popover-event-copy">
                                <span className="volt-navigator-air__room-popover-event-name">
                                    {LocalizeText('navigator.eventsettings.name')}: {room.roomAdName}
                                </span>
                                <span className="volt-navigator-air__room-popover-event-description">
                                    {LocalizeText('navigator.eventsettings.desc')}: {room.roomAdDescription}
                                    <br />
                                    {LocalizeText('roomad.event.expiration_time')} {FriendlyTime.format(room.roomAdExpiresInMin * 60)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
