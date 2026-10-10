import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionToggleFurniStateView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null, setFurniSources } = useWired();
    const [toggleType, setToggleType] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    useEffect(() => {
        setToggleType(trigger?.intData[0] ?? 0);
        setFurniSource(trigger?.furniSources[0] ?? 100);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([toggleType]);
        setFurniSources([furniSource]);
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.toggletype_selection', LocalizeText('wiredfurni.params.operator.2'))}</Text>
                {[0, 1].map((option) => (
                    <label key={option} className="flex items-center gap-1">
                        <input
                            checked={toggleType === option}
                            className="form-check-input"
                            name="toggleType"
                            type="radio"
                            onChange={() => setToggleType(option)}
                        />
                        <Text>{LocalizeText(`wiredfurni.params.toggletype.${option}`)}</Text>
                    </label>
                ))}
            </div>
        </WiredActionBaseView>
    );
};
