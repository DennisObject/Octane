import { GetRoomEngine, RoomChatSettings, RoomObjectCategory } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChatBubbleMessage } from '../../../../api';
import { useOnClickChat } from '../../../../hooks';
import { useSessionInfo } from '../../../../hooks/session/useSessionInfo';
import { ChatTextSize, getChatFontScale, getChatTextSize } from '../chat-input/chatTextSize';
import { measureBubbleVisualOffsets } from './chatBubbleMetrics';
import { getNativeChatCreation } from './nativeChatScroller';
import { getNativeChatBaseFontSize, getNativeDefaultSkin, isNativeAnonymousStyle } from './nativeChatSkin';

interface ChatWidgetMessageViewProps {
    chat: ChatBubbleMessage;
    makeRoom: (chat: ChatBubbleMessage, creationMode: number) => void;
    mode?: number;
    bubbleWidth?: number;
    showPointer?: boolean;
}

export const ChatWidgetMessageView: FC<ChatWidgetMessageViewProps> = ({
    chat = null,
    makeRoom = null,
    mode = RoomChatSettings.CHAT_MODE_FREE_FLOW,
    bubbleWidth = RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL,
    showPointer = true
}) => {
    const [creationMode] = useState(() => getNativeChatCreation(chat)?.mode ?? mode);
    const [isVisible, setIsVisible] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const { chatFontScale } = useSessionInfo();
    const [chatTextSize] = useState<ChatTextSize>(() => chat.textSize ?? getChatTextSize(chatFontScale));
    useLayoutEffect(() => {
        chat.textSize ??= chatTextSize;
    }, [chat, chatTextSize]);
    const [faceSize, setFaceSize] = useState({ width: 50, height: 50 });
    const [defaultSkin, setDefaultSkin] = useState<string>(null);
    const fontScale = getChatFontScale(chatTextSize);
    const anonymous = isNativeAnonymousStyle(chat.styleId);
    const elementRef = useRef<HTMLDivElement>(null);
    const makeRoomRef = useRef(makeRoom);
    const { onClickChat } = useOnClickChat();
    const formattedText = useMemo(() => `${chat.formattedText}`, [chat.formattedText]);
    const originalFormattedText = useMemo(
        () => `${chat.originalFormattedText || chat.formattedText}`,
        [chat.originalFormattedText, chat.formattedText]
    );
    const translatedFormattedText = useMemo(
        () => `${chat.translatedFormattedText || chat.formattedText}`,
        [chat.translatedFormattedText, chat.formattedText]
    );

    const getBubbleWidth = useMemo(() => {
        switch (bubbleWidth) {
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL:
                return 'max-w-[350px]';
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN:
                return 'max-w-[240px]';
            case RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE:
                return 'max-w-[2000px]';
            default:
                return 'max-w-[350px]';
        }
    }, [bubbleWidth]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const { offsetWidth: width, offsetHeight: height } = element;
        const visualOffsets = measureBubbleVisualOffsets(element);

        chat.width = width;
        chat.height = height;
        chat.visualOffsetTop = visualOffsets.top;
        chat.visualOffsetBottom = visualOffsets.bottom;
        chat.elementRef = element;

        setIsReady(true);

        makeRoomRef.current?.(chat, creationMode);
    }, [
        chat,
        chat.formattedText,
        chat.originalFormattedText,
        chat.showTranslation,
        chat.translatedFormattedText,
        chatTextSize,
        isVisible,
        showPointer,
        creationMode
    ]);

    useEffect(() => {
        if (chat.styleId !== 0) return;
        let disposed = false;
        getNativeDefaultSkin(chat.color).then((skin) => {
            if (!disposed) setDefaultSkin(skin);
        });
        return () => { disposed = true; };
    }, [chat.styleId, chat.color]);

    useEffect(() => {
        makeRoomRef.current = makeRoom;
    }, [makeRoom]);

    useEffect(() => {
        const element = elementRef.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            const { offsetWidth: width, offsetHeight: height } = element;

            if (width === chat.width && height === chat.height) return;

            const visualOffsets = measureBubbleVisualOffsets(element);

            chat.width = width;
            chat.height = height;
            chat.visualOffsetTop = visualOffsets.top;
            chat.visualOffsetBottom = visualOffsets.bottom;

            if (makeRoomRef.current) makeRoomRef.current(chat, creationMode);
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, [chat, creationMode]);

    useEffect(() => {
        return () => {
            chat.elementRef = null;
        };
    }, [chat]);

    useEffect(() => {
        if (!isReady || !chat || isVisible) return;

        makeRoomRef.current?.(chat, creationMode);
        setIsVisible(true);
    }, [chat, isReady, isVisible, creationMode]);

    const messageClassName = `message [overflow-wrap:anywhere] break-words${chat.type === 2 ? ' font-bold' : ''}`;

    return (
        <div
            ref={elementRef}
            className={`bubble-container newbubblehe native-room-bubble chat-text-size ${isVisible ? 'visible' : 'invisible'} w-max absolute select-none pointer-events-auto`}
            style={{ '--chat-text-size': `${getNativeChatBaseFontSize(chat.styleId) * fontScale}px`, transition: 'none' } as CSSProperties}
            onClick={() => {
                if (!anonymous) GetRoomEngine().selectRoomObject(chat.roomId, chat.senderId, RoomObjectCategory.UNIT);
            }}
        >
            <div
                className={`chat-bubble bubble-${chat.styleId} type-${chat.type} ${getBubbleWidth}${chat.type === 1 && !anonymous ? ' native-whisper' : ''} relative z-1 wrap-break-word`}
                style={chat.styleId === 0 && defaultSkin ? { borderImageSource: `url(${defaultSkin})` } : undefined}
            >
                <div className="user-container absolute overflow-hidden" style={{
                    left: 13 - faceSize.width / 2,
                    width: faceSize.width,
                    height: `min(${faceSize.height}px, 100%)`,
                    top: `max(1px, calc(12px - min(${faceSize.height}px, 100%) / 2))`
                }}>
                    {!anonymous && chat.imageUrl && chat.imageUrl.length > 0 && (
                        <img
                            alt=""
                            src={chat.imageUrl}
                            className="user-image absolute bottom-0 left-0 max-w-none"
                            onLoad={(event) => setFaceSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                        />
                    )}
                </div>
                <div className="chat-content">
                    {!anonymous && <b className="username">{chat.username}: </b>}
                    {!chat.showTranslation && (
                        <span className={messageClassName} dangerouslySetInnerHTML={{ __html: formattedText }} onClick={onClickChat} />
                    )}
                    {chat.showTranslation && (
                        <div className="mt-[2px] flex flex-col gap-[2px]" onClick={onClickChat}>
                            <div className="flex items-start gap-1 leading-[1.1]">
                                <span className="inline-block min-w-[52px] font-bold" style={{ opacity: 0.75 }}>
                                    original:
                                </span>
                                <span className={messageClassName} dangerouslySetInnerHTML={{ __html: originalFormattedText }} />
                            </div>
                            <div className="flex items-start gap-1 leading-[1.1]">
                                <span className="inline-block min-w-[52px] font-bold" style={{ opacity: 0.75 }}>
                                    translate:
                                </span>
                                <span className={messageClassName} dangerouslySetInnerHTML={{ __html: translatedFormattedText }} />
                            </div>
                        </div>
                    )}
                </div>
                {showPointer && !anonymous && (
                    <div
                        className="pointer absolute w-[9px] h-[6px] bottom-[-5px]"
                        style={{ left: chat.styleId === 0 ? 'var(--chat-pointer-x, 28px)' : '50%' }}
                    />
                )}
            </div>
        </div>
    );
};
