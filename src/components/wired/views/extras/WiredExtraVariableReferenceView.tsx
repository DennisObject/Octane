import { WiredEditorContext } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { OctaneInput } from '../../../../layout';
import { handleWiredVariableNameKeyDown, normalizeWiredVariableName, WIRED_VARIABLE_NAME_MAX } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';

type SharedContext = Extract<WiredEditorContext, { type: 4 }>;
type SharedRow = SharedContext['shared'][number];

/**
 * Owned: [read only]; text: the reference's name; variableIds[0]: the shared variable's id exactly as the
 * server sent it in the shared-variables context (roomId, room name and the variable block).
 */
export const WiredExtraVariableReferenceView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [readOnly, setReadOnly] = useState(true);
    const [selectedVariableId, setSelectedVariableId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

    const sharedRows: SharedRow[] = useMemo(() => {
        const shared = trigger?.contexts?.find((context): context is SharedContext => context.type === 4);

        return shared?.shared ?? [];
    }, [trigger]);

    const rooms = useMemo(() => {
        const byId = new Map<number, string>();

        for (const row of sharedRows) if (!byId.has(row.roomId)) byId.set(row.roomId, row.roomName);

        return [...byId.entries()].map(([roomId, roomName]) => ({ roomId, roomName }));
    }, [sharedRows]);

    const roomVariables = useMemo(() => sharedRows.filter((row) => row.roomId === selectedRoomId), [selectedRoomId, sharedRows]);

    useEffect(() => {
        if (!trigger) {
            setVariableName('');
            setReadOnly(true);
            setSelectedVariableId('');
            setSelectedRoomId(null);
            return;
        }

        const variableId = trigger.variableIds.length > 0 ? trigger.variableIds[0] : '';
        const row = sharedRows.find((entry) => entry.variable.variableId === variableId);

        setVariableName(normalizeWiredVariableName(trigger.stringData));
        setReadOnly(trigger.intData.length > 0 ? trigger.intData[0] === 1 : true);
        setSelectedVariableId(variableId);
        setSelectedRoomId(row?.roomId ?? null);
    }, [sharedRows, trigger]);

    const save = () => {
        setIntParams([readOnly ? 1 : 0]);
        setStringParam(normalizeWiredVariableName(variableName));
        setVariableIds([selectedVariableId || WIRED_VARIABLE_ABSENT]);
    };

    const validate = () => !!normalizeWiredVariableName(variableName).length && !!selectedVariableId;

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 300 }}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_name')}</Text>
                    <OctaneInput
                        maxLength={WIRED_VARIABLE_NAME_MAX}
                        type="text"
                        value={variableName}
                        onChange={(event) => setVariableName(normalizeWiredVariableName(event.target.value))}
                        onKeyDown={(event) => handleWiredVariableNameKeyDown(event, setVariableName)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.room')}</Text>
                    <select
                        className="form-select form-select-sm"
                        value={selectedRoomId ?? ''}
                        onChange={(event) => {
                            setSelectedRoomId(event.target.value === '' ? null : Number(event.target.value));
                            setSelectedVariableId('');
                        }}
                    >
                        <option value="">-</option>
                        {rooms.map((room) => (
                            <option key={room.roomId} value={room.roomId}>
                                {room.roomName}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable')}</Text>
                    <select className="form-select form-select-sm" value={selectedVariableId} onChange={(event) => setSelectedVariableId(event.target.value)}>
                        <option value="">-</option>
                        {roomVariables.map((row) => (
                            <option key={row.variable.variableId} value={row.variable.variableId}>
                                {row.variable.variableName}
                            </option>
                        ))}
                    </select>
                </div>
                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={readOnly} onChange={(event) => setReadOnly(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.variables.read_only')}</Text>
                </label>
            </div>
        </WiredExtraBaseView>
    );
};
