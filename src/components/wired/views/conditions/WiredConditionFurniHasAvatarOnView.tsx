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
    const [error, setError] = useState(false);
    const [requireAll, setRequireAll] = useState(0);
    const [furniSource, setFurniSource] = useState(100);

    useEffect(() => {
        if (!trigger) return;

        if (trigger.intData.length >= 1) setRequireAll(trigger.intData[0] === 1 ? 1 : 0);
        else setRequireAll(0);

        setError(false);

        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([requireAll]);
        setFurniSources([furniSource]);
    };

    const validate = () => {
        const valid = (trigger as ConditionDefinition).quantifier === 0;
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
