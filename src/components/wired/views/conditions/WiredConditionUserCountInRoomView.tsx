import { ConditionDefinition } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { WiredFurniType, WIRED_SLIDER_ECHO } from '../../../../api';
import { WiredSliderSection } from '../WiredSlider';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionUserCountInRoomView: FC<{}> = (props) => {
    const [min, setMin] = useState(1);
    const [max, setMax] = useState(0);
    const [error, setError] = useState(false);
    const { trigger = null, setIntParams = null } = useWired();
    const save = () => setIntParams([min, max]);

    const validate = () => {
        const valid = (trigger as ConditionDefinition).quantifier === 0 && min <= max;
        setError(!valid);
        return valid;
    };

    useEffect(() => {
        setError(false);
        if (trigger.intData.length >= 2) {
            setMin(trigger.intData[0]);
            setMax(trigger.intData[1]);
        } else {
            setMin(1);
            setMax(50);
        }
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
        >
            {error && <Text className="text-danger">This card requires quantifier 0 and minimum no greater than maximum.</Text>}
            <WiredSliderSection
                converter={WIRED_SLIDER_ECHO}
                max={125}
                min={0}
                titleKey="wiredfurni.params.usercountmin"
                unit="value"
                value={min}
                withInput={false}
                onChange={setMin}
            />
            <WiredSliderSection
                converter={WIRED_SLIDER_ECHO}
                max={125}
                min={0}
                titleKey="wiredfurni.params.usercountmax"
                unit="value"
                value={max}
                withInput={false}
                onChange={setMax}
            />
        </WiredConditionBaseView>
    );
};
