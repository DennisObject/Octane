import { FC, useEffect, useState } from 'react';
import { WiredFurniType, WIRED_SLIDER_PULSES } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSlider';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionTimeElapsedLessView: FC<{}> = (props) => {
    const [time, setTime] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 1);
    }, [trigger]);

    return (
        <WiredConditionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection converter={WIRED_SLIDER_PULSES} max={1200} min={1} titleKey="wiredfurni.params.allowbefore2" value={time} onChange={setTime} />
        </WiredConditionBaseView>
    );
};
