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
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        return 0;
    });

    const save = () => setIntParams([points, operation, userSource]);

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setPoints(trigger.intData[0]);
            setOperation(trigger.intData[1]);
        } else {
            setPoints(1);
            setOperation(0);
        }

        setUserSource(trigger.intData.length > 2 ? trigger.intData[2] : 0);
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
