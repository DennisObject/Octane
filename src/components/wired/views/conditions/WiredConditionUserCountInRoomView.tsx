import { FC, useEffect, useState } from 'react';
import { WiredFurniType, WIRED_SLIDER_ECHO } from '../../../../api';
import { WiredSliderSection } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionUserCountInRoomView: FC<{}> = (props) => {
    const [min, setMin] = useState(1);
    const [max, setMax] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        return 0;
    });

    const save = () => setIntParams([min, max, userSource]);

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setMin(trigger.intData[0]);
            setMax(trigger.intData[1]);
        } else {
            setMin(1);
            setMax(0);
        }
        if (trigger.intData.length > 2) setUserSource(trigger.intData[2]);
        else setUserSource(0);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={125} min={0} titleKey="wiredfurni.params.usercountmin" unit="value" value={min} withInput={false} onChange={setMin} />
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={125} min={0} titleKey="wiredfurni.params.usercountmax" unit="value" value={max} withInput={false} onChange={setMax} />
        </WiredConditionBaseView>
    );
};
