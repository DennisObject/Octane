import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_FILTER = 1;
const MAX_FILTER = 1000;

/** AIR variable targets of the count: furni 0, user 1, room -10, context -20. */
const COUNT_TARGETS: { target: WiredVariablePickerTarget; code: number; label: string }[] = [
    { target: 'user', code: 1, label: 'wiredfurni.params.sources.users.title' },
    { target: 'furni', code: 0, label: 'wiredfurni.params.sources.furni.title' },
    { target: 'global', code: -10, label: 'wiredfurni.params.sources.global' },
    { target: 'context', code: -20, label: 'wiredfurni.params.sources.context' }
];

const clampCount = (value: number) => (Number.isFinite(value) ? Math.min(MAX_FILTER, Math.max(MIN_FILTER, Math.trunc(value))) : MIN_FILTER);

/**
 * The filter cards: owned [count, option (0 value, 1 variable), variable target]; the filtered side is the furni (F)
 * or the users (U) source; the count variable is the one variable slot.
 */
export const WiredExtraFilterCountView: FC<{ furni: boolean }> = ({ furni }) => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setFurniSources = null, setUserSources = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [count, setCount] = useState(MIN_FILTER);
    const [useVariable, setUseVariable] = useState(false);
    const [target, setTarget] = useState<WiredVariablePickerTarget>('user');
    const [variableToken, setVariableToken] = useState('');
    const [furniSource, setFurniSource] = useState(100);
    const [userSource, setUserSource] = useState(0);
    const userDefault = trigger?.inputSources?.userDefaults[0] ?? 0;

    const definitions = useMemo(() => {
        switch (target) {
            case 'furni':
                return furniVariableDefinitions;
            case 'global':
                return roomVariableDefinitions;
            case 'context':
                return contextVariableDefinitions;
            default:
                return userVariableDefinitions;
        }
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, target, userVariableDefinitions]);
    const entries = useMemo(() => buildWiredVariablePickerEntries(target, 'filter-main', definitions), [definitions, target]);

    useEffect(() => {
        if (!trigger) return;

        const [nextCount = MIN_FILTER, nextOption = 0, nextTarget = 1] = trigger.intData;
        const variableId = trigger.variableIds[0] ?? WIRED_VARIABLE_ABSENT;

        setCount(clampCount(nextCount));
        setUseVariable(nextOption === 1 && variableId !== WIRED_VARIABLE_ABSENT);
        setTarget(COUNT_TARGETS.find((entry) => entry.code === nextTarget)?.target ?? 'user');
        setVariableToken(tokenOfVariableSlot(variableId));
        setFurniSource(trigger.furniSources[0] ?? 100);
        setUserSource(trigger.userSources[0] ?? userDefault);
    }, [trigger, userDefault]);

    const save = () => {
        const code = COUNT_TARGETS.find((entry) => entry.target === target)?.code ?? 1;

        setIntParams([clampCount(count), useVariable ? 1 : 0, code]);
        setStringParam('');
        setVariableIds([useVariable ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        setFurniSources([furni ? furniSource : 100]);
        setUserSources([furni ? userDefault : userSource]);
    };

    const validate = () => !useVariable || !!variableToken;

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
            cardStyle={{ width: 360 }}
            footer={furni ? <WiredSourcesSelector showFurni={true} furniSlot={0} furniSource={furniSource} onChangeFurni={setFurniSource} /> : <WiredSourcesSelector showUsers={true} userSlot={0} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.setfilter', 'Amount')}</Text>
                <WiredRadioGroup
                    name={furni ? 'filterFurniCountOption' : 'filterUserCountOption'}
                    value={useVariable ? 1 : 0}
                    onChange={(value) => setUseVariable(value === 1)}
                    options={[
                        { id: 0, label: localizeWithFallback('wiredfurni.params.filter.count.value', 'Value') },
                        { id: 1, label: localizeWithFallback('wiredfurni.params.filter.count.variable', 'Variable') }
                    ]}
                />
                {!useVariable && (
                    <OctaneInput type="number" min={MIN_FILTER} max={MAX_FILTER} value={count} onChange={(event) => setCount(clampCount(Number(event.target.value)))} />
                )}
                {useVariable && (
                    <>
                        <WiredRadioGroup
                            name={furni ? 'filterFurniCountTarget' : 'filterUserCountTarget'}
                            value={COUNT_TARGETS.findIndex((entry) => entry.target === target)}
                            onChange={(index) => {
                                setTarget(COUNT_TARGETS[index].target);
                                setVariableToken('');
                            }}
                            options={COUNT_TARGETS.map((entry, index) => ({ id: index, label: localizeWithFallback(entry.label, entry.target) }))}
                        />
                        <WiredVariablePicker entries={entries} recentScope={furni ? 'filter-furni-count' : 'filter-user-count'} selectedToken={variableToken} onSelect={(entry) => setVariableToken(entry.token)} />
                    </>
                )}
            </div>
        </WiredExtraBaseView>
    );
};
