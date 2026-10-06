import { FC } from 'react';

interface ToolbarUnseenCountViewProps {
    count: number;
    className?: string;
}

// Ubuntu Bold 12px digits all advance 6.816px; the counter window snaps the text width plus its 9px inset
// to whole pixels and never gets narrower than 18px.
const DIGIT_ADVANCE = 6.816;
const COUNTER_TEXT_INSET = 9;
const COUNTER_MIN_WIDTH = 18;

// unseen_item_counter_xml: a style-7 0xee2924 border that shrinks around the bold count;
// the toolbar adds it at the top right of the icon region.
export const ToolbarUnseenCountView: FC<ToolbarUnseenCountViewProps> = (props) => {
    const { count = 0, className = '' } = props;

    if (count === 0) return null;

    const text = (count < 0) ? ' ' : String(count);
    const width = Math.max(COUNTER_MIN_WIDTH, Math.round((count < 0 ? 0 : text.length * DIGIT_ADVANCE) + COUNTER_TEXT_INSET));

    return (
        <span className={`tb-unseen-count ${className}`} style={{ width }} aria-hidden="true">
            {text}
        </span>
    );
};
