import {
    GetCommunication, OctaneEventType, RoomEngineEvent, RoomSessionEvent,
    WiredAllVariablesRequestComposer, WiredVariableHashesComposer, WiredAllVariablesHashEvent,
    WiredAllVariablesDiffEvent, WiredRoomSettingsDataEvent, WiredCatalogParseFailureEvent
} from '@octane/renderer';
import { useCallback, useEffect, useMemo } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetRoomSession, SendMessageComposer } from '../../api';
import { useConnectionState, useMessageEvent, useOctaneEvent } from '../events';
import { WiredCatalogProvider } from './WiredCatalogProvider';

const useWiredCatalogState = () => {
    const connection = GetCommunication().connection;
    const state = useConnectionState();
    const provider = useMemo(() => new WiredCatalogProvider(
        () => (SendMessageComposer(new WiredAllVariablesRequestComposer()) as unknown) !== false,
        entries => (SendMessageComposer(new WiredVariableHashesComposer(entries.map(([variableId, hash]) => ({ variableId, hash })))) as unknown) !== false), []);
    const bind = useCallback((allowed: boolean) => {
        const current = GetCommunication().connection;
        provider.bind(GetRoomSession(), current,
            current === connection && current.connectionState.authenticated && current.connectionState.phase === 'connected' && allowed);
    }, [provider, connection]);

    useMessageEvent<WiredAllVariablesHashEvent>(WiredAllVariablesHashEvent, event => {
        if(event.connection !== GetCommunication().connection) return;
        provider.receiveHash(event.getParser().allVariablesHash, GetRoomSession(), event.connection);
    });
    useMessageEvent<WiredAllVariablesDiffEvent>(WiredAllVariablesDiffEvent, event => {
        if(event.connection !== GetCommunication().connection) return;
        const parser = event.getParser();
        provider.receiveDiff(parser.allVariablesHash, parser.isLastChunk, parser.removedVariables,
            parser.addedOrUpdated, GetRoomSession(), event.connection);
    });
    useMessageEvent<WiredRoomSettingsDataEvent>(WiredRoomSettingsDataEvent, event => {
        const room = GetRoomSession();
        if(event.connection !== GetCommunication().connection || event.getParser().roomId !== room?.roomId) return;
        bind(event.getParser().canInspect);
    });
    useOctaneEvent<WiredCatalogParseFailureEvent>(WiredCatalogParseFailureEvent.TYPE, event => {
        if(event.connection !== GetCommunication().connection) return;
        provider.rejectCatalogFrame(event.header, GetRoomSession(), event.connection);
    });
    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, event => provider.endRoom(event.session));
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, event => {
        provider.disposeRoom(event.roomId);
    });
    useOctaneEvent([OctaneEventType.SOCKET_CLOSED, OctaneEventType.SOCKET_RECONNECTING, OctaneEventType.SOCKET_REAUTHENTICATED],
        () => provider.invalidate());
    useEffect(() => {
        if(!state.authenticated || state.phase !== 'connected') provider.invalidate();
        return () => provider.invalidate();
    }, [connection, state.authenticated, state.phase, provider]);
    return { provider, bind };
};

export const useWiredCatalog = () => useSharedHook(useWiredCatalogState);
registerSharedHook(useWiredCatalogState);
