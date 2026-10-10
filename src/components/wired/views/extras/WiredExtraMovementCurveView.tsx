import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { createNativeVariableToken, getNativeVariableId } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * Habbo's "movement curve" (wf_xtra_mov_curve): how high the furni the stack moves jump, typed or
 * read from a variable. Our easing curves sit under the advanced options.
 * Owned ints: [from variable, strength, variable target]; the user and furni sources are the U and F tails; the native
 * curve is always the jump.
 * string param: the variable token.
 */

type VariableTarget = 'user' | 'furni' | 'global' | 'context';

const STRENGTH_MIN = -1000;
const STRENGTH_MAX = 1000;
const STRENGTH_DEFAULT = 80;
const SOURCE_TRIGGER = 0;
const SOURCE_SECONDARY_SELECTED = 101;

const TARGETS: Array<{ key: VariableTarget; value: number; icon: string }> = [
    { key: 'furni', value: 0, icon: furniVariableIcon },
    { key: 'user', value: 1, icon: userVariableIcon },
    { key: 'global', value: -10, icon: globalVariableIcon },
    { key: 'context', value: -20, icon: contextVariableIcon }
];

const FURNI_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [
        { value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_SECONDARY_SELECTED, label: 'wiredfurni.params.sources.furni.101' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);
const GLOBAL_SOURCES: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.global' }];
const CONTEXT_SOURCES: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: localizeWithFallback('wiredfurni.params.sources.context', 'Context variables') }];

const clamp = (value: number, min: number, max: number, fallback: number) => (Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback);
const targetOf = (value: number): VariableTarget => TARGETS.find((target) => target.value === value)?.key ?? 'user';
const targetValue = (key: VariableTarget) => TARGETS.find((target) => target.key === key)?.value ?? 0;

export const WiredExtraMovementCurveView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null, setUserSources = null, setFurniSources = null, setVariableIds = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [strengthInput, setStrengthInput] = useState(String(STRENGTH_DEFAULT));
    const [fromVariable, setFromVariable] = useState(false);
    const [target, setTarget] = useState<VariableTarget>('user');
    const [variableToken, setVariableToken] = useState('');
    const [userSource, setUserSource] = useState(SOURCE_TRIGGER);
    const [furniSource, setFurniSource] = useState(SOURCE_TRIGGER);

    const userSources = sortWiredSourceOptions(useAvailableUserSources(trigger, USER_SOURCES), 'users');

    const definitions =
        target === 'furni'
            ? furniVariableDefinitions
            : target === 'global'
              ? roomVariableDefinitions
              : target === 'context'
                ? contextVariableDefinitions
                : userVariableDefinitions;
    const entries = useMemo(() => {
        const built = buildWiredVariablePickerEntries(target as WiredVariablePickerTarget, 'change-reference', definitions);
        if (!variableToken || flattenWiredVariablePickerEntries(built).some((entry) => entry.token === variableToken)) return built;

        const fallback = createFallbackVariableEntry(target, variableToken);
        return fallback ? [fallback, ...built] : built;
    }, [definitions, target, variableToken]);

    const picksFurni = fromVariable && target === 'furni' && furniSource === SOURCE_SECONDARY_SELECTED;
    const sourceOptions = target === 'furni' ? FURNI_SOURCES : target === 'global' ? GLOBAL_SOURCES : target === 'context' ? CONTEXT_SOURCES : userSources;
    const sourceValue = target === 'furni' ? furniSource : target === 'user' ? userSource : SOURCE_TRIGGER;

    useEffect(() => {
        if (!trigger) return;

        const ints = trigger.intData ?? [];

        // owned: [from variable, strength, target].
        setFromVariable(ints.length > 0 && ints[0] === 1);
        setStrengthInput(String(ints.length > 1 ? clamp(ints[1], STRENGTH_MIN, STRENGTH_MAX, STRENGTH_DEFAULT) : STRENGTH_DEFAULT));
        setTarget(targetOf(ints.length > 2 ? ints[2] : 1));
        setUserSource(trigger.userSources.length > 0 ? trigger.userSources[0] : SOURCE_TRIGGER);
        setFurniSource(trigger.furniSources.length > 0 ? trigger.furniSources[0] : SOURCE_TRIGGER);
        setVariableToken(tokenOfVariableSlot(trigger.variableIds[0]));
    }, [trigger]);

    const chooseTarget = (next: VariableTarget) => {
        if (next === target) return;
        if (target === 'furni') setFurniIds([]);

        setTarget(next);
        setVariableToken('');
    };

    const save = () => {
        setIntParams([fromVariable ? 1 : 0, clamp(parseInt(strengthInput, 10), STRENGTH_MIN, STRENGTH_MAX, STRENGTH_DEFAULT), targetValue(target)]);
        setStringParam('');
        setVariableIds([fromVariable ? variableSlotOf(variableToken) : WIRED_VARIABLE_ABSENT]);
        setUserSources([userSource]);
        setFurniSources([furniSource]);
        if (!picksFurni) setFurniIds([]);
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={picksFurni ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={() => !(fromVariable && !variableToken)}
        >
            <div className="octane-wired__give-var">
                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{localizeWithFallback('wiredfurni.params.movement_curve', 'Movement curve:')}</div>
                    <label className="octane-wired__change-var-radio">
                        <input checked={!fromVariable} type="radio" onChange={() => setFromVariable(false)} />
                        <Text>{LocalizeText('wiredfurni.params.variables.reference_value.set_value')}</Text>
                        <OctaneInput
                            className="octane-wired__give-var-number"
                            max={STRENGTH_MAX}
                            min={STRENGTH_MIN}
                            type="number"
                            value={strengthInput}
                            onChange={(event) => setStrengthInput(event.target.value)}
                        />
                    </label>

                    <div className="octane-wired__change-var-reference-block">
                        <label className="octane-wired__change-var-radio">
                            <input checked={fromVariable} type="radio" onChange={() => setFromVariable(true)} />
                            <Text>{LocalizeText('wiredfurni.params.variables.reference_value.from_variable')}</Text>
                            <div className="octane-wired__give-var-targets">
                                {TARGETS.map((button) => (
                                    <button
                                        key={button.key}
                                        className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${target === button.key ? 'is-active' : ''}`}
                                        disabled={!fromVariable}
                                        type="button"
                                        onClick={() => chooseTarget(button.key)}
                                    >
                                        <img alt={button.key} src={button.icon} />
                                    </button>
                                ))}
                            </div>
                        </label>

                        <div className={fromVariable ? '' : 'opacity-50 pointer-events-none'}>
                            <WiredVariablePicker
                                entries={entries}
                                recentScope="movement-curve-reference"
                                selectedToken={variableToken}
                                onSelect={(entry) => setVariableToken(entry.token)}
                            />
                        </div>
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className={fromVariable ? '' : 'opacity-50 pointer-events-none'}>
                    <WiredFurniSelectionSourceRow
                        options={sourceOptions}
                        selectionActive={true}
                        selectionCount={furniIds.length}
                        selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                        selectionKind="primary"
                        selectionLimit={trigger?.maximumItemSelectionCount ?? 0}
                        showSelectionToggle={false}
                        title="wiredfurni.params.sources.merged.title.variables_reference"
                        value={sourceValue}
                        onChange={(value) => {
                            if (target === 'furni') {
                                setFurniSource(value);
                                if (value !== SOURCE_SECONDARY_SELECTED) setFurniIds([]);
                                return;
                            }

                            if (target === 'user') setUserSource(value);
                        }}
                    />
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
