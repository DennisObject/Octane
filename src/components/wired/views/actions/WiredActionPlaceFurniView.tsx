import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const TARGETS = [
    { value: 0, label: 'Furniture' },
    { value: 1, label: 'Users' },
    { value: -20, label: 'Context' },
    { value: -10, label: 'Room' }
];

export const WiredActionPlaceFurniView: FC<{}> = () => {
    const { trigger, nativeCatalog, setIntParams, setStringParam, setFurniSources, setUserSources, setVariableIds, activePickSlot, setActivePickSlot } =
        useWired();
    const [targetIsUser, setTargetIsUser] = useState(false);
    const [location, setLocation] = useState(0);
    const [altitude, setAltitude] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [offsetZ, setOffsetZ] = useState(0);
    const [spawnWithVariable, setSpawnWithVariable] = useState(false);
    const [valueIsVariable, setValueIsVariable] = useState(false);
    const [value, setValue] = useState(0);
    const [valueTarget, setValueTarget] = useState(0);
    const [spawnVariable, setSpawnVariable] = useState('n');
    const [valueVariable, setValueVariable] = useState('n');
    const [furni, setFurni] = useState([100, 100, 100]);
    const [users, setUsers] = useState([0, 0]);
    useEffect(() => {
        const p = trigger?.intData ?? [];
        setTargetIsUser(p[0] === 1);
        setLocation(p[1] ?? 0);
        setAltitude(p[2] ?? 0);
        setOffsetX(p[3] ?? 0);
        setOffsetY(p[4] ?? 0);
        setOffsetZ(p[5] ?? 0);
        setSpawnWithVariable(p[6] === 1);
        setValueIsVariable(p[7] === 1);
        setValue(p[8] ?? 0);
        setValueTarget(p[9] ?? 0);
        setSpawnVariable(trigger?.variableIds[0] ?? 'n');
        setValueVariable(trigger?.variableIds[1] ?? 'n');
        setFurni([0, 1, 2].map((slot) => trigger?.furniSources[slot] ?? 100));
        setUsers([0, 1].map((slot) => trigger?.userSources[slot] ?? 0));
    }, [trigger]);
    const rows = nativeCatalog?.available ? [...nativeCatalog.rows.values()].map((row) => row.variable) : [];
    const spawnRows = rows.filter((row) => row.variableTarget === 0 && row.variableType === 0 && row.canCreateAndDelete);
    const valueRows = rows.filter((row) => row.variableTarget === valueTarget && row.hasValue);
    const setF = (slot: number, source: number) => setFurni((previous) => previous.map((entry, index) => (index === slot ? source : entry)));
    const setU = (slot: number, source: number) => setUsers((previous) => previous.map((entry, index) => (index === slot ? source : entry)));
    const referenceNeeded = location === 1 || altitude === 2;
    const validate = () =>
        [offsetX, offsetY, offsetZ, value].every(Number.isInteger) &&
        Math.abs(offsetX) <= 64 &&
        Math.abs(offsetY) <= 64 &&
        Math.abs(offsetZ) <= 8000 &&
        value >= -2147483648 &&
        value <= 2147483647;
    const save = () => {
        setIntParams([
            targetIsUser ? 1 : 0,
            location,
            altitude,
            offsetX,
            offsetY,
            offsetZ,
            spawnWithVariable ? 1 : 0,
            valueIsVariable ? 1 : 0,
            value,
            valueTarget
        ]);
        setStringParam('');
        setFurniSources(furni);
        setUserSources(users);
        setVariableIds([spawnWithVariable ? spawnVariable : 'n', spawnWithVariable && valueIsVariable ? valueVariable : 'n']);
    };
    const numberInput = (label: string, input: number, update: (value: number) => void, minimum: number, maximum: number) => (
        <label className="flex items-center justify-between gap-2">
            <span>{LocalizeText(label)}</span>
            <input
                className="form-control form-control-sm w-24"
                type="number"
                step={1}
                min={minimum}
                max={maximum}
                value={input}
                onChange={(event) => update(Number(event.target.value))}
            />
        </label>
    );
    const picker = (selected: string, update: (id: string) => void, options: typeof rows) => (
        <select className="form-select" value={selected} onChange={(event) => update(event.target.value)} disabled={!nativeCatalog?.available}>
            <option value="n">{LocalizeText('wiredfurni.variable_picker.select_variable')}</option>
            {selected !== 'n' && !options.some((row) => row.variableId === selected) && (
                <option value={selected} disabled>
                    {selected}
                </option>
            )}
            {options.map((row) => (
                <option key={row.variableId} value={row.variableId}>
                    {row.variableName}
                </option>
            ))}
        </select>
    );
    return (
        <WiredActionBaseView
            nativeLayout={true}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            validate={validate}
            footer={
                <>
                    <WiredSourcesSelector showFurni={true} furniSource={furni[0]} onChangeFurni={(source) => setF(0, source)} />
                    {referenceNeeded && (
                        <>
                            <select className="form-select" value={targetIsUser ? 1 : 0} onChange={(event) => setTargetIsUser(event.target.value === '1')}>
                                <option value={0}>Furniture</option>
                                <option value={1}>Users</option>
                            </select>
                            <WiredSourcesSelector
                                showFurni={!targetIsUser}
                                showUsers={targetIsUser}
                                furniSlot={1}
                                userSlot={0}
                                furniSource={furni[1]}
                                userSource={users[0]}
                                onChangeFurni={(source) => setF(1, source)}
                                onChangeUsers={(source) => setU(0, source)}
                            />
                        </>
                    )}
                    {spawnWithVariable && valueIsVariable && (
                        <WiredSourcesSelector
                            showFurni={valueTarget === 0}
                            showUsers={valueTarget === 1}
                            furniSlot={2}
                            userSlot={1}
                            furniSource={furni[2]}
                            userSource={users[1]}
                            onChangeFurni={(source) => setF(2, source)}
                            onChangeUsers={(source) => setU(1, source)}
                        />
                    )}
                    <div className="flex gap-2">
                        {[0, 1].map((slot) => (
                            <button key={slot} type="button" aria-pressed={activePickSlot === slot} onClick={() => setActivePickSlot(slot as 0 | 1)}>
                                {LocalizeText(`wiredfurni.params.sources.furni.${slot === 0 ? 100 : 101}`)}
                            </button>
                        ))}
                    </div>
                </>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.place_furni.target_location')}>
                {[0, 1].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                        <input type="radio" name="placeLocation" checked={location === option} onChange={() => setLocation(option)} />
                        {LocalizeText(`wiredfurni.params.place_furni.target_location.${option}`)}
                    </label>
                ))}
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.place_furni.target_altitude')}>
                {[0, 1, 2].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                        <input type="radio" name="placeAltitude" checked={altitude === option} onChange={() => setAltitude(option)} />
                        {LocalizeText(`wiredfurni.params.place_furni.target_altitude.${option}`)}
                    </label>
                ))}
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.place_furni.offsets')}>
                {numberInput('wiredfurni.params.place_furni.offsets.x', offsetX, setOffsetX, -64, 64)}
                {numberInput('wiredfurni.params.place_furni.offsets.y', offsetY, setOffsetY, -64, 64)}
                {numberInput('wiredfurni.params.place_furni.offsets.altitude', offsetZ, setOffsetZ, -8000, 8000)}
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.place_furni.spawn_with_variable')}>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={spawnWithVariable} onChange={(event) => setSpawnWithVariable(event.target.checked)} />
                    {LocalizeText('wiredfurni.params.place_furni.spawn_with_variable')}
                </label>
                {spawnWithVariable && (
                    <>
                        {picker(spawnVariable, setSpawnVariable, spawnRows)}
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={valueIsVariable} onChange={(event) => setValueIsVariable(event.target.checked)} />
                            {LocalizeText('wiredfurni.params.value.from_variable')}
                        </label>
                        {valueIsVariable ? (
                            <>
                                <select
                                    className="form-select"
                                    value={valueTarget}
                                    onChange={(event) => {
                                        setValueTarget(Number(event.target.value));
                                        setValueVariable('n');
                                    }}
                                >
                                    {TARGETS.map((target) => (
                                        <option key={target.value} value={target.value}>
                                            {target.label}
                                        </option>
                                    ))}
                                </select>
                                {picker(valueVariable, setValueVariable, valueRows)}
                            </>
                        ) : (
                            numberInput('wiredfurni.params.place_furni.spawn_with_value', value, setValue, -2147483648, 2147483647)
                        )}
                    </>
                )}
            </WiredSection>
        </WiredActionBaseView>
    );
};
