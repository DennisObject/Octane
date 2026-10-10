import { GroupJoinComposer } from '@volt/renderer';
import { SendMessageComposer } from '../volt';

export const TryJoinGroup = (groupId: number) => SendMessageComposer(new GroupJoinComposer(groupId));
