import {
    GetCommunication, GetRoomEngine, IConnection, IRoomObjectController, IRoomSession, OctaneEventType,
    parseWiredInt64, RoomEngineEvent, RoomEngineObjectEvent, RoomObjectCategory, RoomSessionEvent,
    WiredRoomSettingsDataEvent, WiredUserVariableUpdate64Composer, WiredVariableInspectionDataEvent,
    WiredVariableInspectionRequestComposer
} from '@octane/renderer';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GetRoomSession, SendMessageComposer } from '../../api';
import { useConnectionState, useMessageEvent, useOctaneEvent } from '../events';

// Outlives every panel mount and reauthentication on the actual connection. Never reset or wrap.
const sequences = new WeakMap<IConnection, { next: number }>();
const EDITABLE = new Set(['@rotation', '@altitude', '@wallitem_offset']);

interface Context {
    connection: IConnection;
    roomSession: IRoomSession | null;
    entityId: number;
    object: IRoomObjectController | null;
}

interface Authority extends Context {
    generation: number;
    values: ReadonlyMap<string, bigint>;
}

export const useWiredFurniInspection = (roomSession: IRoomSession | null, entityId: number,
    object: IRoomObjectController | null, enabled: boolean, canModify: boolean, isCurrentSelection: () => boolean) => {
    const connection = GetCommunication().connection;
    const connectionState = useConnectionState();
    const roomId = roomSession?.roomId ?? 0;
    const [epoch, setEpoch] = useState(0);
    const [result, setResult] = useState<Authority | null>(null);
    const generation = useRef(0);
    const pending = useRef<(Context & { requestId: number; generation: number; timer: number }) | null>(null);
    const authority = useRef<Authority | null>(null);
    const rights = useRef({ inspect: enabled, modify: canModify });
    const lifecycleLost = useRef(false);

    const invalidate = useCallback(() => {
        generation.current++;
        if(pending.current) window.clearTimeout(pending.current.timer);
        pending.current = null;
        authority.current = null;
        setResult(null);
    }, []);

    const live = useCallback(() => enabled && rights.current.inspect && !lifecycleLost.current
        && connection.connectionState.authenticated && connection.connectionState.phase === 'connected'
        && GetCommunication().connection === connection && !!roomSession && GetRoomSession() === roomSession
        && roomId > 0 && entityId > 0 && !!object && isCurrentSelection()
        && GetRoomEngine().getRoomObject(roomId, entityId, RoomObjectCategory.WALL) === object,
    [enabled, connection, roomSession, roomId, entityId, object, isCurrentSelection]);

    const sameContext = useCallback((captured: Context) => captured.connection === connection
        && captured.roomSession === roomSession && captured.entityId === entityId && captured.object === object,
    [connection, roomSession, entityId, object]);

    const request = useCallback(() => {
        if(!live()) {
            invalidate();
            return;
        }
        if(pending.current) return;
        let sequence = sequences.get(connection);
        if(!sequence) {
            sequence = { next: 1 };
            sequences.set(connection, sequence);
        }
        if(sequence.next > 2147483647) {
            invalidate();
            return;
        }
        const requestId = sequence.next++;
        const capturedGeneration = generation.current;
        const timer = window.setTimeout(() => {
            if(pending.current?.requestId === requestId && pending.current.connection === connection
                && pending.current.generation === capturedGeneration) invalidate();
        }, 5000);
        pending.current = { requestId, generation: capturedGeneration, timer, connection, roomSession, entityId, object };
        try {
            if((SendMessageComposer(new WiredVariableInspectionRequestComposer(requestId, roomId, entityId)) as unknown) === false) invalidate();
        }
        catch {
            invalidate();
        }
    }, [connection, roomSession, entityId, object, roomId, live, invalidate]);

    useMessageEvent<WiredVariableInspectionDataEvent>(WiredVariableInspectionDataEvent, useCallback(event => {
        const parser = event.getParser();
        const expected = pending.current;
        if(event.connection !== connection || !parser || !expected || parser.requestId !== expected.requestId
            || parser.roomId !== roomId || parser.entityId !== entityId || parser.target !== 1 || parser.domain !== 1) return;
        if(expected.generation !== generation.current || !sameContext(expected) || !live() || parser.status !== 0) {
            invalidate();
            return;
        }
        window.clearTimeout(expected.timer);
        pending.current = null;
        const next = { generation: generation.current, values: new Map(parser.values), connection, roomSession, entityId, object };
        authority.current = next;
        setResult(next);
    }, [connection, roomSession, roomId, entityId, object, sameContext, live, invalidate]));

    // Observed permission changes revoke old admission synchronously, before a React commit.
    // Silent server-only changes are enforced independently by the read/write handlers.
    useMessageEvent<WiredRoomSettingsDataEvent>(WiredRoomSettingsDataEvent, useCallback(event => {
        const parser = event.getParser();
        if(event.connection !== connection || parser.roomId !== roomId || GetRoomSession() !== roomSession) return;
        rights.current = { inspect: parser.canInspect, modify: parser.canModify };
        if(!parser.canInspect || !parser.canModify) invalidate();
    }, [connection, roomId, roomSession, invalidate]));

    const loseLifecycle = useCallback(() => {
        lifecycleLost.current = true;
        invalidate();
    }, [invalidate]);
    useOctaneEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.REMOVED, useCallback(event => {
        if(event.roomId === roomId && event.objectId === entityId && event.category === RoomObjectCategory.WALL) loseLifecycle();
    }, [roomId, entityId, loseLifecycle]));
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, useCallback(event => {
        if(event.roomId === roomId) loseLifecycle();
    }, [roomId, loseLifecycle]));
    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, useCallback(event => {
        if(event.session === roomSession) loseLifecycle();
    }, [roomSession, loseLifecycle]));
    useOctaneEvent([OctaneEventType.SOCKET_CLOSED, OctaneEventType.SOCKET_RECONNECTING, OctaneEventType.SOCKET_REAUTHENTICATED], useCallback(() => {
        loseLifecycle();
        setEpoch(value => value + 1);
    }, [loseLifecycle]));

    useLayoutEffect(() => {
        invalidate();
        lifecycleLost.current = false;
        rights.current = { inspect: enabled, modify: canModify };
        return () => {
            generation.current++;
            if(pending.current) window.clearTimeout(pending.current.timer);
            pending.current = null;
            authority.current = null;
        };
    }, [connection, roomSession, entityId, object, enabled, canModify, isCurrentSelection, epoch, invalidate]);
    useEffect(() => {
        if(!enabled || !connectionState.authenticated || connectionState.phase !== 'connected') return;
        request();
        const timer = window.setInterval(request, 500);
        return () => window.clearInterval(timer);
    }, [enabled, connectionState.authenticated, connectionState.phase, request, epoch]);

    const write = useCallback((token: string, input: string): boolean => {
        if(!EDITABLE.has(token) || !rights.current.modify || !live()
            || !authority.current || !sameContext(authority.current) || authority.current.generation !== generation.current) {
            invalidate();
            return false;
        }
        const value = parseWiredInt64(input);
        if(value < -2147483648n || value > 2147483647n) throw new RangeError('This builtin requires a signed 32-bit whole number.');
        if(token === '@rotation' && value !== 0n && value !== 1n) throw new RangeError('Wall side must be 0 or 1.');
        if(token === '@wallitem_offset' && value < 0n) throw new RangeError('Wall offset must be nonnegative.');
        // No optimistic placement or acknowledgement: 10110 has no inspection ticket/CAS.
        invalidate();
        try {
            if((SendMessageComposer(new WiredUserVariableUpdate64Composer(1, entityId, 0, value, 'internal:' + token)) as unknown) === false) return false;
        }
        catch {
            return false;
        }
        request();
        return true;
    }, [entityId, sameContext, live, invalidate, request]);

    // Pending passive reads and unrelated 9480 snapshots keep the displayed authority and draft.
    // Timeout/refusal/lifecycle loss clear it; receiving a fresh read is not a write acknowledgement.
    const values = result && result.generation === generation.current && sameContext(result) && live() ? result.values : null;
    return { values, canEdit: !!values && rights.current.modify, write };
};
