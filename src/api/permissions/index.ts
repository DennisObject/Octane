import { GetSessionDataManager } from '@octane/renderer';

export const Permission = {
    ModerationTool: 'moderation.tool',
    RoomOwnerAny: 'room.owner.any',
    Ambassador: 'ambassador',
    CampaignCalendarForce: 'campaign.calendar.force',
    CameraUse: 'camera.use',
    CatalogEdit: 'catalog.edit',
    FurniEdit: 'furni.edit',
    FurniDelete: 'furni.delete',
    RoomDiceCloseAny: 'room.dice.close_any',
    HousekeepingAccess: 'housekeeping.access',
    RewardTrackManage: 'rewardtrack.manage',
    NavigatorStaffPick: 'navigator.staff_pick',
    FortuneWheelManage: 'fortune_wheel.manage',
    HousekeepingRolesManage: 'housekeeping.roles.manage',
    NavigatorRoomModelsStaff: 'navigator.room_models.staff',
    NavigatorCategoriesStaff: 'navigator.categories.staff',
    NavigatorEventsModerate: 'navigator.events.moderate',
    CatalogGiftStaff: 'catalog.gift.staff',
    RoomYoutubeControlAny: 'room.youtube.control_any',
    ChatStyleSystem: 'chat.style.system',
    ChatStyleStaff: 'chat.style.staff'
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export const HasPermission = (key: PermissionKey): boolean => GetSessionDataManager()?.getPermissionsSnapshot()?.get(key) === 1;
