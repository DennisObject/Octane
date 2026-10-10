import { GetSessionDataManager, RoomUnitChatStyleComposer, UserInfoDataParser, UserInfoEvent, UserSettingsEvent } from '@volt/renderer';
import { useCallback, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { clampChatFontScale } from '../../components/room/widgets/chat-input/chatTextSize';
import { useMessageEvent } from '../events';
import { useUserDataSnapshot } from './useSessionSnapshots';

// Singleton source published through the Zustand-backed shared-hook bridge.
const useSessionInfoState = () => {
    const [userInfo, setUserInfo] = useState<UserInfoDataParser>(null);
    const [chatStyle, setChatStyle] = useState({ styleId: 0, fontScale: 0 });
    // Actions may run in the same React batch; keep the companion preference current synchronously.
    const chatStyleRef = useRef(chatStyle);

    const updateChatStyleId = useCallback((styleId: number) => {
        const previous = chatStyleRef.current;
        if (styleId === previous.styleId) return;
        const next = { ...previous, styleId };
        chatStyleRef.current = next;
        setChatStyle(next);
        SendMessageComposer(new RoomUnitChatStyleComposer(styleId, next.fontScale));
    }, []);

    const updateChatFontScale = useCallback((value: number) => {
        const fontScale = clampChatFontScale(value);
        const previous = chatStyleRef.current;
        if (fontScale === previous.fontScale) return;
        const next = { ...previous, fontScale };
        chatStyleRef.current = next;
        setChatStyle(next);
        SendMessageComposer(new RoomUnitChatStyleComposer(next.styleId, fontScale));
    }, []);

    const respectUser = (userId: number) => GetSessionDataManager().giveRespect(userId);
    const respectPet = (petId: number) => GetSessionDataManager().givePetRespect(petId);

    useMessageEvent<UserInfoEvent>(UserInfoEvent, (event) => {
        setUserInfo(event.getParser().userInfo);
    });

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, (event) => {
        const parser = event.getParser();
        const next = { styleId: parser.chatType, fontScale: clampChatFontScale(parser.fontScale) };
        chatStyleRef.current = next;
        setChatStyle(next);
    });

    return { userInfo, chatStyleId: chatStyle.styleId, chatFontScale: chatStyle.fontScale, respectUser, respectPet, updateChatStyleId, updateChatFontScale };
};

// Public surface. SessionDataManager already invalidates the
// snapshot on UserInfoEvent / FigureUpdateEvent / giveRespect /
// givePetRespect, so userFigure / respectsLeft / respectsPetLeft stay
// in sync without local useState mirrors.
export const useSessionInfo = () => {
    const shared = useSharedHook(useSessionInfoState);
    const userData = useUserDataSnapshot();

    return {
        ...shared,
        userFigure: userData.figure,
        userRespectRemaining: userData.respectsLeft,
        petRespectRemaining: userData.respectsPetLeft
    };
};

registerSharedHook(useSessionInfoState);
