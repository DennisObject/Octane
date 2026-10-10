import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredQuantifierSection } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionActorIsWearingEffectViewProps {
    negative?: boolean;
    /**
     * The freeze conditions share this dialog for its user source and quantifier, but they ask
     * WiredFreezeUtil whether someone is frozen — there is no effect to name. They pass false, and the
     * effect-id box stays out of the window.
     */
    showEffect?: boolean;
}

export const WiredConditionActorIsWearingEffectView: FC<WiredConditionActorIsWearingEffectViewProps> = ({ negative = false, showEffect = true }) => {
    const [effect, setEffect] = useState(-1);
    const [quantifier, setQuantifier] = useState(1);
    const { trigger = null, setIntParams = null, setUserSources, quantifier: nativeQuantifier, setQuantifier: setNativeQuantifier } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.userSources?.length > 0) return trigger.userSources[0];
        return 0;
    });

    const save = () => {
        setIntParams([effect]);
        setUserSources([userSource]);
        setNativeQuantifier(quantifier);
    };

    useEffect(() => {
        setEffect(trigger?.intData[0] ?? 0);
        if (trigger?.userSources?.length > 0) setUserSource(trigger.userSources[0]);
        else setUserSource(0);
        setQuantifier(nativeQuantifier);
    }, [trigger, nativeQuantifier]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <>
                    <WiredQuantifierSection kind="users" name="effectQuantifier" negative={negative} value={quantifier} onChange={setQuantifier} />
                    <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                </>
            }
        >
            {showEffect && (
                // class_4188: NumberInputParam(0, int min, int max, 200).
                <WiredSection title={localizeWithFallback('wiredfurni.params.effectid', LocalizeText('wiredfurni.tooltip.effectid'))}>
                    <WiredNumberInput max={2147483647} min={-2147483648} value={effect} width={200} onChange={setEffect} />
                </WiredSection>
            )}
        </WiredConditionBaseView>
    );
};
