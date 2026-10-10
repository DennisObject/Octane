import { MessengerMessageType } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { MessengerThread, MessengerThreadChat, MessengerThreadChatGroup } from '../../../../../api';
import { FriendsMessengerThreadGroup } from './FriendsMessengerThreadGroup';

export const FriendsMessengerThreadView: FC<{ thread: MessengerThread }> = ({ thread }) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    const groups = useMemo(() => {
        const next: MessengerThreadChatGroup[] = [];
        for (const original of thread?.groups ?? []) {
            for (const chat of original.chats) {
                const previous = next[next.length - 1];
                const last = previous?.chats[previous.chats.length - 1];
                const normal = chat.type === MessengerThreadChat.CHAT || chat.type === MessengerMessageType.Habbicon;
                const lastNormal = last && (last.type === MessengerThreadChat.CHAT || last.type === MessengerMessageType.Habbicon);
                const sentAt = chat.date.getTime() - chat.secondsSinceSent * 1000;
                const lastSentAt = last && last.date.getTime() - last.secondsSinceSent * 1000;
                if (normal && lastNormal && previous.userId === original.userId && previous.type === original.type && sentAt < lastSentAt + 600000) previous.addChat(chat);
                else {
                    const group = new MessengerThreadChatGroup(original.userId, original.type);
                    group.addChat(chat);
                    next.push(group);
                }
            }
        }
        return next;
    }, [thread]);

    return <>{groups.map((group) => <FriendsMessengerThreadGroup key={group.chats[0].id} group={group} thread={thread} now={now} />)}</>;
};
