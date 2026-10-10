import { GroupInformationComposer } from '@volt/renderer';
import { SendMessageComposer } from '../volt';

export function GetGroupInformation(groupId: number): void {
    SendMessageComposer(new GroupInformationComposer(groupId, true));
}
