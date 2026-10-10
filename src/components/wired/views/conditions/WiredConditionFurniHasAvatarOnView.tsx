import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionFurniHasAvatarOnViewProps {
    negative?: boolean;
}

export const WiredConditionFurniHasAvatarOnView: FC<WiredConditionFurniHasAvatarOnViewProps> = ({ negative = false }) => {
    const { trigger = null, setIntParams = null } = useWired();
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

        if (trigger.intData.length > 1) setFurniSource(trigger.intData[1]);
        else if (trigger.intData.length >= 1 && trigger.intData[0] > 1) setFurniSource(trigger.intData[0]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => setIntParams([requireAll, furniSource]);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
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
