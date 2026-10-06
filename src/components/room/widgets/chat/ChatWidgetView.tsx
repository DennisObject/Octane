import { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChatBubbleMessage, GetConfigurationValue, resolveChatBubbleWidth } from '../../../../api';
import { useChatWidget, useChatWindow } from '../../../../hooks';
import { useSessionInfo } from '../../../../hooks/session/useSessionInfo';
import { CHAT_FONT_SCALES } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';
import { getChatViewerHeight } from './freeFlowChatLayout';
import { NativeChatScroller } from './nativeChatScroller';

export const ChatWidgetView: FC<{}> = (props) => {
    const { chatMessages = [], setChatMessages = null, chatSettings = null, getScrollSpeed = 6000, roomId = null } = useChatWidget();
    const { chatFontScale } = useSessionInfo();
    const fontScale = CHAT_FONT_SCALES[chatFontScale];
    const [chatWindowEnabled] = useChatWindow();
    const elementRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef(chatMessages);
    const [scroller] = useState(() => new NativeChatScroller());

    chatMessagesRef.current = chatMessages;

    const makeRoom = useCallback((chat: ChatBubbleMessage, creationMode: number) => {
        scroller.configure(chatSettings.mode, getScrollSpeed, fontScale);
        scroller.register(chat, creationMode);
    }, [scroller, chatSettings.mode, getScrollSpeed, fontScale]);

    useEffect(() => {
        scroller.configure(chatSettings.mode, getScrollSpeed, fontScale);
    }, [scroller, chatSettings.mode, getScrollSpeed, fontScale]);

    useLayoutEffect(() => {
        scroller.clear();
    }, [scroller, roomId]);

    useLayoutEffect(() => {
        const resize = () => {
            const element = elementRef.current;
            if (!element) return;
            const configuredHeightPercentage = GetConfigurationValue<number>('chat.viewer.height.percentage', 0.25);
            const newHeight = getChatViewerHeight(document.body.offsetHeight, configuredHeightPercentage);
            element.style.height = `${newHeight}px`;
            scroller.resize(newHeight, document.body.offsetWidth);
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, [scroller]);

    useEffect(() => {
        let frame = 0;
        let previous = Date.now();
        const update = () => {
            const now = Date.now();
            // v75 normal core passes one wall-clock delta per ticker frame, without replaying missed frames.
            const removed = scroller.advance(now - previous, chatMessagesRef.current);
            previous = now;
            if (removed.length) {
                const ids = new Set(removed);
                setChatMessages((messages) => messages.filter((chat) => !ids.has(chat.id)));
            }
            frame = window.requestAnimationFrame(update);
        };
        frame = window.requestAnimationFrame(update);
        return () => {
            window.cancelAnimationFrame(frame);
            scroller.clear();
        };
    }, [scroller, setChatMessages]);

    return (
        <div
            ref={elementRef}
            className="absolute flex justify-center items-center w-full top-0 min-h-px z-(--chat-zindex) bg-transparent roundehidden shadow-none pointer-events-none"
        >
            {!chatWindowEnabled &&
                chatMessages.map((chat) => (
                    <ChatWidgetMessageView
                        key={chat.id}
                        bubbleWidth={resolveChatBubbleWidth(chat.bubbleWidthOverride, chatSettings.weight)}
                        chat={chat}
                        mode={chatSettings.mode}
                        makeRoom={makeRoom}
                    />
                ))}
            {chatWindowEnabled && <ChatWidgetWindowView />}
        </div>
    );
};
