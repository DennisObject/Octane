import * as Popover from '@radix-ui/react-popover';
import { CSSProperties, FC, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { useSessionInfo } from '../../../../hooks/session/useSessionInfo';
import { CHAT_TEXT_SIZES, ChatTextSize, getChatTextSize, getChatTextSizeLabel } from './chatTextSize';

interface ChatInputStyleSelectorViewProps {
    chatStyleId: number;
    chatStyleIds: ReadonlyArray<number>;
    selectChatStyleId: (styleId: number) => void;
}

export const ChatInputStyleSelectorView: FC<ChatInputStyleSelectorViewProps> = (props) => {
    const { chatStyleId = 0, chatStyleIds = null, selectChatStyleId = null } = props;
    const [selectorVisible, setSelectorVisible] = useState(false);
    const { chatFontScale, updateChatFontScale } = useSessionInfo();
    const chatTextSize = getChatTextSize(chatFontScale);

    // The v75 selector adds the styles last-to-first, laid out in floor(count / 6) + 1 columns, clamped to 4..6.
    const orderedStyleIds = chatStyleIds ? [...chatStyleIds].reverse() : [];
    const columns = Math.max(4, Math.min(6, Math.floor(orderedStyleIds.length / 6) + 1));
    const menuStyle = { '--swf-chat-style-columns': columns } as CSSProperties;

    const selectStyle = (styleId: number) => selectChatStyleId(styleId);

    const selectTextSize = (size: ChatTextSize) => {
        updateChatFontScale(CHAT_TEXT_SIZES.indexOf(size));
    };

    return (
        <Popover.Root open={selectorVisible} onOpenChange={setSelectorVisible}>
            <Popover.Trigger asChild>
                <div className="swf-chat-style-trigger flex items-center cursor-pointer select-none" aria-label="Stili chat">
                    <span className="swf-chat-style-arrow shrink-0" />
                    <div className="swf-chat-style-icon" />
                </div>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content side="top" align="start" sideOffset={16} className="swf-chat-style-menu" style={menuStyle}>
                    <div className="swf-chat-style-menu-grid">
                        {orderedStyleIds.map((styleId) => (
                            <button
                                key={styleId}
                                type="button"
                                className={`swf-chat-style-option ${chatStyleId === styleId ? 'is-active' : ''}`}
                                onClick={() => selectStyle(styleId)}
                            >
                                <span className="swf-chat-style-preview bubble-container">
                                    <span className={`chat-bubble bubble-${styleId}`} />
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="swf-chat-font-row">
                        <span className="swf-chat-font-label">{localizeWithFallback('widgets.chatinput.text_size', 'Text size')}</span>
                        <div className="swf-chat-font-list">
                            {CHAT_TEXT_SIZES.map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    className={`swf-chat-font-option ${chatTextSize === size ? 'is-active' : ''}`}
                                    onClick={() => selectTextSize(size)}
                                >
                                    {getChatTextSizeLabel(size)}
                                </button>
                            ))}
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
