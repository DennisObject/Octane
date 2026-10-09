import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../api';
import { Text } from '../../../common';
import { useWired, useWiredTools } from '../../../hooks';
import { WiredActionBaseView } from './actions/WiredActionBaseView';
import { WiredConditionBaseView } from './conditions/WiredConditionBaseView';
import { WiredExtraBaseView } from './extras/WiredExtraBaseView';
import { WiredComparisonOperator } from './WiredComparisonOperator';
import { WiredVariablePicker } from './WiredVariablePicker';
import { buildWiredVariablePickerEntries, WiredVariablePickerTarget } from './WiredVariablePickerData';

type Kind = 'currency' | 'furni' | 'init' | 'cancel' | 'amount' | 'type' | 'scan' | 'custom';
interface ChestFields {
    Text: string;
    Variables: string[];
    FurniSources: number[];
    UserSources: number[];
    Picks: number[][];
}
const defaults: Record<Kind, number[]> = {
    currency: [0, 1, 0, 0, 1, 11], furni: [0, 1, 0, 0, 0, 0], init: [0, 10, 0, 0, 0, 300], cancel: [0],
    amount: [0, 0, 1, 2], type: [0, 0, 1, 2], scan: [0], custom: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0]
};
const slots: Record<Kind, string[]> = {
    currency: ['Credit chests', 'Amount reference'], furni: ['Furni chests', 'Amount reference'],
    init: ['Chests', 'Contracts', 'Multiplier reference'], cancel: ['Contracts'],
    amount: ['Chests', 'Amount reference'], type: ['Furni types', 'Chests', 'Amount reference'],
    scan: ['Furni types', 'Chests'], custom: ['Payment type', 'Reward type', 'Payment reference', 'Reward reference']
};
const sourceOptions = [[100, 'Picked furniture'], [0, 'Triggering furniture'], [200, 'Selector furniture'], [201, 'Signal furniture']] as const;
const userOptions = [[0, 'Triggering user'], [11, 'Clicked user'], [200, 'Selector users'], [201, 'Signal users']] as const;
const targets: WiredVariablePickerTarget[] = ['user', 'furni', 'context', 'global'];

