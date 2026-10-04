import { useCallback } from 'react';
import { LocalizeText } from '../../api';
import { FurniEditorDetail, entryText } from './furniEditorData';
import { changesPayload, EditForm, fieldLabelKey, PLACEMENT_FIELDS } from './furniEditorForm';
import type { Suggestion } from './furniEditorSuggestions';
import { formatFurniEditorValue, furniEditorText } from './furniEditorText';
import { useFurniEditorActions } from './useFurniEditorActions';
import { useFurniEditorConfirm } from './useFurniEditorConfirm';
import type { FurniEditorFormApi } from './useFurniEditorForm';
import type { FurniEditorInsights } from './useFurniEditorInsights';
import type { FurnidataDraftApi } from './useFurnidataDraft';
import type { FurniEditorRights } from './useFurniEditorRights';

const change = (label: string, from: unknown, to: unknown) => `${label}: ${formatFurniEditorValue(from)} → ${formatFurniEditorValue(to)}`;

/**
 * What the buttons of the edit sheet do. Every write that changes data for
 * the whole hotel is confirmed first; the store refuses a second write while
 * one is pending, so a double click never sends twice.
 */
export const useFurniEditorSheetActions = (
    detail: FurniEditorDetail,
    form: EditForm,
    stored: EditForm,
    sheet: FurniEditorFormApi,
    draft: FurnidataDraftApi,
    insights: FurniEditorInsights,
    rights: FurniEditorRights
) => {
    const { item, furniDataEntry } = detail;
    const { updateItem, deleteItem, updateFurnidata, updateFurnidataStructure, revertFurnidata, syncPublicName, importText } = useFurniEditorActions();
    const confirm = useFurniEditorConfirm();
    const { changedFields, isValid, isDirty, rememberSave, setField, applyValues } = sheet;
    const displayName = draft.name || item.publicName || item.itemName;
    const { canEditFurnidata, canDelete } = rights;

    const save = useCallback(() => {
        if (!isValid || !isDirty) return;

        const changes = changesPayload(form, stored);
        const details = ['', ...changedFields.map((field) => change(LocalizeText(fieldLabelKey(field)), stored[field], form[field]))];

        if (item.usageCount > 0 && changedFields.some((field) => PLACEMENT_FIELDS.has(field))) {
            details.push('', furniEditorText('furni.editor.confirm.save.placed', { count: item.usageCount }));
        }

        confirm(
            {
                titleKey: 'furni.editor.confirm.save.title',
                messageKey: 'furni.editor.confirm.save.message',
                confirmKey: 'furni.editor.confirm.save.button',
                values: { count: changedFields.length, name: displayName, id: item.id },
                details
            },
            () => {
                if (updateItem(item.id, changes)) rememberSave(changes);
            }
        );
    }, [isValid, isDirty, form, stored, changedFields, item, displayName, confirm, updateItem, rememberSave]);

    const remove = useCallback(() => {
        if (!canDelete || item.usageCount > 0) return;

        confirm(
            {
                titleKey: 'furni.editor.confirm.delete.title',
                messageKey: 'furni.editor.confirm.delete.message',
                confirmKey: 'furni.editor.confirm.delete.button',
                values: { name: displayName, id: item.id }
            },
            () => deleteItem(item.id)
        );
    }, [canDelete, item, displayName, confirm, deleteItem]);

    const saveFurnidata = useCallback(() => {
        // PlusEMU only edits entries that exist, so only an editable entry is written.
        if (!canEditFurnidata || insights.furnidataState !== 'editable' || !draft.isDirty) return;

        const name = draft.name;

        confirm(
            {
                titleKey: 'furni.editor.confirm.furnidata.title',
                messageKey: 'furni.editor.confirm.furnidata.message',
                confirmKey: 'furni.editor.confirm.furnidata.button',
                values: { classname: item.itemName },
                details: [
                    '',
                    change(LocalizeText('furni.editor.names.display_name'), draft.storedName, name),
                    change(LocalizeText('furni.editor.names.description'), draft.storedDescription, draft.description)
                ]
            },
            () => {
                if (updateFurnidata(item.id, name, draft.description)) draft.rememberSubmit(name, draft.description);
            }
        );
    }, [canEditFurnidata, insights.furnidataState, draft, item, confirm, updateFurnidata]);

    // PlusEMU undoes the last logged furnidata change of this furni.
    const revert = useCallback(() => {
        if (!canEditFurnidata) return;

        confirm(
            {
                titleKey: 'furni.editor.confirm.revert.title',
                messageKey: 'furni.editor.confirm.revert.message',
                confirmKey: 'furni.editor.confirm.revert.button',
                values: { classname: item.itemName }
            },
            () => revertFurnidata(item.id)
        );
    }, [canEditFurnidata, item, confirm, revertFurnidata]);

    const writeStructure = useCallback(() => {
        const rows = insights.structureDiff;

        if (!canEditFurnidata || !rows.length) return;

        confirm(
            {
                titleKey: 'furni.editor.confirm.structure.title',
                messageKey: 'furni.editor.confirm.structure.message',
                confirmKey: 'furni.editor.confirm.structure.button',
                values: { count: rows.length, classname: item.itemName },
                details: ['', ...rows.map((row) => change(row.key, row.from, row.to))]
            },
            () => updateFurnidataStructure(item.id, Object.fromEntries(rows.map((row) => [row.key, row.to])))
        );
    }, [canEditFurnidata, insights.structureDiff, item, confirm, updateFurnidataStructure]);

    const syncName = useCallback(() => {
        if (canEditFurnidata && insights.canSyncPublicName) syncPublicName(item.id, entryText(furniDataEntry, 'name'));
    }, [canEditFurnidata, insights.canSyncPublicName, item.id, furniDataEntry, syncPublicName]);

    const importFromHabbo = useCallback(() => {
        if (canEditFurnidata) importText(item.id);
    }, [canEditFurnidata, item.id, importText]);

    const applySuggestion = useCallback((suggestion: Suggestion) => setField(suggestion.field, suggestion.value), [setField]);

    const applyAllSuggestions = useCallback(
        () => applyValues(Object.fromEntries(insights.suggestions.map((suggestion) => [suggestion.field, suggestion.value])) as Partial<EditForm>),
        [insights.suggestions, applyValues]
    );

    return { save, remove, saveFurnidata, revert, writeStructure, syncName, importFromHabbo, applySuggestion, applyAllSuggestions };
};

export type FurniEditorSheetActions = ReturnType<typeof useFurniEditorSheetActions>;
