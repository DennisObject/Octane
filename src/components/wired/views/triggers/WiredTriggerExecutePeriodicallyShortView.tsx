import { FC, useEffect, useState } from 'react';
import { WiredFurniType, WIRED_SLIDER_MILLISECONDS_50 } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSlider';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggeExecutePeriodicallyShortView: FC<{}> = () => {
    const [time, setTime] = useState(10);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 10);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection converter={WIRED_SLIDER_MILLISECONDS_50} max={10} min={1} titleKey="wiredfurni.params.setshorttime" unit="ms" value={time} withInput={false} onChange={setTime} />
        </WiredTriggerBaseView>
    );
};
