import { GetSessionDataManager } from '@volt/renderer';

export const Permission = {
    ModerationTool: 'moderation.tool',
    RoomOwnerAny: 'room.owner.any',
    Ambassador: 'ambassador',
    CampaignCalendarForce: 'campaign.calendar.force',
    CameraUse: 'camera.use',
    RoomDiceCloseAny: 'room.dice.close_any',
    RewardTrackManage: 'rewardtrack.manage',
    NavigatorStaffPick: 'navigator.staff_pick',
    NavigatorCategoriesStaff: 'navigator.categories.staff',
    NavigatorEventsModerate: 'navigator.events.moderate',
    CatalogGiftStaff: 'catalog.gift.staff',
    RoomYoutubeControlAny: 'room.youtube.control_any'
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export const HasPermission = (key: PermissionKey): boolean => GetSessionDataManager()?.getPermissionsSnapshot()?.get(key) === 1;
