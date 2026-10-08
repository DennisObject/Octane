import {
    GetGuestRoomResultEvent,
    GetRoomEngine,
    GetSessionDataManager,
    RoomChatSettings,
    RoomChatSettingsEvent,
    RoomDragEvent,
    RoomObjectCategory,
    RoomObjectType,
    RoomObjectVariable,
    RoomSessionChatEvent,
    RoomUserData,
    SystemChatStyleEnum
} from '@octane/renderer';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ChatBubbleMessage,
    ChatBubbleUtilities,
    ChatEntryType,
    ChatHistoryCurrentDate,
    GetConfigurationValue,
    GetRoomObjectScreenLocation,
    IRoomChatSettings,
    LocalizeText,
    PlaySound,
    RoomChatFormatter,
    resolveChatBubbleWidth
} from '../../../api';
import { captureNativeChatCreation } from '../../../components/room/widgets/chat/nativeChatScroller';
import { useChatHistory } from './../../chat-history';
import { useMessageEvent, useOctaneEvent } from '../../events';
import { useUserDataSnapshot } from '../../session/useSessionSnapshots';
import { useTranslation } from '../../translation';
import { useChatPreferences } from '../../useChatPreferences';
import { useRoom } from '../useRoom';
import { createChatLineQueue, reserveChatLine, resetChatLineQueue, settleChatLine, takeReadyChatLines } from './chatLineQueue';

const CHAT_MESSAGES_MAX = 250;

