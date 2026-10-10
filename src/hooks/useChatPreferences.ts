import { UserSettingsChatPreferencesComposer, UserSettingsEvent } from '@volt/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../api';
import { useMessageEvent } from './events';

interface ChatPreferences {
    chatMode: number;
    chatBubbleWidth: number;
    chatScrollSpeed: number;
}

const useChatPreferencesState = () => {
    const [chatPreferences, setChatPreferences] = useState<ChatPreferences>(null);

    useMessageEvent<UserSettingsEvent>(UserSettingsEvent, (event) => {
        const parser = event.getParser();

        setChatPreferences({
            chatMode: parser.chatMode,
            chatBubbleWidth: parser.chatBubbleWidth,
            chatScrollSpeed: parser.chatScrollSpeed
        });
    });

    const updateChatPreferences = useCallback((next: ChatPreferences) => {
        if (chatPreferences &&
            chatPreferences.chatMode === next.chatMode &&
            chatPreferences.chatBubbleWidth === next.chatBubbleWidth &&
            chatPreferences.chatScrollSpeed === next.chatScrollSpeed) return;

        setChatPreferences(next);
        SendMessageComposer(new UserSettingsChatPreferencesComposer(next.chatMode, next.chatBubbleWidth, next.chatScrollSpeed));
    }, [chatPreferences]);

    return { chatPreferences, updateChatPreferences };
};

export const useChatPreferences = () => useSharedHook(useChatPreferencesState);

registerSharedHook(useChatPreferencesState);
