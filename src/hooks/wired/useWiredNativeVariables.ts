import { useMemo } from 'react';
import { nativeVariableDefinitions } from '../../api/wired/WiredNativeVariables';
import { useWired } from './useWired';

/** The wired forms' variable definitions, read from the shared native catalog (never from the tools' numeric items). */
export const useWiredNativeVariables = () => {
    const { nativeCatalog = null } = useWired();
    const rows = nativeCatalog?.rows;

    return useMemo(
        () => ({
            userVariableDefinitions: nativeVariableDefinitions(rows, 'user'),
            furniVariableDefinitions: nativeVariableDefinitions(rows, 'furni'),
            roomVariableDefinitions: nativeVariableDefinitions(rows, 'global'),
            contextVariableDefinitions: nativeVariableDefinitions(rows, 'context')
        }),
        [rows]
    );
};
