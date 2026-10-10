import { WIRED_NATIVE_VARIABLE_TARGET, WiredNativeVariableScope } from './WiredNativeVariables';

/** The scope a native variable target code stands for; an unknown code reads as the user's. */
export const scopeOfTargetCode = (code: number | undefined): WiredNativeVariableScope =>
    (Object.keys(WIRED_NATIVE_VARIABLE_TARGET) as WiredNativeVariableScope[]).find((scope) => WIRED_NATIVE_VARIABLE_TARGET[scope] === code) ?? 'user';

export const targetCodeOfScope = (scope: WiredNativeVariableScope): number => WIRED_NATIVE_VARIABLE_TARGET[scope];
