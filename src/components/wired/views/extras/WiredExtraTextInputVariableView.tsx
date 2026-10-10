import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { createNativeVariableToken, getNativeVariableId } from '../../../../api';
import { WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredPlaceholderPreview } from './WiredPlaceholderPreview';

interface IVariableDefinition {
    hasValue: boolean;
    isTextConnected: boolean;
    itemId: number;
    name: string;
}

const DISPLAY_NUMERIC = 1;
const DISPLAY_TEXTUAL = 2;
const DEFAULT_CAPTURER_NAME = '';
const MAX_CAPTURER_NAME_LENGTH = 32;
const PLACEHOLDER_WRAPPER_PATTERN = /^#(.*)#$/;

const normalizeDisplayType = (value: number) => (value === DISPLAY_TEXTUAL ? DISPLAY_TEXTUAL : DISPLAY_NUMERIC);
const normalizeCapturerName = (value: string) => {
    let normalizedValue = (value ?? '').trim().replace(/[\t\r\n]/g, '');

    if (PLACEHOLDER_WRAPPER_PATTERN.test(normalizedValue)) {
        normalizedValue = normalizedValue.substring(1, normalizedValue.length - 1).trim();
    }

    return normalizedValue.slice(0, MAX_CAPTURER_NAME_LENGTH);
};

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const WiredExtraTextInputVariableView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { contextVariableDefinitions = [] } = useWiredNativeVariables();
    const [variableToken, setVariableToken] = useState('');
    const [capturerName, setCapturerName] = useState(DEFAULT_CAPTURER_NAME);
    const [displayType, setDisplayType] = useState(DISPLAY_NUMERIC);

    const targetDefinitions = useMemo(() => contextVariableDefinitions.filter((definition) => !!definition.hasValue), [contextVariableDefinitions]);
    const variableEntries = useMemo(
        () => buildWiredVariablePickerEntries('context', 'change-reference', targetDefinitions).filter((entry) => entry.kind === 'custom'),
        [targetDefinitions]
    );
    const resolvedVariableEntries = useMemo(() => {
        if (!variableToken || !getNativeVariableId(variableToken)) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === variableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry('context', variableToken);

        return fallbackEntry && fallbackEntry.kind === 'custom' ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [variableEntries, variableToken]);

    const selectedVariableDefinition = useMemo(() => {
        const variableId = getNativeVariableId(variableToken);

        if (!variableId) return null;

        return targetDefinitions.find((definition) => definition.variableId === variableId) ?? null;
    }, [targetDefinitions, variableToken]);

    const canUseTextDisplay = !!selectedVariableDefinition?.isTextConnected;

    useEffect(() => {
        if (!trigger) return;

        setVariableToken(tokenOfVariableSlot(trigger.variableIds[0]));
        setCapturerName(normalizeCapturerName(trigger.stringData));
        setDisplayType(normalizeDisplayType(trigger.intData.length > 0 ? trigger.intData[0] : DISPLAY_NUMERIC));
    }, [trigger]);

    useEffect(() => {
        if (canUseTextDisplay || displayType !== DISPLAY_TEXTUAL) return;

        setDisplayType(DISPLAY_NUMERIC);
    }, [canUseTextDisplay, displayType]);

    const previewToken = useMemo(() => {
        const effectiveName = normalizeCapturerName(capturerName) || 'capturer';

        return `#${effectiveName}#`;
    }, [capturerName]);

    const previewHtml = useMemo(() => LocalizeText('wiredfurni.params.texts.placeholder_preview', ['placeholder'], [escapeHtml(previewToken)]), [previewToken]);

    const save = () => {
        setIntParams([canUseTextDisplay ? normalizeDisplayType(displayType) : DISPLAY_NUMERIC]);
        setStringParam(normalizeCapturerName(capturerName));
        setVariableIds([variableSlotOf(variableToken)]);
    };

    const validate = () => !!normalizeCapturerName(capturerName).length && !!getNativeVariableId(variableToken);

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
            cardStyle={{ width: 400 }}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.texts.capturer_name')}</Text>
                    <OctaneInput
                        maxLength={MAX_CAPTURER_NAME_LENGTH}
                        type="text"
                        value={capturerName}
                        onChange={(event) => setCapturerName(normalizeCapturerName(event.target.value))}
                    />
                </div>

                <WiredPlaceholderPreview previewHtml={previewHtml} previewToken={previewToken} />

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <WiredVariablePicker
                        entries={resolvedVariableEntries}
                        recentScope="variable-text-input"
                        selectedToken={variableToken}
                        onSelect={(entry) => setVariableToken(entry.token)}
                    />
                    {!targetDefinitions.length && <Text small>{'No wf_var_context variables with value found in this room.'}</Text>}
                </div>

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.texts.variable_input_type')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={displayType === DISPLAY_NUMERIC}
                            className="form-check-input"
                            name="wiredTextInputVariableType"
                            type="radio"
                            onChange={() => setDisplayType(DISPLAY_NUMERIC)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.texts.variable_display_type.1')}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={displayType === DISPLAY_TEXTUAL}
                            className="form-check-input"
                            disabled={!canUseTextDisplay}
                            name="wiredTextInputVariableType"
                            type="radio"
                            onChange={() => setDisplayType(DISPLAY_TEXTUAL)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.texts.variable_display_type.2')}</Text>
                    </label>
                    <Text small>{LocalizeText('wiredfurni.params.texts.variable_display_type.2.info')}</Text>
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
