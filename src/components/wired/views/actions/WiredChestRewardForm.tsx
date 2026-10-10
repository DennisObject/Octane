import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

/** AIR's merged targets for the amount: furni 0, user 1, room -10, context -20. */
export const AMOUNT_TARGETS: { target: WiredVariablePickerTarget; code: number; label: string }[] = [
    { target: 'user', code: 1, label: 'wiredfurni.params.sources.users.title' },
    { target: 'furni', code: 0, label: 'wiredfurni.params.sources.furni.title' },
    { target: 'global', code: -10, label: 'wiredfurni.params.sources.global' },
    { target: 'context', code: -20, label: 'wiredfurni.params.sources.context' }
];

/** Currency categories the editor offers (AIR's dropdown); furni iteration types are 0 to 2. */
const CURRENCY_CATEGORIES = [11, 13];
const ITERATION_TYPES = [0, 1, 2];
const MAX_AMOUNT = 2147483647;
const POPUP_TEXT_MAX = 200;

const clampAmount = (value: number) => (Number.isFinite(value) ? Math.min(MAX_AMOUNT, Math.max(1, Math.trunc(value))) : 1);

/**
 * Owned: [rewarding mode (1 all), amount, amount option (1 variable), amount target, show by default, currency category
 * or iteration type]; text: the reward popup; variable: the amount variable; furni: [chests, merged furni]; users: [reward user, merged user].
 */
