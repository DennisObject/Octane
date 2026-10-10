import {
    AuthenticatedEvent,
    ConsoleReadReceiptEvent,
    ConsoleTypingComposer,
    FriendIsTypingEvent,
    FriendListUpdateEvent,
    GetSessionDataManager,
    InstantMessageErrorEvent,
    MarkConsoleReadComposer,
    MessengerMessageAckEvent,
    MessengerMessageEvent,
    MessengerMessageFailedEvent,
    MessengerMessageType,
    NewConsoleMessageEvent,
    RoomInviteErrorEvent,
    RoomInviteEvent,
    SendMessageComposer as SendMessageComposerPacket,
    SendMessengerMessageComposer
} from '@volt/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    CloneObject,
    LocalizeText,
    localizeWithFallback,
    MessengerThread,
    MessengerThreadChat,
    NotificationAlertType,
    PlaySound,
    SendMessageComposer,
    SoundNames,
    selectMessages,
    selectMessengerIconState
} from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { useMessengerHistory, useMessengerRealtime } from './messenger';
import { useFriends } from './useFriends';

const useMessengerState = () => {
    // Still load-bearing after FriendsPersistentMessengerView was removed: the realtime
    // store drives the messenger icon state and history prefetch for the SWF window.
    const persistentState = useMessengerRealtime();
    const persistentHistory = useMessengerHistory();
    const [messageThreads, setMessageThreads] = useState<MessengerThread[]>([]);
    const [activeThreadId, updateActiveThreadId] = useState<number>(-1);
    const [hiddenThreadIds, setHiddenThreadIds] = useState<number[]>([]);
    const { getFriend = null } = useFriends();
    const { simpleAlert = null } = useNotification();

    const [typingUserIds, setTypingUserIds] = useState<number[]>([]);
    const typingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const habbiconConfirmationId = useRef(0);
    const pendingHabbicons = useRef(new Map<number, { thread: MessengerThread; id: number; timer: ReturnType<typeof setTimeout> }>());
    const historyMessageIdsRef = useRef<Map<number, Set<number>>>(new Map());
    const hiddenThreadIdsRef = useRef(hiddenThreadIds);

    const messageThreadsRef = useRef(messageThreads);
    const activeThreadIdRef = useRef(-1);
    const moderationShown = useRef(false);
    // Native widgets retain this construction flag until the conversation is rebuilt.
    const visualizationThreadIdRef = useRef(-1);
    const offlinePlaceholderMessagesRef = useRef(new WeakSet<MessengerThreadChat>());
    const getOfflinePlaceholder = useCallback((chat: MessengerThreadChat) => offlinePlaceholderMessagesRef.current.has(chat), []);

    const publishThreads = useCallback((threads: MessengerThread[]) => {
        messageThreadsRef.current = threads;
        setMessageThreads(threads);
    }, []);

    const publishHiddenThreads = (ids: number[]) => {
        hiddenThreadIdsRef.current = ids;
        setHiddenThreadIds(ids);
    };

    const setActiveThreadId = useCallback((threadId: number, rebuildVisualization = true) => {
        if (threadId > 0 && (rebuildVisualization || visualizationThreadIdRef.current !== threadId)) {
            visualizationThreadIdRef.current = threadId;
            // Retained/history messages are backfilled, not constructed as live outgoing widgets.
            offlinePlaceholderMessagesRef.current = new WeakSet<MessengerThreadChat>();
        }
        activeThreadIdRef.current = threadId;
        updateActiveThreadId(threadId);
        const current = messageThreadsRef.current.find((thread) => thread.threadId === threadId);
        if (!current) return;
        const thread = CloneObject(current);
        thread.setRead();
        publishThreads(messageThreadsRef.current.map((existing) => existing.threadId === threadId ? thread : existing));
        if (thread.participant.id > 0) SendMessageComposer(new MarkConsoleReadComposer(thread.participant.id));
    }, [publishThreads]);

    const visibleThreads = useMemo(() => messageThreads.filter((thread) => hiddenThreadIds.indexOf(thread.threadId) === -1), [messageThreads, hiddenThreadIds]);
    const activeThread = useMemo(
        () => activeThreadId > 0 && visibleThreads.find((thread) => thread.threadId === activeThreadId || null),
        [activeThreadId, visibleThreads]
    );

    const getMessageThread = (userId: number) => {
        let thread = messageThreadsRef.current.find((thread) => thread.participant && thread.participant.id === userId);

        if (!thread) {
            const friend = getFriend(userId);

            if (!friend) return null;

            thread = new MessengerThread(friend);

            if (!moderationShown.current) {
                thread.addMessage(null, LocalizeText('messenger.moderationinfo'), 0, null, MessengerThreadChat.SECURITY_NOTIFICATION);
                moderationShown.current = true;
            }
            if (!friend.online) thread.addMessage(null, LocalizeText('messenger.notification.persisted_messages'), 0, null, MessengerThreadChat.SECURITY_NOTIFICATION);

            thread.setRead();

            publishThreads([...messageThreadsRef.current, thread]);
        } else {
            if (hiddenThreadIdsRef.current.includes(thread.threadId)) publishHiddenThreads(hiddenThreadIdsRef.current.filter((id) => id !== thread.threadId));
        }

        return thread;
    };

    const closeThread = (threadId: number) => {
        if (!hiddenThreadIdsRef.current.includes(threadId)) publishHiddenThreads([...hiddenThreadIdsRef.current, threadId]);
        if (activeThreadIdRef.current === threadId) {
            const first = messageThreadsRef.current.find((thread) => !hiddenThreadIdsRef.current.includes(thread.threadId));
            setActiveThreadId(first?.threadId ?? -1);
        }
    };

    const sendMessage = (
        thread: MessengerThread,
        senderId: number,
        messageText: string,
        secondsSinceSent = 0,
        extraData: string = null,
        messageType = MessengerThreadChat.CHAT
    ) => {
        if (!thread || !messageText?.length) return;
        const ownMessage = senderId === GetSessionDataManager().userId;
        if (ownMessage && messageType === MessengerThreadChat.CHAT && messageText.length > 120) return;
        const current = messageThreadsRef.current.find((existing) => existing.threadId === thread.threadId);
        if (!current) return;
        const next = CloneObject(current);
        const previousMessages = ownMessage ? next.groups.flatMap((group) => group.chats) : [];
        const firstOwnMessage = ownMessage && (previousMessages.length === 0 || (previousMessages.length === 1 && previousMessages[0].type === MessengerThreadChat.SECURITY_NOTIFICATION));
        const isNotification = messageType === MessengerThreadChat.ROOM_INVITE || messageType === MessengerThreadChat.STATUS_NOTIFICATION || messageType === MessengerThreadChat.SECURITY_NOTIFICATION;
        // MessengerThread owns mutable groups: append once in the action, never in a React updater.
        if (ownMessage && messageType === MessengerThreadChat.CHAT) SendMessageComposer(new SendMessageComposerPacket(next.participant.id, messageText));
        const displayText = ownMessage && messageType === MessengerThreadChat.CHAT && messageText.startsWith('${') ? ` ${messageText}` : messageText;
        const chat = next.addMessage(isNotification ? null : senderId, displayText, secondsSinceSent, extraData, messageType);
        if (chat && ownMessage && visualizationThreadIdRef.current === next.threadId && !next.participant.online && (next.participant.persistedMessageUser || next.participant.pocketHabboUser)) offlinePlaceholderMessagesRef.current.add(chat);
        if (activeThreadIdRef.current === next.threadId) next.setRead();
        publishThreads(messageThreadsRef.current.map((existing) => existing.threadId === next.threadId ? next : existing));
        if (firstOwnMessage) PlaySound(SoundNames.MESSENGER_NEW_THREAD);
        if (!ownMessage && activeThreadIdRef.current < 0 && (messageType === MessengerThreadChat.CHAT || messageType === MessengerMessageType.Habbicon || messageType === MessengerThreadChat.ROOM_INVITE)) PlaySound(SoundNames.MESSENGER_MESSAGE_RECEIVED);
    };

    const sendHabbiconMessage = (thread: MessengerThread, id: number) => {
        if (!thread || id <= 0) return;

        const confirmationId = ++habbiconConfirmationId.current;
        const timer = setTimeout(() => {
            if (!pendingHabbicons.current.delete(confirmationId)) return;
            simpleAlert(localizeWithFallback('messenger.habbicon.failed', 'The Habicon could not be sent. Please try again.'));
        }, 10000);
        pendingHabbicons.current.set(confirmationId, { thread, id, timer });
        SendMessageComposer(new SendMessengerMessageComposer(0, thread.participant.id, confirmationId, MessengerMessageType.Habbicon, String(id), ''));
    };

    const noteHabbiconMessage = (conversationId: number, messageId: number) => {
        const known = historyMessageIdsRef.current.get(conversationId) ?? new Set<number>();
        known.add(messageId);
        historyMessageIdsRef.current.set(conversationId, known);
    };

    useMessageEvent<AuthenticatedEvent>(AuthenticatedEvent, () => {
        for (const pending of pendingHabbicons.current.values()) clearTimeout(pending.timer);
        pendingHabbicons.current.clear();
    });

    useMessageEvent<MessengerMessageAckEvent>(MessengerMessageAckEvent, (event) => {
        const parser = event.getParser();
        const pending = pendingHabbicons.current.get(parser.confirmationId);
        if (!pending) return;

        clearTimeout(pending.timer);
        pendingHabbicons.current.delete(parser.confirmationId);
        noteHabbiconMessage(parser.conversationId, parser.messageId);
        sendMessage(pending.thread, GetSessionDataManager().userId, String(pending.id), 0, null, MessengerMessageType.Habbicon);
    });

    useMessageEvent<MessengerMessageFailedEvent>(MessengerMessageFailedEvent, (event) => {
        const parser = event.getParser();
        const pending = pendingHabbicons.current.get(parser.confirmationId);
        if (!pending) return;

        clearTimeout(pending.timer);
        pendingHabbicons.current.delete(parser.confirmationId);
        simpleAlert(localizeWithFallback('messenger.habbicon.failed', 'The Habicon could not be sent. Please try again.'));
    });

    useMessageEvent<MessengerMessageEvent>(MessengerMessageEvent, (event) => {
        const message = event.getParser().message;
        if (message.type !== MessengerMessageType.Habbicon) return;

        const thread = getMessageThread(message.senderId);
        if (!thread) return;

        noteHabbiconMessage(message.conversationId, message.id);
        sendMessage(thread, message.senderId, message.message, 0, message.metadata, MessengerMessageType.Habbicon);
        if (thread.threadId === activeThreadIdRef.current) SendMessageComposer(new MarkConsoleReadComposer(message.senderId));
    });

    useEffect(
        () => () => {
            for (const pending of pendingHabbicons.current.values()) clearTimeout(pending.timer);
            pendingHabbicons.current.clear();
        },
        []
    );

    const sendTypingStatus = (peerId: number, isTyping: boolean) => {
        if (!peerId || peerId <= 0) return;

        SendMessageComposer(new ConsoleTypingComposer(peerId, isTyping));
    };

    useMessageEvent<NewConsoleMessageEvent>(NewConsoleMessageEvent, (event) => {
        const parser = event.getParser();
        const thread = getMessageThread(parser.senderId);

        if (!thread) return;

        if (parser.extraData === 'offline-sent') {
            sendMessage(thread, null, LocalizeText('messenger.notification.persisted_message_sent'), 0, null, MessengerThreadChat.STATUS_NOTIFICATION);
            return;
        }

        sendMessage(thread, parser.senderId, parser.messageText, parser.secondsSinceSent, parser.extraData);
        if (thread.threadId === activeThreadIdRef.current && parser.senderId > 0) SendMessageComposer(new MarkConsoleReadComposer(parser.senderId));
    });

    useMessageEvent<FriendListUpdateEvent>(FriendListUpdateEvent, (event) => {
        const parser = event.getParser();

        if (!parser.updatedFriends.length) return;

        const next = [...messageThreadsRef.current];
        let changed = false;
        for (const updatedFriend of parser.updatedFriends) {
            const index = next.findIndex((thread) => thread.participant?.id === updatedFriend.id);
            if (index === -1) continue;
            const thread = CloneObject(next[index]);
            const wasOnline = thread.participant.online;
            thread.participant.online = updatedFriend.online;
            if (wasOnline !== updatedFriend.online) {
                thread.addMessage(null, LocalizeText(updatedFriend.online ? 'messenger.notification.online' : 'messenger.notification.offline'), 0, null, MessengerThreadChat.STATUS_NOTIFICATION);
                if (activeThreadIdRef.current === thread.threadId) thread.setRead();
            }
            next[index] = thread;
            changed = true;
        }
        if (changed) publishThreads(next);
    });

    useEffect(() => {
        for (const thread of messageThreads) {
            const participantId = thread.participant?.id ?? 0;
            if (participantId <= 0) continue;

            const conversation = persistentState.conversationIds
                .map((conversationId) => persistentState.conversationsById[conversationId])
                .find((candidate) => candidate?.type === 0 && candidate.participantId === participantId);

            if (conversation?.id > 0) persistentHistory.loadInitial(conversation.id);
        }
    }, [messageThreads, persistentHistory, persistentState.conversationIds, persistentState.conversationsById]);

    useEffect(() => {
        const now = Math.floor(Date.now() / 1000);

        const nextThreads = [...messageThreadsRef.current];
        let changed = false;
        for (let index = 0; index < nextThreads.length; index++) {
            const currentThread = nextThreads[index];
            const participantId = currentThread.participant?.id ?? 0;
            if (participantId <= 0) continue;
            const conversation = persistentState.conversationIds.map((id) => persistentState.conversationsById[id])
                .find((candidate) => candidate?.type === 0 && candidate.participantId === participantId);
            if (!conversation || !persistentState.historyByConversation[conversation.id]?.loaded) continue;
            const known = historyMessageIdsRef.current.get(conversation.id) ?? new Set<number>();
            const messages = selectMessages(persistentState, conversation.id).filter((message) => message.id > 0 && !known.has(message.id));
            if (!messages.length) continue;
            const thread = CloneObject(currentThread);
            for (const message of messages) {
                thread.addMessage(message.senderId, message.message, Math.max(0, now - message.createdAt), message.metadata || null, message.type);
                known.add(message.id);
            }
            thread.setRead();
            historyMessageIdsRef.current.set(conversation.id, known);
            nextThreads[index] = thread;
            changed = true;
        }
        if (changed) publishThreads(nextThreads);
    }, [persistentState, publishThreads]);

    useMessageEvent<RoomInviteEvent>(RoomInviteEvent, (event) => {
        const parser = event.getParser();
        const thread = getMessageThread(parser.senderId);

        if (!thread) return;

        sendMessage(thread, parser.senderId, parser.messageText, 0, null, MessengerThreadChat.ROOM_INVITE);
    });

    useMessageEvent<RoomInviteErrorEvent>(RoomInviteErrorEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            `Received room invite error: ${parser.errorCode},recipients: ${parser.failedRecipients.join(',')}`,
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('friendlist.alert.title')
        );
    });

    useMessageEvent<FriendIsTypingEvent>(FriendIsTypingEvent, (event) => {
        const parser = event.getParser();
        const senderId = parser.senderId;

        if (senderId <= 0) return;

        const timers = typingTimersRef.current;
        const existing = timers.get(senderId);

        if (existing) {
            clearTimeout(existing);
            timers.delete(senderId);
        }

        if (parser.isTyping) {
            setTypingUserIds((prev) => (prev.indexOf(senderId) >= 0 ? prev : [...prev, senderId]));

            timers.set(
                senderId,
                setTimeout(() => {
                    typingTimersRef.current.delete(senderId);
                    setTypingUserIds((prev) => prev.filter((id) => id !== senderId));
                }, 6000)
            );
        } else {
            setTypingUserIds((prev) => prev.filter((id) => id !== senderId));
        }
    });

    useMessageEvent<ConsoleReadReceiptEvent>(ConsoleReadReceiptEvent, (event) => {
        const parser = event.getParser();
        const ownUserId = GetSessionDataManager().userId;

        const current = messageThreadsRef.current.find((thread) => thread.participant?.id === parser.readerId);
        if (!current) return;
        const next = CloneObject(current);
        next.setMessagesReadFromUser(ownUserId);
        publishThreads(messageThreadsRef.current.map((thread) => thread.threadId === next.threadId ? next : thread));
    });

    useMessageEvent<InstantMessageErrorEvent>(InstantMessageErrorEvent, (event) => {
        const parser = event.getParser();
        const keys: Record<number, string> = { 3: 'receivermuted', 4: 'sendermuted', 5: 'offline', 6: 'notfriend', 7: 'busy', 8: 'receiverhasnochat', 9: 'senderhasnochat', 10: 'offline_failed', 11: 'not_group_member', 12: 'not_group_admin', 13: 'sender_im_unavailable', 14: 'recipient_im_unavailable' };
        const key = keys[parser.errorCode];
        if (!key) return;
        const thread = getMessageThread(parser.userId);
        if (!thread) return;
        const text = LocalizeText(`messenger.error.${key}`);
        sendMessage(thread, null, parser.message?.length ? `${text}: ${parser.message}` : text, 0, null, MessengerThreadChat.SECURITY_NOTIFICATION);
    });

    const iconState = useMemo(() => selectMessengerIconState(
        persistentState,
        visibleThreads.length > 0,
        visibleThreads.some((thread) => thread.unreadCount > 0)
    ), [persistentState, visibleThreads]);

    return {
        messageThreads,
        activeThread,
        iconState,
        visibleThreads,
        getMessageThread,
        setActiveThreadId,
        closeThread,
        sendMessage,
        getOfflinePlaceholder,
        sendHabbiconMessage,
        typingUserIds,
        sendTypingStatus
    };
};

export const useMessenger = () => useSharedHook(useMessengerState);

registerSharedHook(useMessengerState);
