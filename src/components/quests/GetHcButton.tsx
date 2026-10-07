import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { nativeTextStyles } from '../../common/native-text/NativeTextStyles';
import { useAirFieldWidth } from '../achievements/AchievementText';
import { QuestButton } from './QuestButton';

const { size: LABEL_SIZE, bold: LABEL_BOLD } = nativeTextStyles.button_shiny_bold;

interface GetHcButtonProps {
    /** Class that places the button; `left` and `width` are set here. */
    className: string;
    /** Right edge of the layout rect (x + width) the button keeps while it hugs its label. */
    right: number;
    onClick: () => void;
}

/** get_hc_btn (button_thick, style 5, colour 0x01a101): 30 tall, as wide as its label plus 15, anchored to the right edge of its 107px layout rect. */
export const GetHcButton: FC<GetHcButtonProps> = ({ className, right, onClick }) => {
    const label = localizeWithFallback('generic.get_hc', 'Get HC');
    const fieldWidth = useAirFieldWidth(label, LABEL_SIZE, LABEL_BOLD, 'button_shiny_bold');
    const width = fieldWidth === undefined ? 107 : fieldWidth + 15;

    return <QuestButton className={`air-quest-get-hc air-quest-get-hc-green ${className}`} height={30} label={label} style={{ left: right - width, width }} tint width={width} onClick={onClick} />;
};
