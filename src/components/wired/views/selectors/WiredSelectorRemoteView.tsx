import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

/** Union (0) or intersection (1) of the remote selection with its stack. */
const UNION = 0;
const INTERSECTION = 1;
const STACK_COUNT_MAX = 2147483647;

export const WiredSelectorRemoteView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();
    const [unionIntersection, setUnionIntersection] = useState(UNION);
    const [stackCount, setStackCount] = useState(0);
    const [furniSource, setFurniSource] = useState(100);

    useEffect(() => {
        if (!trigger) return;

        // own: [unionIntersection, stackCount]; the remote furni source is the F tail.
        setUnionIntersection(trigger.intData.length > 0 && trigger.intData[0] === INTERSECTION ? INTERSECTION : UNION);
        setStackCount(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save.
    const save = useCallback(() => {
        setIntParams([unionIntersection, stackCount]);
        setFurniSources([furniSource]);
    }, [furniSource, setFurniSources, setIntParams, stackCount, unionIntersection]);

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            hideDelay={true}
            cardStyle={{ width: 400 }}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{localizeWithFallback('wiredfurni.params.remote.union_intersection', 'Selection')}</Text>
                <WiredRadioGroup
                    name="remoteUnionIntersection"
                    value={unionIntersection}
                    onChange={setUnionIntersection}
                    options={[
                        { id: UNION, label: localizeWithFallback('wiredfurni.params.remote.union', 'Union') },
                        { id: INTERSECTION, label: localizeWithFallback('wiredfurni.params.remote.intersection', 'Intersection') }
                    ]}
                />
                <div className="flex items-center gap-2">
                    <Text small>{localizeWithFallback('wiredfurni.params.remote.stack_count', 'Stack count')}</Text>
                    <WiredNumberInput value={stackCount} min={0} max={STACK_COUNT_MAX} width={80} onChange={setStackCount} />
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={filter} onChange={(event) => setFilter(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={inverse} onChange={(event) => setInverse(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
