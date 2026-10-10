import { GetSessionDataManager, HabboClubLevelEnum } from '@volt/renderer';

export function HasHabboClub(): boolean {
    return GetSessionDataManager().clubLevel >= HabboClubLevelEnum.CLUB;
}
