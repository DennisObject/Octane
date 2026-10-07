import { FC, KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, LocalizeText } from '../../../../api';

const CHAT_INPUT_WIDTH = 471;
const CHAT_INPUT_HEIGHT = 38;

const useDesktopSize = () =>
{
    const [ size, setSize ] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() =>
    {
        const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return size;
};

interface SnowWarChatInputViewProps
{
    onSend: (message: string) => void;
}

/**
 * The room chat input of a game session (AIR RoomDesktop keeps RWE_CHAT_INPUT_WIDGET for game sessions).
 * RoomSession.sendChatMessage sends Game2GameChat there, no chat style menu is built, and with the toolbar
 * hidden RoomChatInputView.updatePosition centres the bubble at desktop height - 104.
 */
export const SnowWarChatInputView: FC<SnowWarChatInputViewProps> = ({ onSend }) =>
{
    const desktop = useDesktopSize();
    const [ value, setValue ] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const maxLength = GetConfigurationValue<number>('chat.input.maxlength', 100);

    // Like the room chat input, typing anywhere in the arena goes to the chat.
    useEffect(() =>
    {
        const onKeyDown = (event: KeyboardEvent) =>
        {
            const input = inputRef.current;
            const active = document.activeElement;

            if(!input || active === input || event.ctrlKey || event.metaKey || event.altKey) return;
            if(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
            if(event.key.length !== 1 && event.key !== 'Enter') return;

            input.focus();
        };

        document.body.addEventListener('keydown', onKeyDown);

        return () => document.body.removeEventListener('keydown', onKeyDown);
    }, []);

    const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) =>
    {
        if(event.key !== 'Enter' && event.key !== 'NumpadEnter') return;

        const message = value.trim();

        if(!message.length) return;

        onSend(message.slice(0, maxLength));
        setValue('');
    };

    return (
        <div
            className="snowwar-hud-window snowwar-chat-input"
            data-air-name="bubblecont"
            style={{ left: Math.trunc((desktop.width / 2) - (CHAT_INPUT_WIDTH / 2)), top: desktop.height - 104, width: CHAT_INPUT_WIDTH, height: CHAT_INPUT_HEIGHT }}
        >
            <div className="octane-chat-input-container swf-chat-input relative flex w-full items-center justify-start overflow-visible">
                {/* "styles" keeps its default look; a game session never builds the ChatStyleSelector. */}
                <div aria-hidden="true" className="swf-chat-style-trigger flex items-center select-none">
                    <span className="swf-chat-style-arrow shrink-0" />
                    <div className="swf-chat-style-icon" />
                </div>
                <div className="flex-1 items-center input-sizer swf-chat-input-sizer" data-value={value}>
                    <input
                        ref={inputRef}
                        className="swf-chat-input-field w-full border-none bg-transparent"
                        maxLength={maxLength}
                        placeholder={LocalizeText('widgets.chatinput.default')}
                        type="text"
                        value={value}
                        onChange={event => setValue(event.target.value)}
                        onKeyDown={onKeyDown}
                    />
                </div>
                <button aria-label={LocalizeText('chat.input.help')} className="swf-chat-help-button" type="button" onClick={() => CreateLinkEvent('habbopages/chat/commands')} />
            </div>
        </div>
    );
};