export const WiredChestEditorView: FC<{ kind: Kind }> = ({ kind }) => {
    const { trigger, furniIds, setFurniIds, setIntParams, setStringParam } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], contextVariableDefinitions = [], roomVariableDefinitions = [] } = useWiredTools();
    const definitions = [userVariableDefinitions, furniVariableDefinitions, contextVariableDefinitions, roomVariableDefinitions];
    const [params, setParams] = useState(defaults[kind]);
    const [fields, setFields] = useState<ChestFields>({ Text: '', Variables: [], FurniSources: [], UserSources: [], Picks: [] });
    const [activeSlot, setActiveSlot] = useState(0);

    useEffect(() => {
        if (!trigger) return;
        const raw = trigger.stringData ?? '';
        let data: ChestFields = { Text: '', Variables: [], FurniSources: [], UserSources: [], Picks: [] };
        if (raw.startsWith('@chest:')) {
            try { data = { ...data, ...JSON.parse(raw.slice(7)) }; } catch { /* Old text remains visible. */ }
        } else data.Text = raw;
        setParams(trigger.intData?.length === defaults[kind].length ? [...trigger.intData] : [...defaults[kind]]);
        setFields(data);
        setActiveSlot(0);
        if (data.Picks.length) setFurniIds(data.Picks[0] ?? []);
    }, [trigger, kind, setFurniIds]);

    const put = (index: number, value: number) => setParams(previous => previous.map((current, i) => i === index ? value : current));
    const select = (label: string, index: number, choices: readonly (readonly [number, string])[]) => <label className="flex flex-col gap-1"><Text bold>{label}</Text><select className="form-select form-select-sm" value={params[index]} onChange={event => put(index, Number(event.target.value))}>{choices.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>;
    const checkbox = (label: string, index: number) => <label className="flex items-center gap-2"><input type="checkbox" checked={params[index] === 1} onChange={event => put(index, event.target.checked ? 1 : 0)} /><Text>{label}</Text></label>;
    const number = (label: string, index: number, min = 1, max = 100000) => <label className="flex flex-col gap-1"><Text bold>{label}</Text><input className="form-control form-control-sm" type="number" min={min} max={max} value={params[index]} onChange={event => put(index, Math.max(min, Math.min(max, Number(event.target.value) || min)))} /></label>;
    const operand = (label: string, value: number, variable: number, target: number, slot: number) => <div className="flex flex-col gap-2">
        {checkbox(`Use a variable for ${label.toLowerCase()}`, variable)}
        {params[variable] === 0 ? number(label, value, kind === 'amount' || kind === 'type' ? 0 : 1, kind === 'init' ? 500 : 1000000) : <>
            {select('Variable target', target, [[0, 'User'], [1, 'Furniture'], [2, 'Context'], [3, 'Room']])}
            <WiredVariablePicker entries={buildWiredVariablePickerEntries(targets[params[target]], 'change-reference', definitions[params[target]])} selectedToken={fields.Variables[slot] ?? ''} recentScope={`chest-${kind}-${slot}`} onSelect={entry => setFields(previous => { const Variables = [previous.Variables[0] ?? '', previous.Variables[1] ?? '']; Variables[slot] = entry.token; return { ...previous, Variables }; })} />
        </>}
    </div>;
    const switchSlot = (next: number) => {
        if (next === activeSlot) return;
        const Picks = slots[kind].map((_, slot) => slot === activeSlot ? [...furniIds] : fields.Picks[slot] ?? []);
        setFields(previous => ({ ...previous, Picks }));
        setActiveSlot(next);
        setFurniIds(Picks[next]);
    };
    const save = () => {
        const Picks = slots[kind].map((_, slot) => slot === activeSlot ? [...furniIds] : fields.Picks[slot] ?? []);
        setIntParams(params);
        setStringParam('@chest:' + JSON.stringify({ ...fields, Picks }));
        setFurniIds([...new Set(Picks.flat())]);
    };
    const validate = () => fields.Variables.every(value => typeof value === 'string');
    const body = <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">{slots[kind].map((label, index) => <button key={label} type="button" className={`btn btn-sm ${index === activeSlot ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => switchSlot(index)}>{label} ({index === activeSlot ? furniIds.length : fields.Picks[index]?.length ?? 0})</button>)}</div>
        <label className="flex flex-col gap-1"><Text bold>{slots[kind][activeSlot]} source</Text><select className="form-select form-select-sm" value={fields.FurniSources[activeSlot] ?? 100} onChange={event => { const value = Number(event.target.value); setFields(previous => { const FurniSources = slots[kind].map((_, i) => i === activeSlot ? value : previous.FurniSources[i] ?? 100); return { ...previous, FurniSources }; }); }}>{sourceOptions.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
        <Text small>Choose a slot, then click furniture in the room to pick it for that slot.</Text>
        {(kind === 'currency' || kind === 'furni') && <>
            {select('Give', 0, [[0, 'Specified amount'], [1, 'Everything']])}
            {params[0] === 0 && operand('Amount', 1, 2, 3, 0)}
            {checkbox('Open reward dialog', 4)}
            {kind === 'furni' ? select('Furniture order', 5, [[0, 'Random'], [1, 'Oldest first'], [2, 'Newest first']]) : select('Earnings category', 5, [[11, 'Games'], [13, 'Agency']])}
            <label><Text bold>Reward text</Text><textarea className="form-control form-control-sm" maxLength={200} value={fields.Text} onChange={event => setFields(previous => ({ ...previous, Text: event.target.value }))} /></label>
        </>}
        {kind === 'init' && <>
            {select('Transaction amount', 0, [[0, 'Once'], [1, 'Fixed multiplier'], [2, 'Automatic multiplier']])}
            {params[0] !== 0 && operand('Multiplier', 1, 2, 3, 0)}
            {checkbox('Enable timeout', 4)}
            {params[4] === 1 && number('Timeout seconds', 5, 30, 3600)}
            <Text small>A picked contract or custom contract add-on supplies the terms. A reward pays from the selected chests; payment and trade wait for confirmation.</Text>
        </>}
        {kind === 'cancel' && select('Cancel', 0, [[0, 'Picked contracts'], [1, 'Any transaction']])}
        {(kind === 'amount' || kind === 'type') && <>{operand('Amount', 0, 1, 2, 0)}<WiredComparisonOperator name={`chest-${kind}`} value={params[3]} onChange={value => put(3, value)} /></>}
        {kind === 'scan' && <>{select('Scan', 0, [[0, 'All chest items'], [1, 'Previewed items']])}<Text bold>Write count to context variable</Text><WiredVariablePicker entries={buildWiredVariablePickerEntries('context', 'change-destination', contextVariableDefinitions)} selectedToken={fields.Variables[0] ?? ''} recentScope="chest-scanner" onSelect={entry => setFields(previous => ({ ...previous, Variables: [entry.token] }))} /></>}
        {kind === 'custom' && [0, 1].map(side => <div key={side} className="flex flex-col gap-2"><Text bold>{side === 0 ? 'Payment' : 'Reward'}</Text>{checkbox('Enabled', side * 5)}{params[side * 5] === 1 && <>{select('Type', side * 5 + 1, [[0, 'Credits'], [1, 'Furniture']])}{operand('Amount', side * 5 + 3, side * 5 + 2, side * 5 + 4, side)}</>}</div>)}
        {kind !== 'scan' && [0, ...(['currency', 'furni', 'init', 'custom'].includes(kind) ? [1] : [])].map(slot => <label key={slot} className="flex flex-col gap-1"><Text bold>{kind === 'custom' ? slot === 0 ? 'Payment variable users' : 'Reward variable users' : slot === 0 ? 'Users' : 'Variable reference users'}</Text><select className="form-select form-select-sm" value={fields.UserSources[slot] ?? 0} onChange={event => { const value = Number(event.target.value); setFields(previous => { const UserSources = [previous.UserSources[0] ?? 0, previous.UserSources[1] ?? 0]; UserSources[slot] = value; return { ...previous, UserSources }; }); }}>{userOptions.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>)}
    </div>;
    const props = { hasSpecialInput: true, requiresFurni: WiredFurniType.STUFF_SELECTION_OPTION_BY_ID, save, validate, cardStyle: { width: 420 } };
    return kind === 'amount' || kind === 'type' ? <WiredConditionBaseView {...props}>{body}</WiredConditionBaseView> : kind === 'custom' || kind === 'scan' ? <WiredExtraBaseView {...props}>{body}</WiredExtraBaseView> : <WiredActionBaseView {...props}>{body}</WiredActionBaseView>;
};