export const WiredChestRewardForm: FC<{ kind: 'currency' | 'furni' }> = ({ kind }) => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setFurniSources = null, setUserSources = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [mode, setMode] = useState(0);
    const [amount, setAmount] = useState(1);
    const [useVariable, setUseVariable] = useState(false);
    const [target, setTarget] = useState<WiredVariablePickerTarget>('user');
    const [variableToken, setVariableToken] = useState('');
    const [showByDefault, setShowByDefault] = useState(false);
    const [popupText, setPopupText] = useState('');
    const [category, setCategory] = useState(CURRENCY_CATEGORIES[0]);
    const [iteration, setIteration] = useState(0);
    const [chestSource, setChestSource] = useState(100);
    const [mergedFurniSource, setMergedFurniSource] = useState(0);
    const [rewardUserSource, setRewardUserSource] = useState(0);
    const [mergedUserSource, setMergedUserSource] = useState(0);

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
    const entries = useMemo(() => buildWiredVariablePickerEntries(target, 'give', definitions), [definitions, target]);

    useEffect(() => {
        if (!trigger) return;

        const [nextMode = 0, nextAmount = 1, nextOption = 0, nextTarget = 1, nextShow = 0, nextLast = 0] = trigger.intData;
        const variableId = trigger.variableIds[0] ?? WIRED_VARIABLE_ABSENT;

        setMode(nextMode === 1 ? 1 : 0);
        setAmount(clampAmount(nextAmount));
        setUseVariable(nextOption === 1 && variableId !== WIRED_VARIABLE_ABSENT);
        setTarget(AMOUNT_TARGETS.find((entry) => entry.code === nextTarget)?.target ?? 'user');
        setVariableToken(tokenOfVariableSlot(variableId));
        setShowByDefault(nextShow === 1);
        setPopupText((trigger.stringData ?? '').slice(0, POPUP_TEXT_MAX));
        if (kind === 'currency') setCategory(CURRENCY_CATEGORIES.includes(nextLast) ? nextLast : CURRENCY_CATEGORIES[0]);
        else setIteration(ITERATION_TYPES.includes(nextLast) ? nextLast : 0);
        setChestSource(trigger.furniSources[0] ?? 100);
        setMergedFurniSource(trigger.furniSources[1] ?? 0);
        setRewardUserSource(trigger.userSources[0] ?? 0);
        setMergedUserSource(trigger.userSources[1] ?? 0);
    }, [kind, trigger]);

    const save = () => {
        const code = AMOUNT_TARGETS.find((entry) => entry.target === target)?.code ?? 1;

        setIntParams([mode, clampAmount(amount), useVariable ? 1 : 0, code, showByDefault ? 1 : 0, kind === 'currency' ? category : iteration]);
        setStringParam(popupText.slice(0, POPUP_TEXT_MAX));
        setVariableIds([useVariable ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        setFurniSources([chestSource, useVariable && target === 'furni' ? mergedFurniSource : 0]);
        setUserSources([rewardUserSource, useVariable && target === 'user' ? mergedUserSource : 0]);
    };

    const validate = () => !useVariable || !!variableToken;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={validate}
            footer={
                <>
                    <WiredSourcesSelector showFurni={true} furniSlot={0} furniSource={chestSource} furniTitle="wiredfurni.params.sources.furni.title.chests" onChangeFurni={setChestSource} />
                    {useVariable && target === 'furni' && (
                        <WiredSourcesSelector showFurni={true} furniSlot={1} furniSource={mergedFurniSource} furniTitle="wiredfurni.params.sources.merged.title.variables_reference" onChangeFurni={setMergedFurniSource} />
                    )}
                    <WiredSourcesSelector showUsers={true} userSlot={0} userSource={rewardUserSource} usersTitle="wiredfurni.params.sources.users.title.reward_user" onChangeUsers={setRewardUserSource} />
                    {useVariable && target === 'user' && (
                        <WiredSourcesSelector showUsers={true} userSlot={1} userSource={mergedUserSource} usersTitle="wiredfurni.params.sources.merged.title.variables_reference" onChangeUsers={setMergedUserSource} />
                    )}
                </>
            }
        >
            <Text bold>{localizeWithFallback('wiredfurni.params.rewarding_mode', 'Rewarding mode')}</Text>
            <WiredRadioGroup
                name="chestRewardMode"
                value={mode}
                onChange={setMode}
                options={[
                    { id: 0, label: localizeWithFallback('wiredfurni.params.rewarding_mode.0', 'Amount per trigger') },
                    { id: 1, label: localizeWithFallback('wiredfurni.params.rewarding_mode.1', 'All of the chest') }
                ]}
            />
            {mode === 0 && (
                <>
                    <WiredRadioGroup
                        name="chestRewardAmountOption"
                        value={useVariable ? 1 : 0}
                        onChange={(value) => setUseVariable(value === 1)}
                        options={[
                            { id: 0, label: localizeWithFallback('wiredfurni.params.amount_to_give', 'Amount') },
                            { id: 1, label: localizeWithFallback('wiredfurni.params.variables.reference_value.from_variable', 'From variable') }
                        ]}
                    />
                    {!useVariable && (
                        <OctaneInput type="number" min={1} max={MAX_AMOUNT} value={amount} onChange={(event) => setAmount(clampAmount(Number(event.target.value)))} />
                    )}
                    {useVariable && (
                        <>
                            <WiredRadioGroup
                                name="chestRewardAmountTarget"
                                value={AMOUNT_TARGETS.findIndex((entry) => entry.target === target)}
                                onChange={(index) => {
                                    setTarget(AMOUNT_TARGETS[index].target);
                                    setVariableToken('');
                                }}
                                options={AMOUNT_TARGETS.map((entry, index) => ({ id: index, label: localizeWithFallback(entry.label, entry.target) }))}
                            />
                            <WiredVariablePicker entries={entries} recentScope="chest-reward-amount" selectedToken={variableToken} onSelect={(entry) => setVariableToken(entry.token)} />
                        </>
                    )}
                </>
            )}
            <WiredCheckboxOption checked={showByDefault} label={localizeWithFallback('wiredfurni.params.reward_contract.reward_popup.show_by_default', 'Show by default')} onChange={setShowByDefault} />
            <textarea className="form-control form-control-sm" maxLength={POPUP_TEXT_MAX} rows={3} value={popupText} onChange={(event) => setPopupText(event.target.value)} />
            {kind === 'currency' ? (
                <WiredRadioGroup
                    name="chestRewardCategory"
                    value={category}
                    onChange={setCategory}
                    options={CURRENCY_CATEGORIES.map((value) => ({ id: value, label: localizeWithFallback(`wiredfurni.params.earnings_category.${value}`, `Category ${value}`) }))}
                />
            ) : (
                <WiredRadioGroup
                    name="chestRewardIteration"
                    value={iteration}
                    onChange={setIteration}
                    options={ITERATION_TYPES.map((value) => ({ id: value, label: localizeWithFallback(`wiredfurni.params.chest_iteration_type.${value}`, `Iteration ${value}`) }))}
                />
            )}
        </WiredActionBaseView>
    );
};
