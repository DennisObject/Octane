import { FC, useCallback, useEffect, useRef } from 'react';
import { ChatBubbleMessage, GetConfigurationValue, resolveChatBubbleWidth } from '../../../../api';
import { useChatWidget, useChatWindow } from '../../../../hooks';
import IntervalWebWorker from '../../../../workers/IntervalWebWorker';
import { WorkerBuilder } from '../../../../workers/WorkerBuilder';
import { CHAT_TEXT_SIZE_EVENT } from '../chat-input/chatTextSize';
import { ChatWidgetMessageView } from './ChatWidgetMessageView';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';
import { measureBubbleVisualOffsets } from './chatBubbleMetrics';
import { separateOverlappingChats } from './chatCollision';
import { getChatViewerHeight } from './freeFlowChatLayout';

const CHAT_MOVE_UP_PIXELS = 19;
const CHAT_REMOVE_TOP_MARGIN = -10;

export const ChatWidgetView: FC<{}> = (props) => {
    const { chatMessages = [], setChatMessages = null, chatSettings = null, getScrollSpeed = 6000 } = useChatWidget();
    const [chatWindowEnabled] = useChatWindow();
    const elementRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef(chatMessages);
    const frameRef = useRef(0);
    const measureAllRef = useRef(false);
    const layoutRef = useRef<(measureAll: boolean) => void>(() => undefined);
    const shiftRef = useRef<(amount: number) => void>(() => undefined);

    chatMessagesRef.current = chatMessages;

    const removeHiddenChats = useCallback(() => {
        setChatMessages((prevValue) => {
            if (!prevValue) return prevValue;

            const newMessages = prevValue.filter((chat) => chat.top + chat.height + chat.visualOffsetBottom >= CHAT_REMOVE_TOP_MARGIN);

            return newMessages.length === prevValue.length ? prevValue : newMessages;
        });
    }, [setChatMessages]);

    const removeHiddenRef = useRef(removeHiddenChats);

    removeHiddenRef.current = removeHiddenChats;

    const measureChats = (chats: ChatBubbleMessage[]) => {
        for (const chat of chats) {
            if (!chat.elementRef) continue;

            const visualOffsets = measureBubbleVisualOffsets(chat.elementRef);

            chat.width = chat.elementRef.offsetWidth;
            chat.height = chat.elementRef.offsetHeight;
            chat.visualOffsetTop = visualOffsets.top;
            chat.visualOffsetBottom = visualOffsets.bottom;
        }
    };

    const flushLayout = () => {
        frameRef.current = 0;

        if (measureAllRef.current) {
            measureAllRef.current = false;
            measureChats(chatMessagesRef.current);
        }

        const visible: ChatBubbleMessage[] = [];

        for (const chat of chatMessagesRef.current) {
            if (chat.elementRef && chat.width > 0 && chat.height > 0) visible.push(chat);
        }

        separateOverlappingChats(visible);
        removeHiddenRef.current();
    };

    const requestLayout = (measureAll: boolean) => {
        if (measureAll) measureAllRef.current = true;

        if (frameRef.current) return;

        frameRef.current = window.requestAnimationFrame(flushLayout);
    };

    layoutRef.current = requestLayout;

    const shiftChats = (amount: number) => {
        for (const chat of chatMessagesRef.current) chat.top -= amount;

        removeHiddenRef.current();
        requestLayout(false);
    };

    shiftRef.current = shiftChats;

    const makeRoom = useCallback((_chat: ChatBubbleMessage) => {
        layoutRef.current(false);
    }, []);

    useEffect(() => {
        const resize = () => {
            const element = elementRef.current;

            if (!element) return;

            const currentHeight = element.offsetHeight;
            const configuredHeightPercentage = GetConfigurationValue<number>('chat.viewer.height.percentage', 0.25);
            const newHeight = getChatViewerHeight(document.body.offsetHeight, configuredHeightPercentage);

            element.style.height = `${newHeight}px`;

            const delta = currentHeight - newHeight;

            if (delta) {
                for (const chat of chatMessagesRef.current) chat.top -= delta;
            }

            layoutRef.current(true);
        };

        window.addEventListener('resize', resize);
        resize();

        return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => {
        const worker = new WorkerBuilder(IntervalWebWorker);

        worker.onmessage = () => shiftRef.current(CHAT_MOVE_UP_PIXELS);
        worker.postMessage({ action: 'START', content: getScrollSpeed });

        return () => {
            worker.postMessage({ action: 'STOP' });
            worker.terminate();
        };
    }, [getScrollSpeed]);

    useEffect(() => {
        const onTextSizeChange = () => {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => layoutRef.current(true));
            });
        };

        window.addEventListener(CHAT_TEXT_SIZE_EVENT, onTextSizeChange);

        return () => window.removeEventListener(CHAT_TEXT_SIZE_EVENT, onTextSizeChange);
    }, []);

    useEffect(
        () => () => {
            if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
        },
        []
    );

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
                        makeRoom={makeRoom}
                        showPointer={false}
                    />
                ))}
            {chatWindowEnabled && <ChatWidgetWindowView />}
        </div>
    );
};
