import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { normalizeWiredVariableName, handleWiredVariableNameKeyDown, WIRED_VARIABLE_NAME_MAX } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * The quest box is itself a read-only user variable: owned [], text "variableName TAB questName", no variable ids.
 * Progress, target and completion are read through the variable it creates, not from the editor.
 */
export const WiredExtraQuestView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [questName, setQuestName] = useState('');

    useEffect(() => {
        if (!trigger) return;

        const [nextVariableName = '', nextQuestName = ''] = (trigger.stringData ?? '').split('\t');

        setVariableName(normalizeWiredVariableName(nextVariableName));
        setQuestName(nextQuestName);
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setVariableIds([]);
        setStringParam(`${normalizeWiredVariableName(variableName)}\t${questName.replace(/[\t\r\n]/g, '')}`);
    };

    const validate = () => !!normalizeWiredVariableName(variableName).length && !!questName.trim().length;

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text>{localizeWithFallback('wiredfurni.params.variables.quest_variable_name', 'Variable name')}</Text>
                    <OctaneInput
                        maxLength={WIRED_VARIABLE_NAME_MAX}
                        type="text"
                        value={variableName}
                        onChange={(event) => setVariableName(normalizeWiredVariableName(event.target.value))}
                        onKeyDown={(event) => handleWiredVariableNameKeyDown(event, setVariableName)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Text>{localizeWithFallback('wiredfurni.params.variables.quest_name', 'Quest name')}</Text>
                    <OctaneInput type="text" value={questName} onChange={(event) => setQuestName(event.target.value.replace(/[\t\r\n]/g, ''))} />
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