const useChatWidgetState = () => {
    const [chatMessages, setChatMessages] = useState<ChatBubbleMessage[]>([]);
    const [roomChatSettings, setChatSettings] = useState<IRoomChatSettings>({
        mode: RoomChatSettings.CHAT_MODE_FREE_FLOW,
        weight: RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL,
        speed: RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL,
        distance: 50,
        protection: RoomChatSettings.FLOOD_FILTER_NORMAL
    });
    const { chatPreferences } = useChatPreferences();
    const chatSettings = useMemo<IRoomChatSettings>(() => ({
        ...roomChatSettings,
        mode: chatPreferences?.chatMode ?? roomChatSettings.mode,
        weight: chatPreferences?.chatBubbleWidth ?? roomChatSettings.weight,
        speed: chatPreferences?.chatScrollSpeed ?? roomChatSettings.speed
    }), [roomChatSettings, chatPreferences]);
    const { roomSession = null } = useRoom();
    const { addChatEntry, updateChatEntry } = useChatHistory();
    const { settings, translateIncoming, consumeOutgoingTranslation } = useTranslation();
    const isDisposed = useRef(false);
    const roomTokenRef = useRef(0);
    const lineQueueRef = useRef(createChatLineQueue<ChatBubbleMessage>());
    const lineFlushFrameRef = useRef(0);
    // Reactive: re-renders if the session-data snapshot flips (e.g.
    // reconnect under a different user id). Safe to call here —
    // useChatWidget is not singleton-backed (see export below),
    // so the real React dispatcher is in scope and
    // useSyncExternalStore installs correctly.
    const ownUserId = useUserDataSnapshot().userId || -1;

    const applyTranslationToBubble = useCallback(
        (chatMessage: ChatBubbleMessage, originalText: string, translatedText: string, detectedLanguage: string, targetLanguage: string) => {
            const resolvedOriginalText = originalText || chatMessage.text || '';
            const resolvedTranslatedText = translatedText || resolvedOriginalText;
            const originalFormattedText = RoomChatFormatter(resolvedOriginalText);
            const translatedFormattedText = RoomChatFormatter(resolvedTranslatedText);

            chatMessage.text = resolvedOriginalText;
            chatMessage.formattedText = originalFormattedText;
            chatMessage.originalText = resolvedOriginalText;
            chatMessage.originalFormattedText = originalFormattedText;
            chatMessage.translatedText = resolvedTranslatedText;
            chatMessage.translatedFormattedText = translatedFormattedText;
            chatMessage.translationDetectedLanguage = detectedLanguage || '';
            chatMessage.translationTargetLanguage = targetLanguage || '';
            chatMessage.showTranslation = true;
        },
        []
    );

    const buildTranslatedEntryPatch = useCallback((originalText: string, translatedText: string, detectedLanguage: string, targetLanguage: string) => {
        const resolvedOriginalText = originalText || '';
        const resolvedTranslatedText = translatedText || resolvedOriginalText;

        return {
            showTranslation: true,
            message: RoomChatFormatter(resolvedOriginalText),
            originalMessage: RoomChatFormatter(resolvedOriginalText),
            translatedMessage: RoomChatFormatter(resolvedTranslatedText),
            detectedLanguage: detectedLanguage || '',
            targetLanguage: targetLanguage || ''
        };
    }, []);

    const applyAsyncTranslation = useCallback(
        (bubbleId: number, chatEntryId: number, originalText: string, translatedText: string, detectedLanguage: string, targetLanguage: string) => {
            setChatMessages((prevValue) => {
                const newValue = [...prevValue];
                const bubble = newValue.find((chat) => chat.id === bubbleId);

                if (bubble) applyTranslationToBubble(bubble, originalText, translatedText, detectedLanguage, targetLanguage);

                return newValue;
            });

            updateChatEntry(chatEntryId, buildTranslatedEntryPatch(originalText, translatedText, detectedLanguage, targetLanguage));
        },
        [applyTranslationToBubble, buildTranslatedEntryPatch, updateChatEntry]
    );

    const cancelLineFlush = () => {
        if (!lineFlushFrameRef.current) return;

        window.cancelAnimationFrame(lineFlushFrameRef.current);
        lineFlushFrameRef.current = 0;
    };

    const flushQueuedLines = () => {
        lineFlushFrameRef.current = 0;

        if (isDisposed.current) return;

        const batch = takeReadyChatLines(lineQueueRef.current);

        if (!batch.length) return;

        setChatMessages((prevValue) => {
            const next = prevValue.concat(batch);

            if (next.length > CHAT_MESSAGES_MAX) next.splice(0, next.length - CHAT_MESSAGES_MAX);

            return next;
        });
    };

    const scheduleLineFlush = () => {
        if (lineFlushFrameRef.current || isDisposed.current) return;

        lineFlushFrameRef.current = window.requestAnimationFrame(flushQueuedLines);
    };

    const abandonLine = (seq: number) => {
        settleChatLine(lineQueueRef.current, seq, null);
        scheduleLineFlush();
    };

    const getScrollSpeed = useMemo(() => {
        if (!chatSettings) return 6000;

        switch (chatSettings.speed) {
            case RoomChatSettings.CHAT_SCROLL_SPEED_FAST:
                return 3000;
            case RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL:
                return 6000;
            case RoomChatSettings.CHAT_SCROLL_SPEED_SLOW:
                return 12000;
        }
    }, [chatSettings]);

    const processChatEvent = (event: RoomSessionChatEvent, roomToken: number, seq: number) => {
        if (!roomSession || isDisposed.current) {
            abandonLine(seq);

            return;
        }

        const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, event.objectId, RoomObjectCategory.UNIT);
        const bubbleLocation = roomObject ? GetRoomObjectScreenLocation(roomSession.roomId, roomObject?.id, RoomObjectCategory.UNIT) : { x: 0, y: 0 };
        const userData = roomObject ? roomSession.userDataManager.getUserDataByIndex(event.objectId) : new RoomUserData(-1);

        if (!userData) return;

        let username = '';
        let avatarColor = 0;
        let imageUrl: string = null;
        let imagePromise: Promise<string> = null;
        let chatType = event.chatType;
        let styleId = event.style;
        let userType = 0;
        let text = event.message;

        if (userData) {
            userType = userData.type;

            const figure = userData.figure;

            switch (userType) {
                case RoomObjectType.PET:
                    imagePromise = ChatBubbleUtilities.getPetImage(figure, 2, true, 32, roomObject.model.getValue<string>(RoomObjectVariable.FIGURE_POSTURE)).catch(() => null);
                    break;
                case RoomObjectType.USER:
                    imagePromise = ChatBubbleUtilities.getUserImage(figure).catch(() => null);
                    break;
                case RoomObjectType.RENTABLE_BOT:
                case RoomObjectType.BOT:
                    styleId = SystemChatStyleEnum.BOT;
                    break;
            }

            avatarColor = ChatBubbleUtilities.AVATAR_COLOR_CACHE.get(figure);
            username = userData.name;
        }

        switch (chatType) {
            case RoomSessionChatEvent.CHAT_TYPE_RESPECT:
                text = LocalizeText('widgets.chatbubble.respect', ['username'], [username]);

                if (GetConfigurationValue('respect.options')['enabled']) PlaySound(GetConfigurationValue('respect.options')['sound']);

                break;
            case RoomSessionChatEvent.CHAT_TYPE_PETREVIVE:
            case RoomSessionChatEvent.CHAT_TYPE_PET_REBREED_FERTILIZE:
            case RoomSessionChatEvent.CHAT_TYPE_PET_SPEED_FERTILIZE: {
                let textKey = 'widget.chatbubble.petrevived';

                if (chatType === RoomSessionChatEvent.CHAT_TYPE_PET_REBREED_FERTILIZE) {
                    textKey = 'widget.chatbubble.petrefertilized';
                } else if (chatType === RoomSessionChatEvent.CHAT_TYPE_PET_SPEED_FERTILIZE) {
                    textKey = 'widget.chatbubble.petspeedfertilized';
                }

                let targetUserName: string = null;

                const newRoomObject = GetRoomEngine().getRoomObject(roomSession.roomId, event.extraParam, RoomObjectCategory.UNIT);

                if (newRoomObject) {
                    const newUserData = roomSession.userDataManager.getUserDataByIndex(newRoomObject.id);

                    if (newUserData) targetUserName = newUserData.name;
                }

                text = LocalizeText(textKey, ['petName', 'userName'], [username, targetUserName]);
                break;
            }
            case RoomSessionChatEvent.CHAT_TYPE_PETRESPECT:
                text = LocalizeText('widget.chatbubble.petrespect', ['petname'], [username]);
                break;
            case RoomSessionChatEvent.CHAT_TYPE_PETTREAT:
                text = LocalizeText('widget.chatbubble.pettreat', ['petname'], [username]);
                break;
            case RoomSessionChatEvent.CHAT_TYPE_HAND_ITEM_RECEIVED:
                text = LocalizeText('widget.chatbubble.handitem', ['username', 'handitem'], [username, LocalizeText('handitem' + event.extraParam)]);
                break;
            case RoomSessionChatEvent.CHAT_TYPE_MUTE_REMAINING: {
                const remainingSeconds = Math.max(0, event.extraParam);
                const hours = Math.floor(remainingSeconds / 3600).toString();
                const minutes = Math.floor((remainingSeconds % 3600) / 60).toString();
                const seconds = (remainingSeconds % 60).toString();

                text = LocalizeText('widget.chatbubble.mutetime', ['hours', 'minutes', 'seconds'], [hours, minutes, seconds]);
                break;
            }
        }

        const isTranslatableChatType =
            chatType === RoomSessionChatEvent.CHAT_TYPE_SPEAK ||
            chatType === RoomSessionChatEvent.CHAT_TYPE_WHISPER ||
            chatType === RoomSessionChatEvent.CHAT_TYPE_SHOUT;

        const outgoingTranslation = isTranslatableChatType && userData.webID === ownUserId ? consumeOutgoingTranslation(text) : null;
        const originalText = outgoingTranslation?.originalText || text;
        const formattedText = RoomChatFormatter(originalText);
        const color = avatarColor && ('#' + avatarColor.toString(16).padStart(6, '0') || null);

        const chatMessage = new ChatBubbleMessage(
            userData.roomIndex,
            RoomObjectCategory.UNIT,
            roomSession.roomId,
            originalText,
            formattedText,
            username,
            { x: bubbleLocation.x, y: bubbleLocation.y },
            chatType,
            styleId,
            imageUrl,
            color
        );
        captureNativeChatCreation(chatMessage, chatSettings.mode);
        // The renderer adds bubbleWidthOverride to the chat event in Octane-Renderer#212; until that
        // lands the published event has no such field, so it is read as optional.
        // Native bubbles resolve their width at creation; later preference changes affect new bubbles only.
        chatMessage.bubbleWidthOverride = resolveChatBubbleWidth(
            (event as RoomSessionChatEvent & { bubbleWidthOverride?: number }).bubbleWidthOverride,
            chatSettings.weight
        );

        if (outgoingTranslation) {
            applyTranslationToBubble(
                chatMessage,
                outgoingTranslation.originalText,
                outgoingTranslation.translatedText,
                outgoingTranslation.detectedLanguage,
                outgoingTranslation.targetLanguage
            );
        }

        if (isDisposed.current || roomToken !== roomTokenRef.current) {
            abandonLine(seq);

            return;
        }

        settleChatLine(lineQueueRef.current, seq, chatMessage);
        scheduleLineFlush();

        // Pet, Bot and Rentable Bot chat is fire-and-forget ("UDP-style"):
        // the live bubble already rendered above, but we deliberately skip
        // addChatEntry so the entry never lands in localStorage. A pet-heavy
        // room used to push 30+ KB per message (base64 head data URL) into
        // the chat history, exhausting the localStorage quota in minutes.
        // Real users still go through the full persisted path.
        const chatEntryId =
            userType === RoomObjectType.USER
                ? addChatEntry({
                      id: -1,
                      webId: userData.webID,
                      entityId: userData.roomIndex,
                      name: username,
                      look: userData.figure,
                      imageUrl,
                      style: styleId,
                      chatType: chatType,
                      entityType: userData.type,
                      message: formattedText,
                      timestamp: ChatHistoryCurrentDate(),
                      type: ChatEntryType.TYPE_CHAT,
                      roomId: roomSession.roomId,
                      color,
                      ...(outgoingTranslation
                          ? buildTranslatedEntryPatch(
                                outgoingTranslation.originalText,
                                outgoingTranslation.translatedText,
                                outgoingTranslation.detectedLanguage,
                                outgoingTranslation.targetLanguage
                            )
                          : {})
                  })
                : -1;

        if (imagePromise) {
            void imagePromise.then((resolvedImageUrl) => {
                if (!resolvedImageUrl || isDisposed.current || roomToken !== roomTokenRef.current) return;

                // This same object may still be in the RAF queue or already in live state.
                chatMessage.imageUrl = resolvedImageUrl;
                setChatMessages((prevValue) => {
                    if (isDisposed.current || roomToken !== roomTokenRef.current || !prevValue.includes(chatMessage)) return prevValue;

                    return [...prevValue];
                });

                if (chatEntryId >= 0) updateChatEntry(chatEntryId, { imageUrl: resolvedImageUrl });
            }).catch(() => {});
        }

        if (!settings.enabled || outgoingTranslation || !isTranslatableChatType || !text.trim().length) return;

        void translateIncoming(text).then((translation) => {
            if (!translation || isDisposed.current || roomToken !== roomTokenRef.current) return;

            applyTranslationToBubble(
                chatMessage,
                translation.originalText,
                translation.translatedText,
                translation.detectedLanguage,
                translation.targetLanguage
            );

            applyAsyncTranslation(
                chatMessage.id,
                chatEntryId,
                translation.originalText,
                translation.translatedText,
                translation.detectedLanguage,
                translation.targetLanguage
            );
        });
    };

    useOctaneEvent<RoomSessionChatEvent>(RoomSessionChatEvent.CHAT_EVENT, (event) => {
        const roomToken = roomTokenRef.current;
        const seq = reserveChatLine(lineQueueRef.current);

        try {
            processChatEvent(event, roomToken, seq);
        } catch (error) {
            console.error('[RoomChat] Failed to process chat event', error);
        } finally {
            // Settlement is idempotent: preserve queued text, or close a failed/skipped slot.
            abandonLine(seq);
        }
    });

    useOctaneEvent<RoomDragEvent>(RoomDragEvent.ROOM_DRAG, (event) => {
        if (!chatMessages.length || event.roomId !== roomSession.roomId) return;

        const offsetX = event.offsetX;

        chatMessages.forEach((chat) => {
            if (!chat.elementRef) return;

            chat.left += offsetX;

            if (chat.location) chat.location = { ...chat.location, x: chat.location.x + offsetX };
        });
    });

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser.roomEnter) return;

        setChatSettings(parser.chat);
    });

    useMessageEvent<RoomChatSettingsEvent>(RoomChatSettingsEvent, (event) => {
        const parser = event.getParser();

        setChatSettings(parser.chat);
    });

    useEffect(() => {
        roomTokenRef.current += 1;
        resetChatLineQueue(lineQueueRef.current);
        cancelLineFlush();
        setChatMessages([]);
    }, [roomSession?.roomId]);

    useEffect(() => {
        isDisposed.current = false;

        return () => {
            isDisposed.current = true;
            roomTokenRef.current += 1;
            resetChatLineQueue(lineQueueRef.current);
            cancelLineFlush();
        };
    }, []);

    return { chatMessages, setChatMessages, chatSettings, getScrollSpeed, roomId: roomSession?.roomId };
};

export const useChatWidget = useChatWidgetState;
