import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorFurniOnFurniView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();
    const [selectionType, setSelectionType] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources?.[0] ?? 100;
    });

    useEffect(() => {
        if (!trigger) return;

        setSelectionType(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = () => {
        setIntParams([selectionType]);
        setFurniSources([furniSource]);
    };

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            hideDelay={true}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.selection_type')}</Text>
                    {[0, 1, 2, 3].map((value) => {
                        return (
                            <label key={value} className="flex items-center gap-1">
                                <input
                                    checked={selectionType === value}
                                    className="form-check-input"
                                    name="furniOnFurniSelectionType"
                                    type="radio"
                                    onChange={() => setSelectionType(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.onfurni.${value}`)}</Text>
                            </label>
                        );
                    })}
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filter}
                        onChange={(event) => setFilter(event.target.checked)}
                    />
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
