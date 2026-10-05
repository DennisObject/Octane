import {
    CreateLinkEvent,
    GetCustomRoomFilterMessageComposer,
    GetGuestRoomMessageComposer,
    GetSessionDataManager,
    RemoveOwnRoomRightsRoomMessageComposer,
    RoomControllerLevel,
    RoomMuteComposer,
    RoomSettingsComposer,
    ToggleStaffPickMessageComposer,
    UpdateHomeRoomMessageComposer
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import {
    DispatchUiEvent,
    GetConfigurationValue,
    GetGroupInformation,
    GetUserProfile,
    LocalizeText,
    localizeWithFallback,
    ReportType,
    SendMessageComposer
} from '../../../api';
import { Permission } from '../../../api/permissions';
import weblinkIcon from '../../../assets/images/navigator/air/icon-weblink.png';
import removeRightsIcon from '../../../assets/images/navigator/air/remove-rights.png';
import nativeAtlas from '../../../assets/images/navigator/air/room-info-native-atlas.png';
import { LayoutBadgeImageView, LayoutRoomThumbnailView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { RoomWidgetThumbnailEvent } from '../../../events';
import { useHasPermission, useHelp, useNavigatorData, useNavigatorFavourite, useNavigatorUiStore, useRoom } from '../../../hooks';

const AtlasSprite = ({ x, y, width, height, className = '' }: { x: number; y: number; width: number; height: number; className?: string }) => (
    <svg aria-hidden="true" className={className} width={width} height={height} viewBox={`${x} ${y} ${width} ${height}`}>
        <image href={nativeAtlas} width={256} height={256} />
    </svg>
);

type SkinPiece = { name: string; source: number[]; bounds: number[] };
const REPORT_BODY: SkinPiece[] = [
    { name: 'button_top_left', source: [128, 0, 6, 8], bounds: [11.0, 11.0, 6.0, 8.0] },
    { name: 'button_top_center', source: [134, 0, 1, 8], bounds: [17.0, 11.0, 186.0, 8.0] },
    { name: 'button_top_right', source: [135, 0, 4, 8], bounds: [203.0, 11.0, 4.0, 8.0] },
    { name: 'button_center_left', source: [128, 8, 6, 12], bounds: [11.0, 19.0, 6.0, 17.0] },
    { name: 'button_center_center', source: [134, 8, 1, 12], bounds: [17.0, 19.0, 186.0, 17.0] },
    { name: 'button_center_right', source: [135, 8, 4, 12], bounds: [203.0, 19.0, 4.0, 17.0] },
    { name: 'button_bottom_left', source: [128, 20, 6, 8], bounds: [11.0, 36.0, 6.0, 8.0] },
    { name: 'button_bottom_center', source: [134, 20, 1, 8], bounds: [17.0, 36.0, 186.0, 8.0] },
    { name: 'button_bottom_right', source: [135, 20, 4, 8], bounds: [203.0, 36.0, 4.0, 8.0] },
    { name: 'button_center_left_curve', source: [129, 31, 3, 5], bounds: [12.0, 25.0, 3.0, 5.0] },
    { name: 'button_center_right_curve', source: [135, 31, 3, 5], bounds: [203.0, 25.0, 3.0, 5.0] }
];
const REPORT_HOVER: SkinPiece[] = [
    { name: 'glow_top_left', source: [139, 0, 19, 19], bounds: [0.0, 0.0, 19.0, 19.0] },
    { name: 'glow_top_center', source: [158, 0, 12, 19], bounds: [19.0, 0.0, 180.0, 19.0] },
    { name: 'glow_top_right', source: [170, 0, 19, 19], bounds: [199.0, 0.0, 19.0, 19.0] },
    { name: 'glow_center_left', source: [139, 19, 19, 12], bounds: [0.0, 19.0, 19.0, 17.0] },
    { name: 'glow_center_right', source: [170, 19, 19, 12], bounds: [199.0, 19.0, 19.0, 17.0] },
    { name: 'glow_bottom_left', source: [139, 31, 19, 19], bounds: [0.0, 36.0, 19.0, 19.0] },
    { name: 'glow_bottom_center', source: [158, 31, 12, 19], bounds: [19.0, 36.0, 180.0, 19.0] },
    { name: 'glow_bottom_right', source: [170, 31, 19, 19], bounds: [199.0, 36.0, 19.0, 19.0] }
];
const REPORT_SKIN = {
    default: REPORT_BODY,
    hovering: [...REPORT_HOVER.filter((piece) => piece.name.startsWith('glow_')), ...REPORT_BODY],
    pressed: [
        ...REPORT_HOVER.filter((piece) => piece.name.startsWith('glow_')),
        ...REPORT_BODY.map((piece) => ({
            ...piece,
            source: piece.name.endsWith('_curve') ? [128, 0, 1, 1] : [piece.source[0], piece.source[1] + 50, ...piece.source.slice(2)],
            bounds: piece.name.endsWith('_curve') ? [piece.bounds[0], piece.bounds[1], 1, 1] : piece.bounds
        }))
    ]
};

const ReportSkin = () => (
    <>
        {Object.entries(REPORT_SKIN).map(([state, pieces]) => (
            <svg key={state} aria-hidden="true" className={'octane-room-info__report-skin is-' + state} width={218} height={55}>
                {pieces.map(({ name, source, bounds }) => (
                    <svg key={name} x={bounds[0]} y={bounds[1]} width={bounds[2]} height={bounds[3]} viewBox={source.join(' ')} preserveAspectRatio="none">
                        <image href={nativeAtlas} width={256} height={256} />
                    </svg>
                ))}
            </svg>
        ))}
    </>
);

const TagSkin = () => (
    <>
        {[0, 32].map((offset) => (
            <span key={offset} className={'octane-room-info__tag-skin ' + (offset ? 'is-hovering' : 'is-default')} aria-hidden="true">
                {[
                    { x: 0, width: 4, name: 'left' },
                    { x: 8, width: 1, name: 'middle' },
                    { x: 16, width: 5, name: 'right' }
                ].map((part) => (
                    <svg key={part.name} className={'is-' + part.name} viewBox={`${part.x + offset} 24 ${part.width} 14`} preserveAspectRatio="none">
                        <image href={nativeAtlas} width={256} height={256} />
                    </svg>
                ))}
            </span>
        ))}
    </>
);

export interface NavigatorRoomInfoViewProps {
    onCloseClick: () => void;
}

export const NavigatorRoomInfoView: FC<NavigatorRoomInfoViewProps> = ({ onCloseClick }) => {
    const [isRoomPicked, setIsRoomPicked] = useState(false);
    const [isRoomMuted, setIsRoomMuted] = useState(false);
    const embedExpanded = useNavigatorUiStore((state) => state.roomInfoEmbedExpanded);
    const setEmbedExpanded = useNavigatorUiStore((state) => state.setRoomInfoEmbedExpanded);
    const [removedRightsRoomId, setRemovedRightsRoomId] = useState(0);
    const { report } = useHelp();
    const { navigatorData } = useNavigatorData();
    const { roomSession } = useRoom();
    const canManageAnyRoom = useHasPermission(Permission.RoomOwnerAny);
    // Compatibility permission: the session facade does not expose the native thumbnail perk.
    const canUseRoomThumbnailCamera = useHasPermission(Permission.CameraUse);
    const canStaffPick = useHasPermission(Permission.NavigatorStaffPick);
    const room = navigatorData?.enteredGuestRoom;
    const roomId = room?.roomId ?? 0;
    const { isFavourite, toggle: toggleFavourite } = useNavigatorFavourite(roomId);

    useEffect(() => {
        if (roomId) SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
    }, [roomId]);

    useEffect(() => {
        if (!navigatorData) return;
        setIsRoomPicked(navigatorData.currentRoomIsStaffPick);
        if (navigatorData.enteredGuestRoom) setIsRoomMuted(navigatorData.enteredGuestRoom.allInRoomMuted);
    }, [navigatorData]);

    if (!room) return null;

    const isOwner = GetSessionDataManager().userId === room.ownerId;
    const canEdit = isOwner || canManageAnyRoom;
    const hasRights = roomSession?.controllerLevel === RoomControllerLevel.GUEST && !roomSession.isRoomOwner && removedRightsRoomId !== roomId;
    const isHome = navigatorData.homeRoomId === roomId;
    const canRate = navigatorData.canRate;
    const showRoomFilter = canEdit && GetConfigurationValue<boolean>('room.custom.filter.enabled', false);
    const showFloorEditor = roomSession?.controllerLevel >= RoomControllerLevel.GUEST;
    const showReport = GetConfigurationValue<boolean>('room.report.enabled', false);
    const showMute = room.canMute && GetConfigurationValue<boolean>('room_moderation.mute_all.enabled', false);
    const showEmbed = GetConfigurationValue<boolean>('embed.showInRoomInfo', false);
    const showActions = canEdit || showRoomFilter || showFloorEditor || canStaffPick || showReport || showMute;
    const embedSource = LocalizeText(
        'navigator.embed.src',
        ['roomType', 'embedCode', 'roomId'],
        ['private', GetConfigurationValue<string>('user.hash', ''), String(roomId)]
    ).replace('${url.prefix}', GetConfigurationValue<string>('url.prefix', ''));

    const processAction = (action: string, value?: string) => {
        switch (action) {
            case 'set_home_room':
                if (!isHome) SendMessageComposer(new UpdateHomeRoomMessageComposer(roomId));
                return;
            case 'navigator_search_tag':
                CreateLinkEvent(`navigator/search/tag:${value}`);
                return;
            case 'open_room_thumbnail_camera':
                DispatchUiEvent(new RoomWidgetThumbnailEvent(RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL));
                onCloseClick();
                return;
            case 'open_room_settings':
                SendMessageComposer(new RoomSettingsComposer(roomId));
                onCloseClick();
                return;
            case 'room_filter':
                SendMessageComposer(new GetCustomRoomFilterMessageComposer(roomId));
                onCloseClick();
                return;
            case 'open_floorplan_editor':
                CreateLinkEvent('floor-editor/toggle');
                onCloseClick();
                return;
            case 'toggle_pick':
                setIsRoomPicked(!isRoomPicked);
                SendMessageComposer(new ToggleStaffPickMessageComposer(roomId));
                SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
                return;
            case 'toggle_mute':
                setIsRoomMuted(!isRoomMuted);
                SendMessageComposer(new RoomMuteComposer());
                SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
                return;
            case 'report_room':
                report(ReportType.ROOM, { roomId, roomName: room.roomName });
                onCloseClick();
                return;
            case 'room_favourite':
                toggleFavourite();
                return;
            case 'remove_rights':
                SendMessageComposer(new RemoveOwnRoomRightsRoomMessageComposer(roomId));
                setRemovedRightsRoomId(roomId);
                return;
        }
    };

    return (
        <OctaneCardView
            className="octane-room-info"
            frameStyle={3}
            isResizable={false}
            dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }}
        >
            <OctaneCardHeaderView headerText={LocalizeText('navigator.roomsettings.roominfo')} onCloseClick={onCloseClick} />
            <OctaneCardContentView className="octane-room-info__content" overflow="visible">
                <div className="octane-room-info__details">
                    <div className="octane-room-info__quick-actions">
                        {hasRights && (
                            <button
                                type="button"
                                className="is-rights"
                                aria-label={LocalizeText('navigator.roominfo.removerights.tooltip')}
                                title={LocalizeText('navigator.roominfo.removerights.tooltip')}
                                onClick={() => processAction('remove_rights')}
                            >
                                <img src={removeRightsIcon} width={17} height={22} alt="" />
                            </button>
                        )}
                        {isHome ? (
                            <span className="is-home" aria-label={LocalizeText('navigator.room.popup.room.info.home')}>
                                <AtlasSprite x={24} y={0} width={19} height={14} />
                            </span>
                        ) : (
                            <button
                                type="button"
                                className="is-home"
                                aria-label={LocalizeText('navigator.roominfo.makehome.tooltip')}
                                title={LocalizeText('navigator.roominfo.makehome.tooltip')}
                                onClick={() => processAction('set_home_room')}
                            >
                                <AtlasSprite x={0} y={0} width={19} height={14} />
                            </button>
                        )}
                        {!isOwner && (
                            <button
                                type="button"
                                className="is-favourite"
                                aria-label={LocalizeText(isFavourite ? 'navigator.favourite.tooltip' : 'navigator.makefavourite.tooltip')}
                                title={LocalizeText(isFavourite ? 'navigator.favourite.tooltip' : 'navigator.makefavourite.tooltip')}
                                onClick={() => processAction('room_favourite')}
                            >
                                <AtlasSprite x={isFavourite ? 72 : 48} y={0} width={18} height={16} />
                            </button>
                        )}
                    </div>
                    <div className="octane-room-info__name is-bold">{room.roomName}</div>
                    {room.showOwner && room.ownerId > 0 && (
                        <button
                            type="button"
                            className="octane-room-info__owner"
                            title={LocalizeText('infostand.profile.link.tooltip')}
                            onClick={() => GetUserProfile(room.ownerId)}
                        >
                            <span className="is-caption is-bold">{LocalizeText('navigator.roomownercaption')}</span>
                            <span className="octane-room-info__eye">
                                <AtlasSprite x={0} y={40} width={13} height={11} className="is-default" />
                                <AtlasSprite x={24} y={40} width={13} height={11} className="is-hovering" />
                            </span>
                            <span>{room.ownerName}</span>
                        </button>
                    )}
                    <div className="octane-room-info__rating">
                        <span className="is-caption is-bold">{LocalizeText('navigator.roomrating')}</span>
                        <span>{navigatorData.currentRoomRating}</span>
                        {canRate && (
                            <span className="octane-room-info__rating-icon" title={LocalizeText('navigator.rateroom')}>
                                <AtlasSprite x={96} y={0} width={12} height={15} />
                            </span>
                        )}
                    </div>
                    {room.ranking > 0 && (
                        <div className="octane-room-info__rating">
                            <span className="is-caption is-bold">{LocalizeText('navigator.roomranking')}</span>
                            <span>{room.ranking}</span>
                        </div>
                    )}
                    <div className="octane-room-info__padding" />
                    {room.tags?.length > 0 && (
                        <div className="octane-room-info__tags">
                            {room.tags.slice(0, 4).map((tag, index) => (
                                <button key={index} type="button" className="octane-room-info__tag" onClick={() => processAction('navigator_search_tag', tag)}>
                                    <TagSkin />
                                    <span>#{tag}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {room.description && <div className="octane-room-info__description">{room.description}</div>}
                    <div className="octane-room-info__thumbnail-container">
                        <LayoutRoomThumbnailView className="octane-room-info__thumbnail" customUrl={room.officialRoomPicRef} roomId={roomId} />
                        {canEdit && canUseRoomThumbnailCamera && (
                            <button
                                type="button"
                                className="octane-room-info__camera"
                                aria-label={LocalizeText('tooltip.navigator.room.info.add.thumbnail')}
                                title={LocalizeText('tooltip.navigator.room.info.add.thumbnail')}
                                onClick={() => processAction('open_room_thumbnail_camera')}
                            >
                                <span />
                            </button>
                        )}
                    </div>
                </div>
                {room.habboGroupId > 0 && (
                    <button type="button" className="octane-room-info__group" onClick={() => GetGroupInformation(room.habboGroupId)}>
                        <LayoutBadgeImageView badgeCode={room.groupBadgeCode} className="octane-room-info__group-badge" isGroup />
                        <span>{LocalizeText('navigator.guildbase', ['groupName'], [room.groupName])}</span>
                    </button>
                )}
                {showEmbed && (
                    <div className="octane-room-info__embed">
                        <button
                            type="button"
                            className="octane-room-info__embed-toggle"
                            aria-expanded={embedExpanded}
                            onClick={() => setEmbedExpanded(!embedExpanded)}
                        >
                            <img src={weblinkIcon} width={17} height={15} alt="" />
                            <span>{LocalizeText('navigator.embed.caption')}</span>
                        </button>
                        {embedExpanded && (
                            <>
                                <div className="octane-room-info__embed-info">{LocalizeText('navigator.embed.info')}</div>
                                <input
                                    aria-label={LocalizeText('navigator.embed.caption')}
                                    className="octane-room-info__embed-source"
                                    value={embedSource}
                                    readOnly
                                    onClick={(event) => event.currentTarget.select()}
                                />
                            </>
                        )}
                    </div>
                )}
                {showActions && (
                    <div className="octane-room-info__actions">
                        {canEdit && (
                            <button type="button" className="octane-room-info__action" onClick={() => processAction('open_room_settings')}>
                                {LocalizeText('navigator.roomsettings')}
                            </button>
                        )}
                        {showRoomFilter && (
                            <button type="button" className="octane-room-info__action" onClick={() => processAction('room_filter')}>
                                {LocalizeText('navigator.roomsettings.roomfilter')}
                            </button>
                        )}
                        {showFloorEditor && (
                            <button type="button" className="octane-room-info__action" onClick={() => processAction('open_floorplan_editor')}>
                                {LocalizeText('open.floor.plan.editor')}
                            </button>
                        )}
                        {canStaffPick && (
                            <button type="button" className="octane-room-info__action" onClick={() => processAction('toggle_pick')}>
                                {LocalizeText(isRoomPicked ? 'navigator.staffpicks.unpick' : 'navigator.staffpicks.pick')}
                            </button>
                        )}
                        {showReport && (
                            <button type="button" className="octane-room-info__report" onClick={() => processAction('report_room')}>
                                <ReportSkin />
                                <span className="octane-room-info__panic">
                                    <AtlasSprite x={32} y={56} width={23} height={22} />
                                </span>
                                <svg
                                    aria-hidden="true"
                                    className="octane-room-info__report-divider"
                                    width={3}
                                    height={20}
                                    viewBox="64 56 3 3"
                                    preserveAspectRatio="none"
                                >
                                    <image href={nativeAtlas} width={256} height={256} />
                                </svg>
                                <span className="octane-room-info__report-caption">{localizeWithFallback('create.room.report', 'Report room')}</span>
                            </button>
                        )}
                        {showMute && (
                            <button type="button" className="octane-room-info__action" onClick={() => processAction('toggle_mute')}>
                                {LocalizeText(isRoomMuted ? 'navigator.muteall_on' : 'navigator.muteall_off')}
                            </button>
                        )}
                    </div>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
