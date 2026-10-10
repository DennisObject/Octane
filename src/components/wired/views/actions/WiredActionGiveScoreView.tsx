import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType, WIRED_SLIDER_ECHO } from '../../../../api';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionGiveScoreView: FC<{}> = (props) => {
    const [points, setPoints] = useState(1);
    const [operation, setOperation] = useState(0);
    const { trigger = null, setIntParams = null, setUserSources = null } = useWired();
    const [userSource, setUserSource] = useState(0);
    const [quota, setQuota] = useState(0);
    const save = () => {
        setIntParams([operation === 1 ? -points : points, quota]);
        setUserSources([userSource]);
    };
    useEffect(() => {
        setPoints(Math.abs(trigger.intData[0]));
        setOperation(trigger.intData[0] < 0 ? 1 : 0);
        setQuota(trigger.intData[1]);
        setUserSource(trigger.userSources[0]);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={1000} min={1} titleKey="wiredfurni.params.setpoints2" value={points} onChange={setPoints} />
            <WiredSliderSection max={10} min={0} titleKey="wiredfurni.params.times_per_game" value={quota} onChange={setQuota} />
            {quota === 0 && <span>Unlimited per game</span>}
            <WiredSection title={localizeWithFallback('wiredfurni.params.points_operation', 'Type of effect:')}>
                <WiredRadioGroup
                    name="pointsOperation"
                    options={[0, 1].map((value) => ({ id: value, label: LocalizeText(`wiredfurni.params.points_operation.${value}`) }))}
                    value={operation}
                    onChange={setOperation}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
