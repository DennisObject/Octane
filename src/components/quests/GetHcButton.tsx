import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { nativeTextStyles } from '../../common/native-text/NativeTextStyles';
import { useAirFieldWidth } from '../achievements/AchievementText';
import { QuestButton } from './QuestButton';

const { size: LABEL_SIZE, bold: LABEL_BOLD } = nativeTextStyles.button_shiny_bold;

const MIN_WIDTH = 62;

interface GetHcButtonProps {
    /** Class that places the button; `left` and `width` are set here. */
    className: string;
    /** Right edge of the layout rect (x + width) the button keeps while it hugs its label. */
    right: number;
    onClick: () => void;
}

/** get_hc_btn (button_thick, style 5, colour 0x01a101): 30 tall, as wide as its label plus 15 (at least 62), anchored to the right edge of its 107px layout rect. */
export const GetHcButton: FC<GetHcButtonProps> = ({ className, right, onClick }) => {
    const label = localizeWithFallback('generic.get_hc', 'Get HC');
    const fieldWidth = useAirFieldWidth(label, LABEL_SIZE, LABEL_BOLD, 'button_shiny_bold');
    // The official button never gets narrower than 62px (a 58px label fit would be clamped).
    const width = fieldWidth === undefined ? 107 : Math.max(MIN_WIDTH, fieldWidth + 15);

    return <QuestButton className={`air-quest-get-hc air-quest-get-hc-green ${className}`} height={30} label={label} labelColor={0xffffff} style={{ left: right - width, width }} textStyle="button_shiny_bold_white" tint width={width} onClick={onClick} />;
};
