import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionActorIsOnFurniViewProps {
    negative?: boolean;
}

export const WiredConditionActorIsOnFurniView: FC<WiredConditionActorIsOnFurniViewProps> = ({ negative = false }) => {
    const {
        trigger = null,
        setIntParams = null,
        setFurniSources,
        setUserSources,
        quantifier: nativeQuantifier,
        setQuantifier: setNativeQuantifier
    } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources[0] ?? 100;
    });
    const [userSource, setUserSource] = useState<number>(() => {
        return trigger?.userSources[0] ?? 0;
    });
    const [quantifier, setQuantifier] = useState<number>(() => {
        return nativeQuantifier;
    });

    useEffect(() => {
        if (!trigger) return;
        setFurniSource(trigger.furniSources[0] ?? 100);
        setUserSource(trigger.userSources[0] ?? 0);
        setQuantifier(nativeQuantifier);
    }, [trigger, nativeQuantifier]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([]);
        setFurniSources([furniSource]);
        setUserSources([userSource]);
        setNativeQuantifier(quantifier);
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                        {[0, 1].map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <input
                                    checked={quantifier === value}
                                    className="form-check-input"
                                    name="triggerOnFurniQuantifier"
                                    type="radio"
                                    onChange={() => setQuantifier(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.quantifier.users${negative ? '.neg' : ''}.${value}`)}</Text>
                            </label>
                        ))}
                    </div>
                    <WiredSourcesSelector
                        showFurni={true}
                        showUsers={true}
                        furniSource={furniSource}
                        userSource={userSource}
                        onChangeFurni={onChangeFurniSource}
                        onChangeUsers={setUserSource}
                    />
                </div>
            }
        />
    );
};
