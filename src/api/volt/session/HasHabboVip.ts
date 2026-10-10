import { GetSessionDataManager, HabboClubLevelEnum } from '@volt/renderer';

export function HasHabboVip(): boolean {
    return GetSessionDataManager().clubLevel >= HabboClubLevelEnum.VIP;
}
