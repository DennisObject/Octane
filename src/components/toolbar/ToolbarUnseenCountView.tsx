import { FC } from 'react';
import { NativeText } from '../../common/native-text/NativeText';

interface ToolbarUnseenCountViewProps {
    count: number;
    className?: string;
}

// unseen_item_counter_xml: a style-7 0xee2924 border that shrinks around the bold count;
// the toolbar adds it at the top right of the icon region.
export const ToolbarUnseenCountView: FC<ToolbarUnseenCountViewProps> = (props) => {
    const { count = 0, className = '' } = props;

    if (count === 0) return null;

    const text = (count < 0) ? ' ' : String(count);
    return (
        <span className={`tb-unseen-count ${className}`} aria-hidden="true">
            <NativeText
                background={0xae1e19}
                className="tb-unseen-count__text"
                overrides={{ bold: true }}
                text={text}
                textStyle="il_regular_white"
            />
        </span>
    );
};
