import { FC, useEffect, useMemo, useState } from 'react';
import { GetWiredTimeLocale, LocalizeText, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { IWiredNativeVariableDefinition, joinWiredLiteral, parseWiredLiteral, splitWiredLiteral, WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredLegacySlider as Slider } from '../WiredSlider';
import { CLICKED_USER_SOURCE, nativeSourceOptions, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { createNativeVariableToken, getNativeVariableId } from '../../../../api';
import { FurniPickSlotButtons } from '../conditions/WiredVariableConditionParts';
import { WiredActionBaseView } from './WiredActionBaseView';
import { localizeWiredVariableOperation, WIRED_VARIABLE_OPERATIONS, WIRED_VARIABLE_UNARY_OPERATIONS } from './WiredVariableOperations';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';
type ReferenceMode = 'constant' | 'variable';

type IVariableDefinition = IWiredNativeVariableDefinition;

// Native variable target codes: furni 0, user 1, room -10, context -20.
const TARGET_USER = 1;
const TARGET_FURNI = 0;
const TARGET_CONTEXT = -20;
const TARGET_GLOBAL = -10;
const REFERENCE_CONSTANT = 0;
const REFERENCE_VARIABLE = 1;
const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];


const GLOBAL_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.global' }];
const CONTEXT_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.context.current' }];

const normalizeTargetType = (value: number): VariableTargetType => {
    switch (value) {
        case TARGET_FURNI:
            return 'furni';
        case TARGET_GLOBAL:
            return 'global';
        case TARGET_CONTEXT:
            return 'context';
        default:
            return 'user';
    }
};

const getTargetValue = (value: VariableTargetType) => {
    switch (value) {
        case 'furni':
            return TARGET_FURNI;
        case 'global':
            return TARGET_GLOBAL;
        case 'context':
            return TARGET_CONTEXT;
        default:
            return TARGET_USER;
    }
};

const resolveSourceOptions = (baseOptions: WiredSourceOption[], selectedValue: number, fallbackOptions: WiredSourceOption[]) => {
    if (!baseOptions.length) return baseOptions;
    if (baseOptions.some((option) => option.value === selectedValue)) return baseOptions;

    const fallbackOption = fallbackOptions.find((option) => option.value === selectedValue);

    if (!fallbackOption) return baseOptions;

    return [...baseOptions, fallbackOption];
};

const getTargetDefinitions = (
    targetType: VariableTargetType,
    userDefinitions: IVariableDefinition[],
    furniDefinitions: IVariableDefinition[],
    roomDefinitions: IVariableDefinition[],
    contextDefinitions: IVariableDefinition[]
) => {
    switch (targetType) {
        case 'furni':
            return furniDefinitions;
        case 'global':
            return roomDefinitions;
        case 'context':
            return contextDefinitions;
        default:
            return userDefinitions;
    }
};

const isGlobalTarget = (targetType: VariableTargetType) => targetType === 'global';
const isFurniTarget = (targetType: VariableTargetType) => targetType === 'furni';
const isContextTarget = (targetType: VariableTargetType) => targetType === 'context';

export const WiredActionChangeVariableValueView: FC<{}> = () => {
    const {
        trigger = null,
        furniIds = [],
        actionDelay = 0,
        setActionDelay = null,
        secondaryFurniIds = [],
        activePickSlot = 0,
        setActivePickSlot = null,
        setIntParams = null,
        setStringParam = null,
        setVariableIds = null,
        setUserSources = null,
        setFurniSources = null
    } = useWired();
    const {
        userVariableDefinitions = [],
        furniVariableDefinitions = [],
        roomVariableDefinitions = [],
        contextVariableDefinitions = []
    } = useWiredNativeVariables();
    const [destinationTargetType, setDestinationTargetType] = useState<VariableTargetType>('user');
    const [destinationVariableToken, setDestinationVariableToken] = useState('');
    const [operation, setOperation] = useState(0);
    const [referenceMode, setReferenceMode] = useState<ReferenceMode>('constant');
    const [referenceConstantValueInput, setReferenceConstantValueInput] = useState('0');
    const [referenceTargetType, setReferenceTargetType] = useState<VariableTargetType>('user');
    const [referenceVariableToken, setReferenceVariableToken] = useState('');
    const [destinationUserSource, setDestinationUserSource] = useState(SOURCE_TRIGGER);
    const [destinationFurniSource, setDestinationFurniSource] = useState(SOURCE_TRIGGER);
    const [referenceUserSource, setReferenceUserSource] = useState(SOURCE_TRIGGER);
    const [referenceFurniSource, setReferenceFurniSource] = useState(SOURCE_TRIGGER);

    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const orderedFurniSources = nativeSourceOptions(trigger?.inputSources?.furniAllowed[0], 'furni');
    const referenceFurniSources = nativeSourceOptions(trigger?.inputSources?.furniAllowed[1], 'furni');
    const userSourceFallbackOptions = useMemo(() => sortWiredSourceOptions([...USER_SOURCES, CLICKED_USER_SOURCE], 'users'), []);
    const destinationDefinitions = useMemo(
        () =>
            getTargetDefinitions(destinationTargetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, destinationTargetType, furniVariableDefinitions, roomVariableDefinitions, userVariableDefinitions]
    );
    const referenceDefinitions = useMemo(
        () => getTargetDefinitions(referenceTargetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, referenceTargetType, roomVariableDefinitions, userVariableDefinitions]
    );
    const destinationVariableEntries = useMemo(
        () => buildWiredVariablePickerEntries(destinationTargetType, 'change-destination', destinationDefinitions),
        [destinationDefinitions, destinationTargetType]
    );
    const resolvedDestinationVariableEntries = useMemo(() => {
        if (!destinationVariableToken) return destinationVariableEntries;
        if (flattenWiredVariablePickerEntries(destinationVariableEntries).some((entry) => entry.token === destinationVariableToken))
            return destinationVariableEntries;

        const fallbackEntry = createFallbackVariableEntry(destinationTargetType, destinationVariableToken);

        return fallbackEntry ? [fallbackEntry, ...destinationVariableEntries] : destinationVariableEntries;
    }, [destinationTargetType, destinationVariableEntries, destinationVariableToken]);
    const referenceVariableEntries = useMemo(
        () => buildWiredVariablePickerEntries(referenceTargetType, 'change-reference', referenceDefinitions),
        [referenceDefinitions, referenceTargetType]
    );
    const resolvedReferenceVariableEntries = useMemo(() => {
        if (!referenceVariableToken) return referenceVariableEntries;
        if (flattenWiredVariablePickerEntries(referenceVariableEntries).some((entry) => entry.token === referenceVariableToken))
            return referenceVariableEntries;

        const fallbackEntry = createFallbackVariableEntry(referenceTargetType, referenceVariableToken);

        return fallbackEntry ? [fallbackEntry, ...referenceVariableEntries] : referenceVariableEntries;
    }, [referenceTargetType, referenceVariableEntries, referenceVariableToken]);

    const destinationSelectionEnabled = isFurniTarget(destinationTargetType) && (destinationFurniSource === SOURCE_SELECTED || destinationFurniSource === SOURCE_SECONDARY_SELECTED);
    const referenceSelectionEnabled = referenceMode === 'variable' && isFurniTarget(referenceTargetType) && (referenceFurniSource === SOURCE_SELECTED || referenceFurniSource === SOURCE_SECONDARY_SELECTED);
    // The server reads only the destination for these, so the reference controls would be a lie.
    const isUnaryOperation = WIRED_VARIABLE_UNARY_OPERATIONS.includes(operation);
    const destinationSelectedSourceValue = isFurniTarget(destinationTargetType)
        ? destinationFurniSource
        : isGlobalTarget(destinationTargetType)
          ? SOURCE_TRIGGER
          : destinationUserSource;
    const referenceSelectedSourceValue = isFurniTarget(referenceTargetType)
        ? referenceFurniSource
        : isGlobalTarget(referenceTargetType)
          ? SOURCE_TRIGGER
          : referenceUserSource;

    const destinationSourceOptions = useMemo(() => {
        if (isContextTarget(destinationTargetType)) return CONTEXT_SOURCE_OPTIONS;
        if (isFurniTarget(destinationTargetType)) return resolveSourceOptions(orderedFurniSources, destinationSelectedSourceValue, orderedFurniSources);
        if (isGlobalTarget(destinationTargetType)) return GLOBAL_SOURCE_OPTIONS;

        return resolveSourceOptions(orderedUserSources, destinationSelectedSourceValue, userSourceFallbackOptions);
    }, [destinationSelectedSourceValue, destinationTargetType, orderedFurniSources, orderedUserSources, userSourceFallbackOptions]);

    const referenceSourceOptions = useMemo(() => {
        if (isContextTarget(referenceTargetType)) return CONTEXT_SOURCE_OPTIONS;
        if (isFurniTarget(referenceTargetType)) return resolveSourceOptions(referenceFurniSources, referenceSelectedSourceValue, referenceFurniSources);
        if (isGlobalTarget(referenceTargetType)) return GLOBAL_SOURCE_OPTIONS;

        return resolveSourceOptions(orderedUserSources, referenceSelectedSourceValue, userSourceFallbackOptions);
    }, [orderedUserSources, referenceFurniSources, referenceSelectedSourceValue, referenceTargetType, userSourceFallbackOptions]);

    useEffect(() => {
        if (!trigger) return;

        // owned: [destination target, operation, reference mode, constant, reference target];
        // variableIds and source tails: [destination, reference]; picks stay in their native numbered lists.
        const nextDestinationTargetType = normalizeTargetType(trigger.intData.length > 0 ? trigger.intData[0] : TARGET_USER);
        const nextReferenceTargetType = normalizeTargetType(trigger.intData.length > 5 ? trigger.intData[5] : TARGET_USER);

        setDestinationTargetType(nextDestinationTargetType);
        setDestinationVariableToken(tokenOfVariableSlot(trigger.variableIds[0]));
        setOperation(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setReferenceMode((trigger.intData.length > 2 ? trigger.intData[2] : REFERENCE_CONSTANT) === REFERENCE_VARIABLE ? 'variable' : 'constant');
        setReferenceConstantValueInput(trigger.intData.length > 4 ? joinWiredLiteral(trigger.intData[3], trigger.intData[4]) : '0');
        setReferenceTargetType(nextReferenceTargetType);
        setReferenceVariableToken(tokenOfVariableSlot(trigger.variableIds[1]));
        setDestinationUserSource(trigger.userSources.length > 0 ? trigger.userSources[0] : SOURCE_TRIGGER);
        setReferenceUserSource(trigger.userSources.length > 1 ? trigger.userSources[1] : SOURCE_TRIGGER);
        setDestinationFurniSource(
            trigger.furniSources.length > 0 ? trigger.furniSources[0] : trigger.inputSources?.furniDefaults[0] ?? SOURCE_TRIGGER
        );
        setReferenceFurniSource(
            trigger.furniSources.length > 1 ? trigger.furniSources[1] : trigger.inputSources?.furniDefaults[1] ?? SOURCE_TRIGGER
        );
        setActivePickSlot(nextDestinationTargetType === 'furni' ? (trigger.furniSources[0] === 101 ? 1 : 0) : (trigger.furniSources[1] === 101 ? 1 : 0));
    }, [setActivePickSlot, trigger]);

    const save = () => {
        const constantValue = parseWiredLiteral(referenceConstantValueInput.trim());

        setStringParam('');
        // owned: [destination target, operation, reference option (1 variable), value high, value low, reference target].
        const [high, low] = splitWiredLiteral(constantValue ?? 0n);

        setIntParams([getTargetValue(destinationTargetType), operation, referenceMode === 'variable' ? REFERENCE_VARIABLE : REFERENCE_CONSTANT, high, low, getTargetValue(referenceTargetType)]);
        setVariableIds([variableSlotOf(destinationVariableToken), referenceMode === 'variable' ? variableSlotOf(referenceVariableToken) : WIRED_VARIABLE_ABSENT]);
        setUserSources([destinationUserSource, referenceUserSource]);
        setFurniSources([destinationFurniSource, referenceFurniSource]);
    };

    const validate = () => {
        if (!destinationVariableToken) return false;
        if (referenceMode === 'variable' && !referenceVariableToken) return false;
        if (referenceMode === 'constant' && parseWiredLiteral(referenceConstantValueInput.trim()) === null) return false;

        return true;
    };

    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    const handleDestinationTargetChange = (targetType: VariableTargetType) => {
        if (targetType === destinationTargetType) return;

        setDestinationTargetType(targetType);
        setDestinationVariableToken('');
    };

    const handleReferenceTargetChange = (targetType: VariableTargetType) => {
        if (targetType === referenceTargetType) return;

        setReferenceTargetType(targetType);
        setReferenceVariableToken('');
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={destinationSelectionEnabled || referenceSelectionEnabled ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
            cardStyle={{ width: 244 }}
            hideDelay={true}
        >
            <div className="octane-wired__give-var">
                <FurniPickSlotButtons slots={[
                    ...((destinationSelectionEnabled && destinationFurniSource === 100 || referenceSelectionEnabled && referenceFurniSource === 100) ? [{ slot: 0 as const, count: furniIds.length }] : []),
                    ...((destinationSelectionEnabled && destinationFurniSource === 101 || referenceSelectionEnabled && referenceFurniSource === 101) ? [{ slot: 1 as const, count: secondaryFurniIds.length }] : [])
                ]} />
                <div className="octane-wired__give-var-heading">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <div className="octane-wired__give-var-targets">
                        {TARGET_BUTTONS.map((button) => (
                            <button
                                key={button.key}
                                type="button"
                                disabled={button.disabled}
                                className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${destinationTargetType === button.key ? 'is-active' : ''}`}
                                onClick={() => handleDestinationTargetChange(button.key)}
                            >
                                <img src={button.icon} alt={button.key} />
                            </button>
                        ))}
                    </div>
                </div>

                <WiredVariablePicker
                    entries={resolvedDestinationVariableEntries}
                    recentScope="variable-effects"
                    selectedToken={destinationVariableToken}
                    onSelect={(entry) => setDestinationVariableToken(entry.token)}
                />

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.operation')}</div>
                    <select
                        className="form-select form-select-sm octane-wired__give-var-select"
                        value={operation}
                        onChange={(event) => setOperation(parseInt(event.target.value, 10))}
                    >
                        {WIRED_VARIABLE_OPERATIONS.map((value) => (
                            <option key={value} value={value}>
                                {localizeWiredVariableOperation(value)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.reference_value')}</div>
                    <label className="octane-wired__change-var-radio">
                        <input checked={referenceMode === 'constant'} disabled={isUnaryOperation} type="radio" onChange={() => setReferenceMode('constant')} />
                        <Text>{LocalizeText('wiredfurni.params.operator.2')}</Text>
                        <OctaneInput
                            className="octane-wired__give-var-number"
                            disabled={isUnaryOperation}
                            type="text"
                            inputMode="numeric"
                            value={referenceConstantValueInput}
                            onChange={(event) => setReferenceConstantValueInput(event.target.value)}
                        />
                    </label>

                    <div className="octane-wired__change-var-reference-block">
                        <label className="octane-wired__change-var-radio">
                            <input
                                checked={referenceMode === 'variable'}
                                disabled={isUnaryOperation}
                                type="radio"
                                onChange={() => setReferenceMode('variable')}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variables.reference_value.from_variable')}</Text>
                            <div className="octane-wired__give-var-targets">
                                {TARGET_BUTTONS.map((button) => (
                                    <button
                                        key={`reference-${button.key}`}
                                        type="button"
                                        disabled={button.disabled || referenceMode !== 'variable'}
                                        className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${referenceTargetType === button.key ? 'is-active' : ''}`}
                                        onClick={() => handleReferenceTargetChange(button.key)}
                                    >
                                        <img src={button.icon} alt={button.key} />
                                    </button>
                                ))}
                            </div>
                        </label>

                        {referenceMode === 'variable' && (
                            <WiredVariablePicker
                                entries={resolvedReferenceVariableEntries}
                                recentScope="variable-effects"
                                selectedToken={referenceVariableToken}
                                onSelect={(entry) => setReferenceVariableToken(entry.token)}
                            />
                        )}
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">
                        {LocalizeText('wiredfurni.params.delay', ['seconds'], [GetWiredTimeLocale(actionDelay)])}
                    </div>
                    <Slider max={20} min={0} value={actionDelay} onChange={(event) => setActionDelay(event)} />
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.merged.title.variables_destination"
                        options={destinationSourceOptions}
                        value={destinationSelectedSourceValue}
                        selectionKind={destinationFurniSource === 101 ? "secondary" : "primary"}
                        selectionActive={activePickSlot === (destinationFurniSource === 101 ? 1 : 0)}
                        selectionCount={destinationFurniSource === 101 ? secondaryFurniIds.length : furniIds.length}
                        selectionLimit={selectionLimit}
                        selectionEnabledValues={[SOURCE_SELECTED, SOURCE_SECONDARY_SELECTED]}
                        showSelectionToggle={isFurniTarget(destinationTargetType)}
                        onChange={(value) => {
                            if (isFurniTarget(destinationTargetType)) {
                                setDestinationFurniSource(value);
                                if (value === 100 || value === 101) setActivePickSlot(value === 101 ? 1 : 0);
                                return;
                            }

                            if (!isGlobalTarget(destinationTargetType) && !isContextTarget(destinationTargetType)) setDestinationUserSource(value);
                        }}
                        onSelectionActivate={() => setActivePickSlot(destinationFurniSource === 101 ? 1 : 0)}
                    />
                </div>

                {referenceMode === 'variable' && (
                    <>
                        <div className="octane-wired__divider" />
                        <div className="octane-wired__give-var-section">
                            <WiredFurniSelectionSourceRow
                                title="wiredfurni.params.sources.merged.title.variables_reference"
                                options={referenceSourceOptions}
                                value={referenceSelectedSourceValue}
                                selectionKind={referenceFurniSource === 101 ? "secondary" : "primary"}
                                selectionActive={activePickSlot === (referenceFurniSource === 101 ? 1 : 0)}
                                selectionCount={referenceFurniSource === 101 ? secondaryFurniIds.length : furniIds.length}
                                selectionLimit={selectionLimit}
                                selectionEnabledValues={[SOURCE_SELECTED, SOURCE_SECONDARY_SELECTED]}
                                showSelectionToggle={isFurniTarget(referenceTargetType)}
                                onChange={(value) => {
                                    if (isFurniTarget(referenceTargetType)) {
                                        setReferenceFurniSource(value);
                                        if (value === 100 || value === 101) setActivePickSlot(value === 101 ? 1 : 0);
                                        return;
                                    }

                                    if (!isGlobalTarget(referenceTargetType) && !isContextTarget(referenceTargetType)) setReferenceUserSource(value);
                                }}
                                onSelectionActivate={() => setActivePickSlot(referenceFurniSource === 101 ? 1 : 0)}
                            />
                        </div>
                    </>
                )}
            </div>
        </WiredActionBaseView>
    );
};
