import { FC } from 'react';

interface ToolbarUnseenCountViewProps {
    count: number;
}

// unseen_item_counter_xml: 29x18 style-7 border 0xee2924 with the bold count at (4,0); the toolbar adds it to its icon region at (width - 29, 0).
export const ToolbarUnseenCountView: FC<ToolbarUnseenCountViewProps> = (props) => {
    const { count = 0 } = props;

    if (count === 0) return null;

    return (
        <div className="tb-unseen-count" aria-hidden="true">
            <span className="tb-unseen-count__text">{count < 0 ? ' ' : count}</span>
        </div>
    );
};
