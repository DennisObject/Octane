import { ConditionDefinition } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionFurniHasAvatarOnViewProps {
    negative?: boolean;
}

export const WiredConditionFurniHasAvatarOnView: FC<WiredConditionFurniHasAvatarOnViewProps> = ({ negative = false }) => {
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const nativeCard = !negative && trigger?.code === 1 && !!trigger.inputSources;
    const [error, setError] = useState(false);
    const [requireAll, setRequireAll] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        if (trigger?.intData?.length >= 1 && trigger.intData[0] > 1) return trigger.intData[0];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    useEffect(() => {
        if (!trigger) return;

        if (trigger.intData.length >= 1) setRequireAll(trigger.intData[0] === 1 ? 1 : 0);
        else setRequireAll(0);

        setError(false);

        if (nativeCard) setFurniSource(trigger.furniSources[0] ?? 100);
        else if (trigger.intData.length > 1) setFurniSource(trigger.intData[1]);
        else if (trigger.intData.length >= 1 && trigger.intData[0] > 1) setFurniSource(trigger.intData[0]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);
    }, [trigger, nativeCard]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams(nativeCard ? [requireAll] : [requireAll, furniSource]);
        if (nativeCard) setFurniSources([furniSource]);
    };

    const validate = () => {
        const valid = !nativeCard || (trigger as ConditionDefinition).quantifier === 0;
        setError(!valid);
        return valid;
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            {error && <Text className="text-danger">This card supports quantifier 0 only.</Text>}
            <WiredSection title={LocalizeText('wiredfurni.params.requireall')}>
                <WiredRadioGroup
                    name="furniHasAvatarRequireAll"
                    options={[0, 1].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.${negative ? 'not_requireall' : 'requireall'}.${id + 2}`) }))}
                    value={requireAll}
                    onChange={setRequireAll}
                />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
