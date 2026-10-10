import type { IWiredVariableDiffEntry } from '@octane/renderer';

/** The picker's token prefix for a catalog variable; the rest of the token is the opaque server id. */
export const CUSTOM_VARIABLE_TOKEN_PREFIX = 'custom:';

/** The server's absent variable id: an unchosen variable slot always carries it, never an empty entry. */
export const WIRED_VARIABLE_ABSENT = 'n';

export type WiredNativeVariableScope = 'user' | 'furni' | 'global' | 'context';

/** AIR's merged variable target codes: furni 0, user 1, room -10, context -20. */
export const WIRED_NATIVE_VARIABLE_TARGET: Record<WiredNativeVariableScope, number> = { user: 1, furni: 0, context: -20, global: -10 };

export interface IWiredNativeVariableDefinition {
    variableId: string;
    name: string;
    availability: number;
    hasValue: boolean;
    isReadOnly: boolean;
    isTextConnected: boolean;
    textConnector: Array<{ key: number; value: string }>;
}

/** A picker token for a catalog variable, or empty when there is no id. */
export const createNativeVariableToken = (variableId: string) => (variableId ? `${CUSTOM_VARIABLE_TOKEN_PREFIX}${variableId}` : '');

/** The opaque variable id a token carries, exactly as the server sent it; empty when the token is not a variable. */
export const getNativeVariableId = (token: string) => (token?.startsWith(CUSTOM_VARIABLE_TOKEN_PREFIX) ? token.slice(CUSTOM_VARIABLE_TOKEN_PREFIX.length) : '');

/** A variable slot as the server stores it: the chosen catalog id, or the absent id when nothing is chosen. */
export const variableSlotOf = (token: string): string => getNativeVariableId(token) || WIRED_VARIABLE_ABSENT;

/** The picker token of a stored slot; the absent id reads as no selection. */
export const tokenOfVariableSlot = (slot: string | undefined): string => (slot && slot !== WIRED_VARIABLE_ABSENT ? createNativeVariableToken(slot) : '');

/** The catalog's variables of one scope, keyed by their opaque server id. */
export const nativeVariableDefinitions = (
    rows: ReadonlyMap<string, IWiredVariableDiffEntry> | undefined,
    scope: WiredNativeVariableScope
): IWiredNativeVariableDefinition[] => {
    if (!rows) return [];

    const definitions: IWiredNativeVariableDefinition[] = [];

    for (const entry of rows.values()) {
        const variable = entry.variable;

        if (variable.variableTarget !== WIRED_NATIVE_VARIABLE_TARGET[scope]) continue;

        definitions.push({
            variableId: variable.variableId,
            name: variable.variableName,
            availability: variable.availabilityType,
            hasValue: variable.hasValue,
            isReadOnly: !variable.canWriteValue,
            isTextConnected: !!variable.textConnector?.length,
            textConnector: variable.textConnector ?? []
        });
    }

    return definitions;
};
