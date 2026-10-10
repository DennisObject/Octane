import { CreateLinkEvent } from '@volt/renderer';

export function GetGroupManager(groupId: number): void {
    CreateLinkEvent(`groups/manage/${groupId}`);
}
