import { useMemo } from 'react';
import { entryText, FurniEditorDetail, FurniItem } from './furniEditorData';
import { EditField, EditForm, furnidataStructureDiff, HOTEL_UNSUPPORTED_FIELDS } from './furniEditorForm';
import {
    expectationsForType,
    multiheightMismatch,
    relateRows,
    RelatedRow,
    spriteIdMismatch,
    Suggestion,
    suggestFromFurnidata,
    suggestFromSiblings,
    suggestInteractionType
} from './furniEditorSuggestions';
import { useFurniAssetChecks } from './useFurniAssetChecks';

/** Server column limit of items_base.public_name (FurniEditorUpdatePayload). */
const PUBLIC_NAME_MAX = 56;

/**
 * - editable: the entry was resolved for this classname, so it can be edited;
 * - missing: no entry for this classname; PlusEMU only edits existing entries, so nothing to write;
 * - locked: an entry resolved by id for another classname, left alone to avoid an id collision;
 * - unconfigured: the hotel has no furnidata file configured (diagnostic source_missing).
 */
export type FurnidataState = 'editable' | 'missing' | 'locked' | 'unconfigured';

/**
 * Everything the sheet can tell about the open furni beyond its own columns:
 * the furnidata state, suggestions and warnings, the line siblings and
 * duplicates, and the asset checks.
 */
export const useFurniEditorInsights = (detail: FurniEditorDetail, form: EditForm, stored: EditForm, interactions: string[], relatedItems: FurniItem[]) => {
    const { item, furniDataEntry: entry, furniDataDiagnostic: diagnostic } = detail;
    const { assetStates, assets } = useFurniAssetChecks(item.itemName);

    const furnidataState = useMemo<FurnidataState>(() => {
        if (!entry) return diagnostic?.reason === 'source_missing' ? 'unconfigured' : 'missing';

        const classname = entryText(entry, 'classname').trim().toLowerCase();

        return !classname || classname === item.itemName.trim().toLowerCase() ? 'editable' : 'locked';
    }, [entry, diagnostic, item.itemName]);

    const isEditable = furnidataState === 'editable';
    const furnidataReason = diagnostic?.reason || 'not_found';

    const related = useMemo(() => relateRows(relatedItems, item), [relatedItems, item]);

    const duplicates = useMemo(() => {
        const byId = new Map<number, RelatedRow>();

        for (const row of [...related.duplicateNames, ...related.duplicateSprites]) byId.set(row.id, row);

        return [...byId.values()];
    }, [related]);

    // The server lists the interaction types it has a class for; a stored type
    // outside that list is one the item manager maps to default and the server
    // refuses to save, so the sheet flags it.
    const interactionUnregistered = useMemo(() => {
        const type = form.interactionType.trim().toLowerCase();

        return type !== '' && !interactions.some((known) => known.toLowerCase() === type);
    }, [form.interactionType, interactions]);

    const suggestedType = useMemo(() => {
        const match = suggestInteractionType(item.itemName, interactions);

        return !match || match.type.toLowerCase() === form.interactionType.trim().toLowerCase() ? null : match;
    }, [item.itemName, interactions, form.interactionType]);

    // Furnidata is trusted only when its entry matches this classname; the type
    // table and the asset count apply to whatever type is in the form.
    const { suggestions, warnings } = useMemo(() => {
        const all: Suggestion[] = isEditable ? suggestFromFurnidata(entry, form) : [];
        const typed = expectationsForType(form);

        all.push(...typed.suggestions);

        for (const suggestion of suggestFromSiblings(related.siblings, form)) {
            if (!all.some((existing) => existing.field === suggestion.field)) all.push(suggestion);
        }

        if (assetStates !== null && assetStates > 0 && assetStates !== form.interactionModesCount) {
            const fromType = typed.suggestions.some((s) => s.field === 'interactionModesCount' && s.value === assetStates);

            if (!fromType)
                all.push({
                    field: 'interactionModesCount',
                    value: assetStates,
                    reason: { key: 'furni.editor.reason.asset_states', values: { count: assetStates } }
                });
        }

        const mismatch = multiheightMismatch(form, assetStates);
        const supported = ({ field }: { field: EditField }) => !HOTEL_UNSUPPORTED_FIELDS.has(field);

        return { suggestions: all.filter(supported), warnings: (mismatch ? [...typed.warnings, mismatch] : typed.warnings).filter(supported) };
    }, [isEditable, entry, form, assetStates, related.siblings]);

    // A furnidata entry found by classname but carrying another id: the room
    // resolves the sprite through that id, so it draws a different furni.
    const furnidataIdMismatch = useMemo(() => (isEditable ? spriteIdMismatch(entry, item.spriteId) : null), [isEditable, entry, item.spriteId]);

    const structureDiff = useMemo(() => (isEditable ? furnidataStructureDiff(entry, stored) : []), [isEditable, entry, stored]);

    // A one-click fill of an empty items_base.public_name from the furnidata name.
    const entryName = entryText(entry, 'name').trim();
    const canSyncPublicName = isEditable && !item.publicName.trim() && !!entryName && entryName.length <= PUBLIC_NAME_MAX;

    return {
        furnidataState,
        furnidataReason,
        related,
        duplicates,
        interactionUnregistered,
        suggestedType,
        suggestions,
        warnings,
        furnidataIdMismatch,
        structureDiff,
        canSyncPublicName,
        assets
    };
};

export type FurniEditorInsights = ReturnType<typeof useFurniEditorInsights>;
