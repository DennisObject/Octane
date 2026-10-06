import { FC, useEffect, useState } from 'react';
import { WiredFurniType, WIRED_SLIDER_SECONDS_5 } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSlider';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggeExecutePeriodicallyLongView: FC<{}> = () => {
    const [time, setTime] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection converter={WIRED_SLIDER_SECONDS_5} max={120} min={1} titleKey="wiredfurni.params.settime3" value={time} onChange={setTime} />
        </WiredTriggerBaseView>
    );
};
