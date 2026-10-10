import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { createNativeVariableToken, getNativeVariableId } from '../../../../api';
import { WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MAX_NAME_LENGTH = 40;

type EchoSourceTarget = 'user' | 'furni' | 'global';

const TARGET_BUTTONS: Array<{ key: EchoSourceTarget; icon: string }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon }
];

const normalizeVariableName = (value: string) => {
    let normalizedValue = (value ?? '').replace(/[\t\r\n]/g, '');

    if (normalizedValue.includes('=')) normalizedValue = normalizedValue.substring(0, normalizedValue.indexOf('=')).trim();

    while (normalizedValue.startsWith('@') || normalizedValue.startsWith('~')) {
        normalizedValue = normalizedValue.substring(1);
    }

    normalizedValue = normalizedValue.replace(/\s+/g, '_');
    normalizedValue = normalizedValue.replace(/[^A-Za-z0-9_]/g, '');

    return normalizedValue.slice(0, MAX_NAME_LENGTH);
};

const handleVariableNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, setValue: (value: string) => void) => {
    if (event.key !== ' ') return;

    event.preventDefault();

    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const nextValue = `${input.value.substring(0, start)}_${input.value.substring(end)}`;

    setValue(normalizeVariableName(nextValue));

    window.requestAnimationFrame(() => input.setSelectionRange(Math.min(start + 1, input.value.length + 1), Math.min(start + 1, input.value.length + 1)));
};

export const WiredExtraVariableEchoView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [] } = useWiredNativeVariables();
    const [variableName, setVariableName] = useState('');
    const [sourceTargetType, setSourceTargetType] = useState<EchoSourceTarget>('user');
    const [sourceVariableToken, setSourceVariableToken] = useState('');

    const targetDefinitions = useMemo(() => {
        switch (sourceTargetType) {
            case 'furni':
                return furniVariableDefinitions;
            case 'global':
                return roomVariableDefinitions;
            default:
                return userVariableDefinitions;
        }
    }, [furniVariableDefinitions, roomVariableDefinitions, sourceTargetType, userVariableDefinitions]);

    const variableEntries = useMemo(() => buildWiredVariablePickerEntries(sourceTargetType, 'echo', targetDefinitions), [sourceTargetType, targetDefinitions]);
    const resolvedVariableEntries = useMemo(() => {
        if (!sourceVariableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === sourceVariableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(sourceTargetType, sourceVariableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [sourceTargetType, sourceVariableToken, variableEntries]);

    const selectedEntry = useMemo(
        () => flattenWiredVariablePickerEntries(resolvedVariableEntries).find((entry) => entry.token === sourceVariableToken) ?? null,
        [resolvedVariableEntries, sourceVariableToken]
    );

    useEffect(() => {
        if (!trigger) {
            setVariableName('');
            setSourceTargetType('user');
            setSourceVariableToken('');
            return;
        }

        // The echo's owned list is empty: its target is the catalog target of the variable it names.
        const variableId = trigger.variableIds.length > 0 ? trigger.variableIds[0] : '';
        const owner = variableId
            ? ([['user', userVariableDefinitions], ['furni', furniVariableDefinitions], ['global', roomVariableDefinitions]] as const).find(
                  ([, definitions]) => definitions.some((definition) => definition.variableId === variableId)
              )
            : undefined;

        setVariableName(normalizeVariableName(trigger.stringData));
        setSourceTargetType(owner ? owner[0] : 'user');
        setSourceVariableToken(variableId ? createNativeVariableToken(variableId) : '');
    }, [furniVariableDefinitions, roomVariableDefinitions, trigger, userVariableDefinitions]);

    const save = () => {
        setIntParams([]);
        setStringParam(normalizeVariableName(variableName));
        setVariableIds([variableSlotOf(sourceVariableToken)]);
    };

    const validate = () => !!sourceVariableToken;

    const handleTargetTypeChange = (nextValue: EchoSourceTarget) => {
        if (nextValue === sourceTargetType) return;

        setSourceTargetType(nextValue);
        setSourceVariableToken('');
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
            cardStyle={{ width: 244 }}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_name')}</Text>
                    <OctaneInput
                        maxLength={MAX_NAME_LENGTH}
                        type="text"
                        value={variableName}
                        onChange={(event) => setVariableName(normalizeVariableName(event.target.value))}
                        onKeyDown={(event) => handleVariableNameKeyDown(event, setVariableName)}
                    />
                </div>

                <div className="octane-wired__give-var-heading">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <div className="octane-wired__give-var-targets">
                        {TARGET_BUTTONS.map((button) => (
                            <button
                                key={button.key}
                                type="button"
                                className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${sourceTargetType === button.key ? 'is-active' : ''}`}
                                onClick={() => handleTargetTypeChange(button.key)}
                            >
                                <img src={button.icon} alt={button.key} />
                            </button>
                        ))}
                    </div>
                </div>

                <WiredVariablePicker
                    entries={resolvedVariableEntries}
                    recentScope="variable-echo"
                    selectedToken={sourceVariableToken}
                    onSelect={(entry) => setSourceVariableToken(entry.token)}
                />
            </div>
        </WiredExtraBaseView>
    );
};
