import { useMemo } from 'react';
import { WiredNativeVariableScope } from '../../api/wired/WiredNativeVariables';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    IWiredVariablePickerEntry,
    WiredVariablePickerUsage
} from '../../components/wired/views/WiredVariablePickerData';
import { useWiredNativeVariables } from './useWiredNativeVariables';

/** The picker entries of one scope from the shared native catalog, with the chosen token kept in the list when the catalog lost it. */
export const useVariableScopeEntries = (scope: WiredNativeVariableScope, usage: WiredVariablePickerUsage, token: string): IWiredVariablePickerEntry[] => {
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const definitions = useMemo(
        () =>
            ({
                user: userVariableDefinitions,
                furni: furniVariableDefinitions,
                global: roomVariableDefinitions,
                context: contextVariableDefinitions
            })[scope],
        [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, scope, userVariableDefinitions]
    );
    const entries = useMemo(() => buildWiredVariablePickerEntries(scope, usage, definitions), [definitions, scope, usage]);

    return useMemo(() => {
        if (!token) return entries;
        if (flattenWiredVariablePickerEntries(entries).some((entry) => entry.token === token)) return entries;

        const fallbackEntry = createFallbackVariableEntry(scope, token);

        return fallbackEntry ? [fallbackEntry, ...entries] : entries;
    }, [entries, scope, token]);
};
