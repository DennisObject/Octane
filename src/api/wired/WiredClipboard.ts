import { ConditionDefinition, Triggerable, TriggerDefinition, WiredActionDefinition, WiredSelectorDefinition, WiredAddonDefinition, WiredVariableDefinition } from '@octane/renderer';

/** Which of the six holders a box belongs to; a clipboard entry only pastes into the same holder and code. */
export type WiredHolder = 'action' | 'condition' | 'trigger' | 'selector' | 'addon' | 'variable' | 'unknown';

/** What a box's settings look like off the box: the owned fields and counted arrays the save packet carries. */
export interface WiredClipboardEntry {
    key: string;
    intParams: number[];
    stringParam: string;
    furniIds: number[];
    delayInPulses: number;
    secondaryFurniIds?: number[];
    furniSources?: number[];
    userSources?: number[];
    variableIds?: string[];
    quantifier?: number;
    filter?: boolean;
    inverse?: boolean;
}

export interface WiredTriggerableData {
    intParams?: number[];
    stringParam?: string;
    furniIds?: number[];
    delayInPulses?: number;
    secondaryFurniIds?: number[];
    furniSources?: number[];
    userSources?: number[];
    variableIds?: string[];
    quantifier?: number;
    filter?: boolean;
    inverse?: boolean;
}

export const wiredHolderOf = (triggerable: Triggerable): WiredHolder => {
    if (triggerable instanceof WiredActionDefinition) return 'action';
    if (triggerable instanceof TriggerDefinition) return 'trigger';
    if (triggerable instanceof ConditionDefinition) return 'condition';

    if (triggerable instanceof WiredSelectorDefinition) return 'selector';
    if (triggerable instanceof WiredAddonDefinition) return 'addon';
    if (triggerable instanceof WiredVariableDefinition) return 'variable';
    return 'unknown';
};

/** The clipboard slot of a box: one per holder and code, so a copied "give score" only pastes into a "give score". */
export const wiredClipboardKeyOf = (triggerable: Triggerable): string => `${wiredHolderOf(triggerable)}:${triggerable?.code ?? 0}`;

/**
 * The same box with other settings. The definition classes keep their fields private behind
 * getters, so the copy keeps the prototype (every `instanceof` still holds) and only the four
 * data fields are replaced; the views re-read them because the object identity changed.
 */
export const withTriggerableData = <T extends Triggerable>(triggerable: T, data: WiredTriggerableData): T => {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(triggerable)), triggerable) as T;
    const fields = clone as unknown as Record<string, unknown>;

    if (data.intParams !== undefined) fields._intParams = [...data.intParams];
    if (data.stringParam !== undefined) fields._stringParam = data.stringParam;
    if (data.furniIds !== undefined) fields._stuffIds = [...data.furniIds];
    if (data.delayInPulses !== undefined && triggerable instanceof WiredActionDefinition) fields._delayInPulses = data.delayInPulses;

    if (data.secondaryFurniIds !== undefined) fields._secondaryItems = [...data.secondaryFurniIds];
    if (data.furniSources !== undefined) fields._furniSources = [...data.furniSources];
    if (data.userSources !== undefined) fields._userSources = [...data.userSources];
    if (data.variableIds !== undefined) fields._variableIds = [...data.variableIds];
    if (data.quantifier !== undefined && triggerable instanceof ConditionDefinition) fields._quantifier = data.quantifier;
    if (triggerable instanceof WiredSelectorDefinition) {
        if (data.filter !== undefined) fields._filter = data.filter;
        if (data.inverse !== undefined) fields._inverse = data.inverse;
    }
    return clone;
};

/** The box as it comes out of the catalog: no params, no text, no picks, no delay. */
export const resetTriggerableData = <T extends Triggerable>(triggerable: T): T =>
    withTriggerableData(triggerable, { intParams: triggerable.defaultIntParams, stringParam: '', furniIds: [], secondaryFurniIds: [], delayInPulses: 0, furniSources: triggerable.inputSources.furniDefaults, userSources: triggerable.inputSources.userDefaults, variableIds: [] });

/**
 * The box with a clipboard entry pasted in. "Paste into" keeps the box's own furni picks and
 * delay and takes only the settings, so a copied configuration lands on a box that already
 * points at its own furni.
 */
export const pasteTriggerableData = <T extends Triggerable>(triggerable: T, entry: WiredClipboardEntry, pasteInto: boolean): T =>
    pasteInto
        ? withTriggerableData(triggerable, { intParams: entry.intParams, stringParam: entry.stringParam, furniSources: entry.furniSources, userSources: entry.userSources, variableIds: entry.variableIds, quantifier: entry.quantifier, filter: entry.filter, inverse: entry.inverse })
        : withTriggerableData(triggerable, { intParams: entry.intParams, stringParam: entry.stringParam, furniSources: entry.furniSources, userSources: entry.userSources, variableIds: entry.variableIds, quantifier: entry.quantifier, filter: entry.filter, inverse: entry.inverse, furniIds: entry.furniIds, secondaryFurniIds: entry.secondaryFurniIds, delayInPulses: entry.delayInPulses });
