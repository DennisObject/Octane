import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionFurniHasFurniOnView: FC<{}> = (props) => {
    const [requireAll, setRequireAll] = useState(-1);
    const { trigger = null, setIntParams = null, setFurniSources } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources[0] ?? 100;
    });

    const save = () => {
        setIntParams([requireAll]);
        setFurniSources([furniSource]);
    };

    useEffect(() => {
        setRequireAll(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            {/* HasStackedFurnis titles its section with requireall too. */}
            <WiredSection title={LocalizeText('wiredfurni.params.requireall')}>
                <WiredRadioGroup
                    name="requireAll"
                    options={[0, 1].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.requireall.${id}`) }))}
                    value={requireAll}
                    onChange={setRequireAll}
                />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
