import { FC, useEffect, useState } from 'react';
import {
    joinWiredLiteral,
    LocalizeText,
    parseWiredLiteral,
    splitWiredLiteral,
    tokenOfVariableSlot,
    variableSlotOf,
    WIRED_VARIABLE_ABSENT,
    WiredFurniType,
    WiredNativeVariableScope
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { normalizeWiredComparison, WIRED_CMP_EQUAL, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { FurniPickSlotButtons, VariableQuantifierRadios, VariableScopeButtons } from './WiredVariableConditionParts';
import { scopeOfTargetCode, targetCodeOfScope } from '../../../../api';
import { useVariableScopeEntries } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const SCOPES: WiredNativeVariableScope[] = ['furni', 'user', 'global', 'context'];
/** The reference option: a typed constant, or the value of another variable. */
const REFERENCE_CONSTANT = 0;
const REFERENCE_VARIABLE = 1;
/** Native furni sources 100 and 101 read the primary and secondary pick lists, regardless of variable role. */
const FURNI_SOURCE_SELECTED = 100;
const FURNI_SOURCE_SECONDARY_SELECTED = 101;

/**
 * Owned: [destination target, comparison (native radio value), reference option, value high, value low, reference target];
 * furni: [destination furni source, reference furni source]; users: [destination user source, reference user source];
 * variables: [destination variable, reference variable]; the quantifier is the condition's own field; the text is empty.
 * The value is kept as the exact decimal the user typed, and split into its signed words only when saved.
 */
export const WiredConditionVariableValueMatchView: FC<{}> = () => {
    const {
        trigger = null,
        furniIds = [],
        setActivePickSlot = null,
        secondaryFurniIds = [],
        quantifier = 0,
        setQuantifier = null,
        setIntParams = null,
        setStringParam = null,
        setVariableIds = null,
        setFurniSources = null,
        setUserSources = null
    } = useWired();
    const [scope, setScope] = useState<WiredNativeVariableScope>('user');
    const [variableToken, setVariableToken] = useState('');
    const [comparison, setComparison] = useState(WIRED_CMP_EQUAL);
    const [option, setOption] = useState(REFERENCE_CONSTANT);
    const [constantInput, setConstantInput] = useState('0');
    const [referenceScope, setReferenceScope] = useState<WiredNativeVariableScope>('user');
    const [referenceToken, setReferenceToken] = useState('');
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(0);
    const [referenceUserSource, setReferenceUserSource] = useState(0);
    const [referenceFurniSource, setReferenceFurniSource] = useState(0);
    const entries = useVariableScopeEntries(scope, 'condition', variableToken);
    const referenceEntries = useVariableScopeEntries(referenceScope, 'change-reference', referenceToken);

    const usesReference = option === REFERENCE_VARIABLE;
    const picksFurni = scope === 'furni' && (furniSource === FURNI_SOURCE_SELECTED || furniSource === FURNI_SOURCE_SECONDARY_SELECTED);
    const picksReference = usesReference && referenceScope === 'furni' && (referenceFurniSource === FURNI_SOURCE_SELECTED || referenceFurniSource === FURNI_SOURCE_SECONDARY_SELECTED);
    const requiresFurni = picksFurni || picksReference ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    useEffect(() => {
        if (!trigger) return;

        const ints = trigger.intData ?? [];

        setScope(scopeOfTargetCode(ints[0]));
        setComparison(ints.length > 1 ? normalizeWiredComparison(ints[1]) : WIRED_CMP_EQUAL);
        setOption(ints[2] === REFERENCE_VARIABLE ? REFERENCE_VARIABLE : REFERENCE_CONSTANT);
        setConstantInput(ints.length > 4 ? joinWiredLiteral(ints[3], ints[4]) : '0');
        setReferenceScope(scopeOfTargetCode(ints[5]));
        setVariableToken(tokenOfVariableSlot(trigger.variableIds?.[0]));
        setReferenceToken(tokenOfVariableSlot(trigger.variableIds?.[1]));
        setFurniSource(trigger.furniSources?.[0] ?? 0);
        setReferenceFurniSource(trigger.furniSources?.[1] ?? 0);
        setUserSource(trigger.userSources?.[0] ?? 0);
        setReferenceUserSource(trigger.userSources?.[1] ?? 0);
        if (scopeOfTargetCode(ints[0]) === 'furni' && [100, 101].includes(trigger.furniSources?.[0])) setActivePickSlot(trigger.furniSources[0] === 101 ? 1 : 0);
        else if (ints[2] === REFERENCE_VARIABLE && scopeOfTargetCode(ints[5]) === 'furni' && [100, 101].includes(trigger.furniSources?.[1])) setActivePickSlot(trigger.furniSources[1] === 101 ? 1 : 0);
    }, [setActivePickSlot, trigger]);

    const constantValid = parseWiredLiteral(constantInput.trim()) !== null;

    const save = () => {
        const [high, low] = splitWiredLiteral(parseWiredLiteral(constantInput.trim()) ?? 0n);

        setIntParams([targetCodeOfScope(scope), comparison, option, high, low, targetCodeOfScope(referenceScope)]);
        setVariableIds([variableSlotOf(variableToken), usesReference ? variableSlotOf(referenceToken) : WIRED_VARIABLE_ABSENT]);
        setFurniSources([scope === 'furni' ? furniSource : 0, usesReference && referenceScope === 'furni' ? referenceFurniSource : 0]);
        setUserSources([scope === 'user' ? userSource : 0, usesReference && referenceScope === 'user' ? referenceUserSource : 0]);
        setStringParam('');
    };

    const validate = () => {
        if (!variableToken) return false;
        if (!usesReference) return constantValid;

        return !!referenceToken;
    };

    const handleScopeChange = (next: WiredNativeVariableScope) => {
        if (next === scope) return;

        setScope(next);
        setVariableToken('');
    };

    const handleReferenceScopeChange = (next: WiredNativeVariableScope) => {
        if (next === referenceScope) return;

        setReferenceScope(next);
        setReferenceToken('');
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            cardStyle={{ width: 260 }}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <VariableQuantifierRadios name="wiredConditionVariableValueQuantifier" value={quantifier} onChange={(value) => setQuantifier?.(value)} />
                    {scope === 'furni' && <WiredSourcesSelector showFurni={true} furniSlot={0} furniSource={furniSource} onChangeFurni={(value) => { setFurniSource(value); if (value === 100 || value === 101) setActivePickSlot(value === 101 ? 1 : 0); }} />}
                    {scope === 'user' && <WiredSourcesSelector showUsers={true} userSlot={0} userSource={userSource} onChangeUsers={setUserSource} />}
                    {usesReference && referenceScope === 'furni' && (
                        <WiredSourcesSelector
                            showFurni={true}
                            furniSlot={1}
                            furniSource={referenceFurniSource}
                            furniTitle="wiredfurni.params.sources.merged.title.variables_reference"
                            onChangeFurni={(value) => { setReferenceFurniSource(value); if (value === 100 || value === 101) setActivePickSlot(value === 101 ? 1 : 0); }}
                        />
                    )}
                    {usesReference && referenceScope === 'user' && (
                        <WiredSourcesSelector
                            showUsers={true}
                            userSlot={1}
                            userSource={referenceUserSource}
                            usersTitle="wiredfurni.params.sources.merged.title.variables_reference"
                            onChangeUsers={setReferenceUserSource}
                        />
                    )}
                    <FurniPickSlotButtons
                        slots={[
                            ...((picksFurni && furniSource === 100 || picksReference && referenceFurniSource === 100) ? [{ slot: 0 as const, count: furniIds.length }] : []),
                            ...((picksFurni && furniSource === 101 || picksReference && referenceFurniSource === 101) ? [{ slot: 1 as const, count: secondaryFurniIds.length }] : [])
                        ]}
                    />
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

                <WiredComparisonOperator name="variableValueMatchComparison" value={comparison} onChange={setComparison} />

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.reference_value')}</div>
                    <label className="octane-wired__change-var-radio">
                        <input checked={!usesReference} type="radio" onChange={() => setOption(REFERENCE_CONSTANT)} />
                        <Text>{LocalizeText('wiredfurni.params.operator.2')}</Text>
                        <OctaneInput
                            className="octane-wired__give-var-number"
                            type="text"
                            inputMode="numeric"
                            disabled={usesReference}
                            value={constantInput}
                            onChange={(event) => setConstantInput(event.target.value)}
                        />
                    </label>

                    <div className="octane-wired__change-var-reference-block">
                        <label className="octane-wired__change-var-radio">
                            <input checked={usesReference} type="radio" onChange={() => setOption(REFERENCE_VARIABLE)} />
                            <Text>{LocalizeText('wiredfurni.params.variables.reference_value.from_variable')}</Text>
                        </label>

                        {usesReference && (
                            <>
                                <VariableScopeButtons scopes={SCOPES} value={referenceScope} onChange={handleReferenceScopeChange} />
                                <WiredVariablePicker
                                    entries={referenceEntries}
                                    recentScope="variable-selectors-reference"
                                    selectedToken={referenceToken}
                                    onSelect={(entry) => setReferenceToken(entry.token)}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </WiredConditionBaseView>
    );
};
