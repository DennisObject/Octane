import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const TARGETS: WiredVariablePickerTarget[] = ['user', 'furni', 'context', 'global'];
const clampCount = (value: number) => Math.max(0, Math.min(10000, Number.isFinite(value) ? Math.floor(value) : 1));

export const WiredExtraQuantityFilterView: FC<{}> = () => {
    const { trigger, setIntParams, setStringParam } = useWired();
    const { userVariableDefinitions, furniVariableDefinitions, contextVariableDefinitions, roomVariableDefinitions } = useWiredTools();
    const [amount, setAmount] = useState(1);
    const [variableMode, setVariableMode] = useState(false);
    const [extended, setExtended] = useState(false);
    const [target, setTarget] = useState(0);
    const [token, setToken] = useState('');
    useEffect(() => {
        if (!trigger) return;
        setAmount(clampCount(trigger.intData[0] ?? 1));
        setExtended(trigger.intData.length === 3);
        setVariableMode(trigger.intData.length === 3 && trigger.intData[1] === 1);
        setTarget(trigger.intData.length === 3 ? trigger.intData[2] : 0);
        setToken(trigger.stringData ?? '');
    }, [trigger]);
    const targetType = TARGETS[target] ?? 'user';
    const definitions = target === 1 ? furniVariableDefinitions : target === 2 ? contextVariableDefinitions
        : target === 3 ? roomVariableDefinitions : userVariableDefinitions;
    const entries = useMemo(() => {
        const choices = buildWiredVariablePickerEntries(targetType, 'change-reference', definitions);
        if (!token || flattenWiredVariablePickerEntries(choices).some(entry => entry.token === token)) return choices;
        const saved = createFallbackVariableEntry(targetType, token);
        return saved ? [saved, ...choices] : choices;
    }, [targetType, definitions, token]);
    const save = () => {
        setIntParams(extended ? [amount, variableMode ? 1 : 0, target] : [amount]);
        setStringParam(variableMode ? token : '');
    };
    return <WiredExtraBaseView hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
        save={save} validate={() => !variableMode || !!token} cardStyle={{ width: 360 }}>
        <label className="flex flex-col gap-1"><Text bold>{LocalizeText('wiredfurni.params.setfilter')}</Text>
            <select className="form-select" value={variableMode ? 'variable' : 'literal'} onChange={event => {
                setVariableMode(event.target.value === 'variable');
                setExtended(true);
            }}>
                <option value="literal">{localizeWithFallback('wiredfurni.params.amount.constant', 'Fixed amount')}</option>
                <option value="variable">{localizeWithFallback('wiredfurni.params.amount.variable', 'Amount from a variable')}</option>
            </select>
        </label>
        <label className="flex flex-col gap-1"><Text small>{variableMode ? localizeWithFallback('wiredfurni.params.amount.fallback', 'Amount when the variable is unavailable') : LocalizeText('wiredfurni.params.setfilter')}</Text>
            <input className="form-control form-control-sm" max={10000} min={0} type="number" value={amount} onChange={event => setAmount(clampCount(Number(event.target.value)))} />
        </label>
        {!variableMode && amount === 0 && <Text small>{extended
            ? localizeWithFallback('wiredfurni.params.amount.empty', 'Zero selects no items in this mode.')
            : localizeWithFallback('wiredfurni.params.amount.unlimited', 'Unlimited: keep all selected items.')}</Text>}
        {variableMode && <>
            <label className="flex flex-col gap-1"><Text small>{localizeWithFallback('wiredfurni.params.variable.target', 'Variable holder')}</Text>
                <select className="form-select" value={target} onChange={event => { setTarget(+event.target.value); setToken(''); }}>
                    {TARGETS.map((kind, index) => <option key={kind} value={index}>{localizeWithFallback('wiredfurni.params.sources.' + kind, kind === 'global' ? 'Room' : kind.charAt(0).toUpperCase() + kind.slice(1))}</option>)}
                </select>
            </label>
            <WiredVariablePicker selectedToken={token} entries={entries} recentScope="quantity-filter" onSelect={entry => setToken(entry.token)} />
            <Text small>{localizeWithFallback('wiredfurni.params.amount.selected_holder', 'Reads the first selected holder with this variable. Zero or a negative value selects nothing.')}</Text>
        </>}
    </WiredExtraBaseView>;
};
