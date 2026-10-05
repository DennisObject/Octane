export type ChatTextSize = 's' | 'm' | 'l' | 'xl' | 'xxl';

export const CHAT_TEXT_SIZES: ChatTextSize[] = ['s', 'm', 'l', 'xl', 'xxl'];
export const CHAT_FONT_SCALES = [1, 1.15, 1.3, 1.5, 1.75] as const;
export const clampChatFontScale = (index: number): number => Math.max(0, Math.min(4, index));
export const getChatTextSize = (index: number): ChatTextSize => CHAT_TEXT_SIZES[clampChatFontScale(index)];
export const getChatFontScale = (size: ChatTextSize): number => CHAT_FONT_SCALES[CHAT_TEXT_SIZES.indexOf(size)];
export const getChatTextSizeLabel = (size: ChatTextSize): string => size.toUpperCase();
