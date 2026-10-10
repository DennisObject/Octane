import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

/**
 * Owned: [scanning mode]; furni: [the chest, the item types]; variables: [the context variable the scan writes].
 * Filter and inverse are the selector's own category flags.
 */
export const WiredSelectorScanChestFurniByType: FC<{}> = () => {
    const {
        trigger = null,
        setIntParams = null,
        setFurniSources = null,
        setVariableIds = null,
        filter = false,
        setFilter = null,
        inverse = false,
        setInverse = null
    } = useWired();
    const { contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [scanningMode, setScanningMode] = useState(0);
    const [chestSource, setChestSource] = useState(100);
    const [typesSource, setTypesSource] = useState(100);
    const [variableToken, setVariableToken] = useState('');
    const entries = useMemo(() => buildWiredVariablePickerEntries('context', 'give', contextVariableDefinitions), [contextVariableDefinitions]);

    useEffect(() => {
        if (!trigger) return;

        setScanningMode(trigger.intData.length > 0 && trigger.intData[0] === 1 ? 1 : 0);
        setChestSource(trigger.furniSources[0] ?? 100);
        setTypesSource(trigger.furniSources[1] ?? 100);
        setVariableToken(tokenOfVariableSlot(trigger.variableIds[0] ?? WIRED_VARIABLE_ABSENT));
    }, [trigger]);

    const save = useCallback(() => {
        setIntParams([scanningMode]);
        setFurniSources([chestSource, typesSource]);
        setVariableIds([variableSlotOf(variableToken)]);
    }, [chestSource, scanningMode, setFurniSources, setIntParams, setVariableIds, typesSource, variableToken]);

    const validate = () => !!variableToken;

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} validate={validate} hideDelay={true} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <WiredRadioGroup
                    name="scanChestMode"
                    value={scanningMode}
                    onChange={setScanningMode}
                    options={[0, 1].map((value) => ({ id: value, label: localizeWithFallback(`wiredfurni.params.chest_item_type_scanner.${value}`, `Mode ${value}`) }))}
                />
                <WiredVariablePicker entries={entries} recentScope="scan-chest-variable" selectedToken={variableToken} onSelect={(entry) => setVariableToken(entry.token)} />

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
            <WiredSourcesSelector showFurni={true} furniSlot={0} furniSource={chestSource} furniTitle="wiredfurni.params.sources.furni.title.chests" onChangeFurni={setChestSource} />
            <WiredSourcesSelector showFurni={true} furniSlot={1} furniSource={typesSource} furniTitle="wiredfurni.params.sources.furni.title.types" onChangeFurni={setTypesSource} />
        </WiredSelectorBaseView>
    );
};
