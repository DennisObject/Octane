import { GroupFavoriteComposer, GroupUnfavoriteComposer, HabboGroupEntryData } from '@volt/renderer';
import { SendMessageComposer } from '../volt';

export const ToggleFavoriteGroup = (group: HabboGroupEntryData) => {
    SendMessageComposer(group.favourite ? new GroupUnfavoriteComposer(group.groupId) : new GroupFavoriteComposer(group.groupId));
};
