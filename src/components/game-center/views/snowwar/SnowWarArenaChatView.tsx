import { RoomChatSettings, RoomObjectCategory } from '@octane/renderer';
import { FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChatBubbleMessage, ChatBubbleUtilities, GetConfigurationValue, RoomChatFormatter, SnowWarChatMessage } from '../../../../api';
import { getChatViewerHeight } from '../../../room/widgets/chat/freeFlowChatLayout';
import { ChatWidgetMessageView } from '../../../room/widgets/chat/ChatWidgetMessageView';
import { captureNativeChatCreation, NativeChatScroller } from '../../../room/widgets/chat/nativeChatScroller';
import { SNOWWAR_ROOM_ID } from './SnowWarArenaRoom';

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
    const bubble = new ChatBubbleMessage(
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

    captureNativeChatCreation(bubble, RoomChatSettings.CHAT_MODE_FREE_FLOW);

    return bubble;
};

export const SnowWarArenaChatView: FC<{ chatMessages: readonly SnowWarChatMessage[] }> = ({ chatMessages }) =>
{
    const elementRef = useRef<HTMLDivElement>(null);
    const bubblesRef = useRef<Map<number, ChatBubbleMessage>>(new Map());
    const [ removedIds, setRemovedIds ] = useState<ReadonlySet<number>>(new Set());
    const [ , setImagesLoaded ] = useState(0);
    const [ scroller ] = useState(() => new NativeChatScroller());

    const bubbles = useMemo(() =>
    {
        const current = new Map<number, ChatBubbleMessage>();

        for(const message of chatMessages)
        {
            if(removedIds.has(message.id)) continue;

            let bubble = bubblesRef.current.get(message.id);

            if(!bubble)
            {
                const created = createBubble(message);

                ChatBubbleUtilities.getUserImage(message.figure).then(imageUrl =>
                {
                    created.imageUrl = imageUrl;
                    setImagesLoaded(count => (count + 1));
                }).catch(() => null);

                bubble = created;
            }

            current.set(message.id, bubble);
        }

        bubblesRef.current = current;

        return Array.from(current.values());
    }, [ chatMessages, removedIds ]);

    const bubblesListRef = useRef(bubbles);

    bubblesListRef.current = bubbles;

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
            const removed = scroller.advance((now - previous), bubblesListRef.current);

            previous = now;

            if(removed.length)
            {
                const ids = Array.from(bubblesRef.current.entries()).filter(([ , bubble ]) => removed.includes(bubble.id)).map(([ id ]) => id);

                if(ids.length) setRemovedIds(previousIds => new Set([ ...previousIds, ...ids ]));
            }

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
            { bubbles.map(bubble => <ChatWidgetMessageView key={ bubble.id } chat={ bubble } makeRoom={ makeRoom } mode={ RoomChatSettings.CHAT_MODE_FREE_FLOW } />) }
        </div>
    );
};
