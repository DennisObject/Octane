import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersOnFurniView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null, filter = false, setFilter = null, inverse = false, setInverse = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources?.[0] ?? 100;
    });

    useEffect(() => {
        if (!trigger) return;

        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = () => {
        setIntParams([]);
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
