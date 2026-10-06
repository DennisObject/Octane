import * as Popover from '@radix-ui/react-popover';
import { CSSProperties, FC, SyntheticEvent, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { useSessionInfo } from '../../../../hooks/session/useSessionInfo';
import { CHAT_TEXT_SIZES, ChatTextSize, getChatTextSize, getChatTextSizeLabel } from './chatTextSize';

// style_<assetId>_selector_preview bitmaps, keyed by style id.
const STYLE_PREVIEWS = Object.fromEntries(Object.entries(import.meta.glob('../../../../assets/images/chat-style-previews/*.png', { eager: true, import: 'default' }) as Record<string, string>)
    .map(([ path, url ]) => [ Number(path.slice(path.lastIndexOf('/') + 1, -4)), url ])) as Record<number, string>;

// chatfontsize_template: label at (4,1); item lefts and widths inside the 56px band as laid out by the v75 itemlist.
const TEXT_SIZE_ITEMS: Record<ChatTextSize, { left: number; width: number }> = {
    s: { left: 95, width: 18 },
    m: { left: 118, width: 18 },
    l: { left: 140, width: 18 },
    xl: { left: 161, width: 20 },
    xxl: { left: 187, width: 26 }
};

// bubble_preview is fit to the bitmap and centred in the 55x34 cell (rounded to whole pixels).
const centerPreview = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;

    image.style.left = `${ Math.round((55 - image.naturalWidth) / 2) }px`;
    image.style.top = `${ Math.round((34 - image.naturalHeight) / 2) }px`;
    image.style.visibility = 'visible';
};

interface ChatInputStyleSelectorViewProps {
    chatStyleId: number;
    chatStyleIds: ReadonlyArray<number>;
    selectChatStyleId: (styleId: number) => void;
}

export const ChatInputStyleSelectorView: FC<ChatInputStyleSelectorViewProps> = (props) => {
    const { chatStyleIds = null, selectChatStyleId = null } = props;
    const [selectorVisible, setSelectorVisible] = useState(false);
    // A cell shows its background only after it was clicked in this selector.
    const [clickedStyleId, setClickedStyleId] = useState<number | null>(null);
    const { chatFontScale, updateChatFontScale } = useSessionInfo();
    const chatTextSize = getChatTextSize(chatFontScale);

    // The v75 selector adds the styles last-to-first, laid out in floor(count / 6) + 1 columns, clamped to 4..6.
    const orderedStyleIds = chatStyleIds ? [...chatStyleIds].reverse() : [];
    const columns = Math.max(4, Math.min(6, Math.floor(orderedStyleIds.length / 6) + 1));
    const menuStyle = { '--swf-chat-style-columns': columns } as CSSProperties;

    const selectStyle = (styleId: number) => {
        setClickedStyleId(styleId);
        selectChatStyleId(styleId);
    };

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
                                className={`swf-chat-style-option ${clickedStyleId === styleId ? 'is-active' : ''}`}
                                onClick={() => selectStyle(styleId)}
                            >
                                {STYLE_PREVIEWS[styleId] && <img className="swf-chat-style-preview" src={STYLE_PREVIEWS[styleId]} alt="" onLoad={centerPreview} />}
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
                                    style={TEXT_SIZE_ITEMS[size]}
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
