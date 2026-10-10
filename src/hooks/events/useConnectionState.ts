import { GetCommunication, IConnectionStateSnapshot, VoltEventType } from '@volt/renderer';
import { useCallback, useState } from 'react';
import { useVoltEvent } from './useVoltEvent';

const readConnectionState = (): Readonly<IConnectionStateSnapshot> => GetCommunication().connection.connectionState;

export const useConnectionState = (): Readonly<IConnectionStateSnapshot> => {
    const [snapshot, setSnapshot] = useState(readConnectionState);
    const refresh = useCallback(() => setSnapshot(readConnectionState()), []);

    useVoltEvent(VoltEventType.CONNECTION_STATE_CHANGED, refresh);

    return snapshot;
};
