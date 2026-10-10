import { UserProfileComposer } from '@volt/renderer';
import { SendMessageComposer } from '../volt';

export function GetUserProfile(userId: number): void {
    SendMessageComposer(new UserProfileComposer(userId));
}
