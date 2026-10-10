import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Owned: [match criteria]; furni: [the chest or contract furni to cancel], which the form disables when every transaction
 * is cancelled; users: [the default user]; no variable.
 */
export const WiredActionCancelTransactionView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources = null, setUserSources = null } = useWired();
    const [matchMode, setMatchMode] = useState(0);
    const [furniSource, setFurniSource] = useState(100);
    const userDefault = trigger?.inputSources?.userDefaults[0] ?? 0;

    useEffect(() => {
        if (!trigger) return;

        setMatchMode(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    const save = () => {
        setIntParams([matchMode]);
        setFurniSources([matchMode === 1 ? 100 : furniSource]);
        setUserSources([trigger?.userSources[0] ?? userDefault]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    furniSlot={0}
                    furniSource={furniSource}
                    furniDisabled={matchMode === 1}
                    onChangeFurni={setFurniSource}
                />
            }
        >
            <Text bold>{localizeWithFallback('wiredfurni.params.cancel_transaction.match_criteria', 'Match criteria')}</Text>
            <WiredRadioGroup
                name="cancelTransactionMode"
                value={matchMode}
                onChange={setMatchMode}
                options={[
                    { id: 0, label: localizeWithFallback('wiredfurni.params.cancel_transaction.match_criteria.0', 'Cancel the transaction of the selected furni') },
                    { id: 1, label: localizeWithFallback('wiredfurni.params.cancel_transaction.match_criteria.1', 'Cancel every transaction') }
                ]}
            />
        </WiredActionBaseView>
    );
};
