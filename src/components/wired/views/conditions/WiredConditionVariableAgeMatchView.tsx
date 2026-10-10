import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WiredNativeVariableScope, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { FurniPickSlotButtons, VariableQuantifierRadios, VariableScopeButtons } from './WiredVariableConditionParts';
import { scopeOfTargetCode, targetCodeOfScope } from '../../../../api';
import { useVariableScopeEntries } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

/** The age card compares the variable's creation or last update with a duration. */
const COMPARE_CREATED = 0;
const COMPARE_UPDATED = 1;
/** Comparison as the native form sends it: 0 is "younger than" (<), 2 is "older than" (>). */
const COMPARISON_LESS = 0;
const COMPARISON_GREATER = 2;
const DURATION_MAX = 1000000;
const DURATION_UNITS = [0, 1, 2, 3, 4, 5, 6, 7];
const SCOPES: WiredNativeVariableScope[] = ['furni', 'user', 'global', 'context'];
const FURNI_SOURCE_SELECTED = 100;

/**
 * Owned: [target, comparison (0 below, 2 above), clock (0 creation, 1 last update), 0, duration, time unit];
 * furni: [the holder's furni source]; users: [the holder's user source]; variables: [the variable]; the text is empty.
 */
export const WiredConditionVariableAgeMatchView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds = null, quantifier = 0, setQuantifier = null, setIntParams = null, setStringParam = null, setVariableIds = null, setFurniSources = null, setUserSources = null } =
        useWired();
    const [scope, setScope] = useState<WiredNativeVariableScope>('user');
    const [variableToken, setVariableToken] = useState('');
    const [compareValue, setCompareValue] = useState(COMPARE_CREATED);
    const [comparison, setComparison] = useState(COMPARISON_LESS);
    const [durationInput, setDurationInput] = useState('0');
    const [durationUnit, setDurationUnit] = useState(1);
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(0);
    const entries = useVariableScopeEntries(scope, 'condition', variableToken);

    const picksFurni = scope === 'furni' && furniSource === FURNI_SOURCE_SELECTED;
    const requiresFurni = picksFurni ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    useEffect(() => {
        if (!trigger) return;

        const ints = trigger.intData ?? [];

        setScope(scopeOfTargetCode(ints[0]));
        setComparison(ints[1] === COMPARISON_GREATER ? COMPARISON_GREATER : COMPARISON_LESS);
        setCompareValue(ints[2] === COMPARE_UPDATED ? COMPARE_UPDATED : COMPARE_CREATED);
        setDurationInput(String(ints[4] ?? 0));
        setDurationUnit(DURATION_UNITS.includes(ints[5]) ? ints[5] : 1);
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
        setFurniSource(trigger.furniSources?.[0] ?? 0);
        setUserSource(trigger.userSources?.[0] ?? 0);
    }, [trigger]);

    // A global variable has no creation time of its own, so only its last update can be compared.
    useEffect(() => {
        if (scope === 'global' && compareValue !== COMPARE_UPDATED) setCompareValue(COMPARE_UPDATED);
    }, [compareValue, scope]);

    const parsedDuration = Number(durationInput.trim());
    const durationValid = /^\d+$/.test(durationInput.trim()) && parsedDuration <= DURATION_MAX;

    const save = () => {
        setIntParams([targetCodeOfScope(scope), comparison, compareValue, 0, durationValid ? parsedDuration : 0, durationUnit]);
        setFurniSources([scope === 'furni' ? furniSource : 0]);
        setUserSources([scope === 'user' ? userSource : 0]);
        setVariableIds([variableSlotOf(variableToken)]);
        setStringParam('');
        if (!picksFurni) setFurniIds([]);
    };

    const validate = () => {
        if (!variableToken.length) return false;
        if (!durationValid) return false;
        if (scope === 'global' && compareValue !== COMPARE_UPDATED) return false;

        return true;
    };

    const handleScopeChange = (next: WiredNativeVariableScope) => {
        if (next === scope) return;

        setScope(next);
        setVariableToken('');
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            cardStyle={{ width: 244 }}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <VariableQuantifierRadios name="wiredConditionVariableAgeQuantifier" value={quantifier} onChange={(value) => setQuantifier?.(value)} />
                    {scope === 'furni' && <WiredSourcesSelector showFurni={true} furniSlot={0} furniSource={furniSource} onChangeFurni={setFurniSource} />}
                    {scope === 'user' && <WiredSourcesSelector showUsers={true} userSlot={0} userSource={userSource} onChangeUsers={setUserSource} />}
                    {picksFurni && <FurniPickSlotButtons slots={[{ slot: 0, count: furniIds.length }]} />}
                </div>
            }
        >
            <div className="octane-wired__give-var">
                <div className="octane-wired__give-var-heading">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <VariableScopeButtons scopes={SCOPES} value={scope} onChange={handleScopeChange} />
                </div>

                <WiredVariablePicker entries={entries} recentScope="variable-conditions" selectedToken={variableToken} onSelect={(entry) => setVariableToken(entry.token)} />

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.compare_value')}</div>
                    {[COMPARE_CREATED, COMPARE_UPDATED].map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <input
                                checked={compareValue === value}
                                className="form-check-input"
                                disabled={scope === 'global' && value === COMPARE_CREATED}
                                name="wiredConditionVariableAgeCompareValue"
                                type="radio"
                                onChange={() => setCompareValue(value)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.variables.compare_value.${value}`)}</Text>
                        </label>
                    ))}
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.choose_type')}</div>
                    {[COMPARISON_LESS, COMPARISON_GREATER].map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <input
                                checked={comparison === value}
                                className="form-check-input"
                                name="wiredConditionVariableAgeComparison"
                                type="radio"
                                onChange={() => setComparison(value)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.comparison.${value}`)}</Text>
                        </label>
                    ))}
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.time_selection')}</div>
                    <div className="flex items-center gap-2">
                        <Text>{LocalizeText('wiredfurni.params.variables.duration')}</Text>
                        <OctaneInput
                            className="octane-wired__give-var-number"
                            type="number"
                            min={0}
                            max={DURATION_MAX}
                            value={durationInput}
                            onChange={(event) => setDurationInput(event.target.value)}
                        />
                        <select
                            className="min-w-0 flex-1 rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px]"
                            value={durationUnit}
                            onChange={(event) => setDurationUnit(Number(event.target.value))}
                        >
                            {DURATION_UNITS.map((unit) => (
                                <option key={unit} value={unit}>
                                    {LocalizeText(`wiredfurni.params.variables.duration.${unit}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </WiredConditionBaseView>
    );
};
