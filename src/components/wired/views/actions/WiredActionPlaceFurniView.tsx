import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { useWiredFurniTargets } from '../../../../hooks/wired/useWiredFurniTargets';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries, getCustomVariableItemId } from '../WiredVariablePickerData';
import { WiredActionBaseView } from './WiredActionBaseView';

// Server saveData expects [baseItemId, quantity, placementMode, storedX, storedY, rotation].
const MODE_THIS_TILE = 0;
const MODE_STORED_XY = 1;

export const WiredActionPlaceFurniView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam } = useWired();
    const { userVariableDefinitions, furniVariableDefinitions, contextVariableDefinitions, roomVariableDefinitions } = useWiredTools();
    const [snapshotMode, setSnapshotMode] = useState(false);
    const [policy, setPolicy] = useState([1, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0]);
    const [destinationToken, setDestinationToken] = useState('');
    const [valueToken, setValueToken] = useState('');
    const needsTarget = policy[2] === 1 || policy[3] === 2;
    const picks = useWiredFurniTargets(snapshotMode, snapshotMode && needsTarget && policy[1] === 0 && policy[7] === 100);
    const setField = (index: number, value: number) => setPolicy(fields => fields.map((field, slot) => slot === index ? value : field));
    const [baseItemId, setBaseItemId] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(1);
    const [placementMode, setPlacementMode] = useState<number>(MODE_THIS_TILE);
    const [storedX, setStoredX] = useState<number>(0);
    const [storedY, setStoredY] = useState<number>(0);
    const [rotation, setRotation] = useState<number>(0);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        const snapshots = data.length === 15;
        setSnapshotMode(snapshots);
        if (snapshots) {
            setPolicy([...data]);
            const tokens = (trigger.stringData ?? '').split('\t');
            setDestinationToken(tokens[1] ?? '');
            setValueToken(tokens[2] ?? '');
            return;
        }
        setPolicy([1, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0]);
        setDestinationToken('');
        setValueToken('');
        setBaseItemId(data.length > 0 ? data[0] : 0);
        setQuantity(data.length > 1 ? Math.max(1, data[1]) : 1);
        setPlacementMode(data.length > 2 ? data[2] : MODE_THIS_TILE);
        setStoredX(data.length > 3 ? data[3] : 0);
        setStoredY(data.length > 4 ? data[4] : 0);
        setRotation(data.length > 5 ? data[5] : 0);
    }, [trigger]);

    const save = () => {
        if (snapshotMode) {
            const ids = picks.currentIds();
            picks.replace(ids.move, ids.target);
            setIntParams(policy);
            setStringParam(ids.target.join(';') + '\t' + destinationToken + '\t' + valueToken);
        } else {
            const legacy = [baseItemId, Math.max(1, quantity), placementMode, storedX, storedY, rotation];
            setIntParams(trigger?.intData.length === 15 ? [0, ...legacy] : legacy);
        }
    };
    const definitions = policy[12] === 1 ? furniVariableDefinitions : policy[12] === 2 ? contextVariableDefinitions
        : policy[12] === 3 ? roomVariableDefinitions : userVariableDefinitions;
    const targetType = policy[12] === 1 ? 'furni' : policy[12] === 2 ? 'context' : policy[12] === 3 ? 'global' : 'user';
    const destinationEntries = useMemo(() => buildWiredVariablePickerEntries('furni', 'give', furniVariableDefinitions).filter(entry => entry.kind === 'custom'), [furniVariableDefinitions]);
    const valueEntries = useMemo(() => buildWiredVariablePickerEntries(targetType, 'change-reference', definitions), [targetType, definitions]);
    const withSavedToken = (entries: ReturnType<typeof buildWiredVariablePickerEntries>, token: string, target: typeof targetType | 'furni') => {
        if (!token || flattenWiredVariablePickerEntries(entries).some(entry => entry.token === token)) return entries;
        const fallback = createFallbackVariableEntry(target, token);
        return fallback ? [fallback, ...entries] : entries;
    };
    const targetSources = FURNI_SOURCES.map(option => option.value === 100 ? { value: 100, label: 'wiredfurni.params.sources.furni.101' } : option);
    const limit = trigger?.maximumItemSelectionCount ?? 0;
    const integer = (value: string, min: number, max: number) => Math.max(min, Math.min(max, Number.parseInt(value, 10) || 0));
    const validate = () => snapshotMode ? (!policy[9] || getCustomVariableItemId(destinationToken) > 0) && (!policy[9] || !policy[10] || !!valueToken) : baseItemId > 0;

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={snapshotMode ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save} validate={validate} selectionPreview={snapshotMode ? <div className="flex flex-col gap-2">
                <WiredFurniSelectionSourceRow title="Templates to copy" titleIsLiteral options={[{ value: 100, label: 'wiredfurni.params.sources.furni.100' }]}
                    value={100} selectionKind="primary" selectionActive={picks.selection === 'move'} selectionCount={picks.moveIds.length}
                    selectionLimit={limit} selectionEnabledValues={[100]} onChange={() => {}} onSelectionActivate={() => picks.activate('move')} />
                {!policy[1] && needsTarget && <WiredFurniSelectionSourceRow title="Target furniture" titleIsLiteral options={targetSources} value={policy[7]}
                    selectionKind="secondary" selectionActive={picks.selection === 'target'} selectionCount={picks.targetIds.length}
                    selectionLimit={limit} selectionEnabledValues={[100]} onChange={value => setField(7, value)} onSelectionActivate={() => picks.activate('target')} />}
                {!!policy[1] && needsTarget && <WiredSourcesSelector showUsers userSource={policy[8]} allowClickedUserSource onChangeUsers={value => setField(8, value)} />}
            </div> : null}>
            <label className="flex flex-col gap-1"><Text bold>{localizeWithFallback('wiredfurni.params.place_furni.editor_mode', 'Furniture to place')}</Text>
                <select className="form-select" value={snapshotMode ? 'snapshot' : 'definition'} onChange={event => setSnapshotMode(event.target.value === 'snapshot')}>
                    <option value="definition">{localizeWithFallback('wiredfurni.params.place_furni.definition_mode', 'Copies of a furniture type')}</option>
                    <option value="snapshot">{localizeWithFallback('wiredfurni.params.place_furni.snapshot_mode', 'Saved furniture templates')}</option>
                </select>
            </label>
            {snapshotMode ? <>
                <label className="flex flex-col gap-1"><Text>Location</Text><select className="form-select" value={policy[2]} onChange={event => setField(2, +event.target.value)}>
                    <option value={0}>Saved template locations</option><option value={1}>Relative to a target</option></select></label>
                <label className="flex flex-col gap-1"><Text>Altitude</Text><select className="form-select" value={policy[3]} onChange={event => setField(3, +event.target.value)}>
                    <option value={0}>On top of destination</option><option value={1}>Saved template altitude</option><option value={2}>Target altitude</option></select></label>
                {needsTarget && <label className="flex flex-col gap-1"><Text>Target</Text><select className="form-select" value={policy[1]} onChange={event => setField(1, +event.target.value)}>
                    <option value={0}>Furniture</option><option value={1}>User</option></select></label>}
                <div className="grid grid-cols-2 gap-2">{[4, 5].map(index => <label key={index} className="flex flex-col gap-1"><Text>{index === 4 ? 'X offset (tiles)' : 'Y offset (tiles)'}</Text>
                    <input className="form-control" type="number" min={-64} max={64} step={1} value={policy[index]} onChange={event => setField(index, integer(event.target.value, -64, 64))} /></label>)}</div>
                <label className="flex flex-col gap-1"><Text>Altitude offset (tiles)</Text><input className="form-control" type="number" min={-80} max={80} step={0.01}
                    value={policy[6] / 100} onChange={event => setField(6, Math.max(-8000, Math.min(8000, Math.round((Number.parseFloat(event.target.value) || 0) * 100))))} /></label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={!!policy[9]} onChange={event => setField(9, event.target.checked ? 1 : 0)} /><Text>Give each copy a furniture variable</Text></label>
                {!!policy[9] && <>
                    <WiredVariablePicker entries={withSavedToken(destinationEntries, destinationToken, 'furni')} selectedToken={destinationToken}
                        recentScope="place-furni-variable" onSelect={entry => setDestinationToken(entry.token)} />
                    {getCustomVariableItemId(destinationToken) === 0 && <Text small>Choose a custom variable for copied furniture.</Text>}
                    <label className="flex items-center gap-1"><input type="checkbox" checked={!!policy[10]} onChange={event => setField(10, event.target.checked ? 1 : 0)} /><Text>Read the initial value from a variable</Text></label>
                    {policy[10] ? <>
                        <label className="flex flex-col gap-1"><Text>Value from</Text><select className="form-select" value={policy[12]} onChange={event => { setField(12, +event.target.value); setValueToken(''); }}>
                            <option value={0}>User</option><option value={1}>Furniture</option><option value={2}>Context</option><option value={3}>Room</option></select></label>
                        <WiredVariablePicker entries={withSavedToken(valueEntries, valueToken, targetType)} selectedToken={valueToken} recentScope="place-furni-value" onSelect={entry => setValueToken(entry.token)} />
                        {(policy[12] === 0 || policy[12] === 1) && <WiredSourcesSelector showUsers={policy[12] === 0} showFurni={policy[12] === 1}
                            userSource={policy[14]} furniSource={policy[13]} onChangeUsers={value => setField(14, value)} onChangeFurni={value => setField(13, value)} />}
                    </> : <label className="flex flex-col gap-1"><Text>Initial value</Text><input className="form-control" type="number" min={-2147483648} max={2147483647} step={1}
                        value={policy[11]} onChange={event => setField(11, integer(event.target.value, -2147483648, 2147483647))} /></label>}
                </>}
            </> : <>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.base_item_id', 'Base item ID')}</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={1}
                    value={baseItemId}
                    onChange={(event) => setBaseItemId(parseInt(event.target.value, 10) || 0)}
                />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.count', 'Quantity', ['count'], [quantity.toString()])}</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={1}
                    max={10}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Math.min(10, parseInt(event.target.value, 10) || 1)))}
                />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="placementMode"
                        checked={placementMode === MODE_THIS_TILE}
                        onChange={() => setPlacementMode(MODE_THIS_TILE)}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.place_furni.target_location.0', "Place on this furni's tile")}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="placementMode"
                        checked={placementMode === MODE_STORED_XY}
                        onChange={() => setPlacementMode(MODE_STORED_XY)}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.place_furni.target_location.1', 'Place at coordinates')}</Text>
                </div>
            </div>
            {placementMode === MODE_STORED_XY && (
                <div className="flex gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.place_furni.offsets.x', 'X')}</Text>
                        <input
                            className="form-control form-control-sm"
                            type="number"
                            min={0}
                            value={storedX}
                            onChange={(event) => setStoredX(Math.max(0, parseInt(event.target.value, 10) || 0))}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.place_furni.offsets.y', 'Y')}</Text>
                        <input
                            className="form-control form-control-sm"
                            type="number"
                            min={0}
                            value={storedY}
                            onChange={(event) => setStoredY(Math.max(0, parseInt(event.target.value, 10) || 0))}
                        />
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-1">
                <Text bold>Rotation (0-7)</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={0}
                    max={7}
                    value={rotation}
                    onChange={(event) => setRotation(((parseInt(event.target.value, 10) || 0) % 8 + 8) % 8)}
                />
            </div>
            </>}
        </WiredActionBaseView>
    );
};
