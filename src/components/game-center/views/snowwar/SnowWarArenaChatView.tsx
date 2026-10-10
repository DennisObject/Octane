import { RoomChatSettings, RoomObjectCategory } from '@volt/renderer';
import { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChatBubbleMessage, ChatBubbleUtilities, GetConfigurationValue, RoomChatFormatter, SnowWarChatMessage, SNOWWAR_ROOM_ID } from '../../../../api';
import { getChatViewerHeight } from '../../../room/widgets/chat/freeFlowChatLayout';
import { ChatWidgetMessageView } from '../../../room/widgets/chat/ChatWidgetMessageView';
import { NativeChatScroller } from '../../../room/widgets/chat/nativeChatScroller';

// AIR SnowWarEngine.addChatMessage + ChatEventHandler.gameEventHandler: free flow chat with style 121 (team 1)
// or 120, forced to stage centre -300 / +300, showing the player's own figure and name.
const TEAM_1_STYLE = 121;
const TEAM_2_STYLE = 120;
const TEAM_1_OFFSET_X = -300;
const TEAM_2_OFFSET_X = 300;
const TEAM_1_COLOR = '#0000ff';
const TEAM_2_COLOR = '#ff0000';
const SCROLL_SPEED = 6000;

const createBubble = (message: SnowWarChatMessage): ChatBubbleMessage =>
{
    const team1 = (message.teamId === 1);

    return new ChatBubbleMessage(
        message.userId,
        RoomObjectCategory.UNIT,
        SNOWWAR_ROOM_ID,
        message.message,
        RoomChatFormatter(message.message),
        message.name,
        { x: ((document.body.offsetWidth / 2) + (team1 ? TEAM_1_OFFSET_X : TEAM_2_OFFSET_X)), y: 0 },
        0,
        (team1 ? TEAM_1_STYLE : TEAM_2_STYLE),
        null,
        (team1 ? TEAM_1_COLOR : TEAM_2_COLOR));
};

interface SnowWarArenaChatBubble
{
    messageId: number;
    figure: string;
    bubble: ChatBubbleMessage;
}

interface SnowWarArenaChatState
{
    messages: readonly SnowWarChatMessage[];
    /** Every message that got a bubble; a scrolled-out bubble is not made again. */
    knownMessageIds: ReadonlySet<number>;
    bubbles: SnowWarArenaChatBubble[];
}

const addBubbles = (state: SnowWarArenaChatState, messages: readonly SnowWarChatMessage[]): SnowWarArenaChatState =>
{
    const messageIds = new Set(messages.map(message => message.id));
    const created = messages.filter(message => !state.knownMessageIds.has(message.id)).map(message => ({ messageId: message.id, figure: message.figure, bubble: createBubble(message) }));

    return {
        messages,
        knownMessageIds: new Set([ ...state.knownMessageIds, ...created.map(entry => entry.messageId) ]),
        bubbles: [ ...state.bubbles.filter(entry => messageIds.has(entry.messageId)), ...created ]
    };
};

export const SnowWarArenaChatView: FC<{ chatMessages: readonly SnowWarChatMessage[] }> = ({ chatMessages }) =>
{
    const elementRef = useRef<HTMLDivElement>(null);
    const requestedImagesRef = useRef<Set<ChatBubbleMessage>>(new Set());
    const bubblesRef = useRef<SnowWarArenaChatBubble[]>([]);
    const [ chat, setChat ] = useState<SnowWarArenaChatState>(() => addBubbles({ messages: [], knownMessageIds: new Set(), bubbles: [] }, chatMessages));
    const [ scroller ] = useState(() => new NativeChatScroller());

    if(chat.messages !== chatMessages) setChat(addBubbles(chat, chatMessages));

    useEffect(() =>
    {
        bubblesRef.current = chat.bubbles;

        for(const { bubble, figure } of chat.bubbles)
        {
            if(requestedImagesRef.current.has(bubble)) continue;

            requestedImagesRef.current.add(bubble);

            ChatBubbleUtilities.getUserImage(figure).then(imageUrl =>
            {
                bubble.imageUrl = imageUrl;
                setChat(state => ({ ...state, bubbles: [ ...state.bubbles ] }));
            }).catch(() => null);
        }
    }, [ chat.bubbles ]);

    const makeRoom = useCallback((chat: ChatBubbleMessage, creationMode: number) =>
    {
        scroller.configure(RoomChatSettings.CHAT_MODE_FREE_FLOW, SCROLL_SPEED);
        scroller.register(chat, creationMode);
    }, [ scroller ]);

    useLayoutEffect(() =>
    {
        const resize = () =>
        {
            const element = elementRef.current;

            if(!element) return;

            const height = getChatViewerHeight(document.body.offsetHeight, GetConfigurationValue<number>('chat.viewer.height.percentage', 0.25));

            element.style.height = `${ height }px`;
            scroller.resize(height, document.body.offsetWidth);
        };

        window.addEventListener('resize', resize);
        resize();

        return () => window.removeEventListener('resize', resize);
    }, [ scroller ]);

    useEffect(() =>
    {
        let frame = 0;
        let previous = Date.now();

        const update = () =>
        {
            const now = Date.now();
            const removed = scroller.advance((now - previous), bubblesRef.current.map(entry => entry.bubble));

            previous = now;

            if(removed.length) setChat(state => ({ ...state, bubbles: state.bubbles.filter(entry => !removed.includes(entry.bubble.id)) }));

            frame = window.requestAnimationFrame(update);
        };

        frame = window.requestAnimationFrame(update);

        return () =>
        {
            window.cancelAnimationFrame(frame);
            scroller.clear();
        };
    }, [ scroller ]);

    return (
        <div ref={ elementRef } className="absolute flex justify-center items-center w-full top-0 min-h-px z-(--chat-zindex) bg-transparent shadow-none pointer-events-none">
            { chat.bubbles.map(({ bubble }) => <ChatWidgetMessageView key={ bubble.id } chat={ bubble } makeRoom={ makeRoom } mode={ RoomChatSettings.CHAT_MODE_FREE_FLOW } />) }
        </div>
    );
};
