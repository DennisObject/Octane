import {
    GetCommunication, GetRoomEngine, IConnection, IRoomObjectController, OctaneEventType,
    RoomEngineEvent, RoomObjectCategory, RoomSessionEvent,
    WiredVariableInspectionDataEvent, WiredVariableInspectionRequestComposer
} from '@octane/renderer';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useConnectionState, useMessageEvent, useOctaneEvent } from '../events';

// The counter outlives panel mounts. IDs are never reused on this connection.
const requestSequences = new WeakMap<IConnection, { next: number }>();

export const useWiredFurniInspection = (roomId: number, entityId: number, object: IRoomObjectController | null, enabled: boolean) => {
    const connection = GetCommunication().connection;
    const connectionState = useConnectionState();
    const [epoch, setEpoch] = useState(0);
    const pending = useRef<{ requestId: number; started: number } | null>(null);
    const [result, setResult] = useState<{ roomId: number; entityId: number; object: IRoomObjectController; values: ReadonlyMap<string, bigint> } | null>(null);
    const available = enabled && connectionState.authenticated && connectionState.phase === 'connected' && !!object && roomId > 0 && entityId > 0;
    const currentObject = useCallback(() => available && GetCommunication().connection === connection && GetRoomEngine().getRoomObject(roomId, entityId, RoomObjectCategory.WALL) === object,
        [available, connection, roomId, entityId, object]);
    const invalidate = useCallback(() => {
        pending.current = null;
        setResult(null);
    }, []);
    const request = useCallback(() => {
        if(!currentObject()) {
            invalidate();
            return;
        }
        if(pending.current && Date.now() - pending.current.started < 5000) return;
        if(pending.current) invalidate();

        let sequence = requestSequences.get(connection);
        if(!sequence) {
            sequence = { next: 1 };
            requestSequences.set(connection, sequence);
        }
        if(sequence.next > 2147483647) {
            invalidate();
            return;
        }

        const requestId = sequence.next++;
        pending.current = { requestId, started: Date.now() };
        SendMessageComposer(new WiredVariableInspectionRequestComposer(requestId, roomId, entityId));
    }, [connection, currentObject, invalidate, roomId, entityId]);

    useMessageEvent<WiredVariableInspectionDataEvent>(WiredVariableInspectionDataEvent, useCallback(event => {
        const parser = event.getParser();
        if(event.connection !== connection || !parser || !pending.current || parser.requestId !== pending.current.requestId
            || parser.roomId !== roomId || parser.entityId !== entityId || parser.target !== 1 || parser.domain !== 1) return;
        pending.current = null;
        if(!currentObject() || parser.status !== 0) {
            setResult(null);
            return;
        }
        setResult({ roomId, entityId, object, values: parser.values });
    }, [connection, currentObject, roomId, entityId, object]));

    const refresh = useCallback(() => {
        invalidate();
        request();
    }, [invalidate, request]);
    // Room-wide custom-variable snapshots do not invalidate this selected wall's read.
    // The poll observes placement changes; explicit write refresh clears prior values.

    useOctaneEvent([OctaneEventType.SOCKET_CLOSED, OctaneEventType.SOCKET_RECONNECTING, OctaneEventType.SOCKET_REAUTHENTICATED], useCallback(() => {
        invalidate();
        setEpoch(value => value + 1);
    }, [invalidate]));
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, useCallback(event => {
        if(event.roomId === roomId) invalidate();
    }, [invalidate, roomId]));
    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, useCallback(event => {
        if(event.session?.roomId === roomId) invalidate();
    }, [invalidate, roomId]));

    useLayoutEffect(() => {
        invalidate();
        return invalidate;
    }, [available, connection, roomId, entityId, object, epoch, invalidate]);
    useEffect(() => {
        if(!available) return;
        request();
        // Native inspection polls at 500ms; geometry rendering can tick faster.
        const interval = window.setInterval(request, 500);
        return () => window.clearInterval(interval);
    }, [available, request, epoch]);

    const values = result && currentObject() && result.roomId === roomId && result.entityId === entityId && result.object === object
        ? result.values : null;
    return { values, refresh };
};
