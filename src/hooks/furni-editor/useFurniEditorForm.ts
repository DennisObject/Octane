import { useCallback, useMemo, useState } from 'react';
import type { FurniDetail } from './furniEditorData';
import { changedFieldsOf, EditField, EditForm, editableForm, FIELD_GROUP, rebaseForm, validateForm } from './furniEditorForm';
import { FURNI_EDITOR_GROUPS, FurniEditorGroup } from './furniEditorUiStore';

export type FurniEditorGroupMark = 'changed' | 'invalid' | null;

const NO_MARKS = Object.fromEntries(FURNI_EDITOR_GROUPS.map((group) => [group, null])) as Record<FurniEditorGroup, FurniEditorGroupMark>;

/**
 * The items_base form of the open furni. A fresh server copy of the same
 * furni (after any save) is rebased under the form, so unsaved edits in other
 * fields survive; another furni resets it.
 */
export const useFurniEditorForm = (item: FurniDetail | null) => {
    const stored = useMemo(() => (item ? editableForm(item) : null), [item]);
    const [form, setForm] = useState<EditForm | null>(stored);
    const [baseline, setBaseline] = useState<{ id: number; values: EditForm | null }>({ id: item?.id ?? 0, values: stored });
    const [lastSave, setLastSave] = useState<{ id: number; previous: EditForm } | null>(null);

    if (baseline.values !== stored) {
        const previous = baseline.values;
        const sameItem = item !== null && baseline.id === item.id;

        setBaseline({ id: item?.id ?? 0, values: stored });

        if (sameItem && form && previous && stored) {
            setForm(rebaseForm(form, previous, stored));
        } else {
            setForm(stored);
            setLastSave(null);
        }
    }

    const setField = useCallback(<K extends EditField>(field: K, value: EditForm[K]) => {
        setForm((previous) => (previous ? { ...previous, [field]: value } : previous));
    }, []);

    const applyValues = useCallback((values: Partial<EditForm>) => {
        setForm((previous) => (previous ? { ...previous, ...values } : previous));
    }, []);

    const changedFields = useMemo(() => (form && stored ? changedFieldsOf(form, stored) : []), [form, stored]);
    const errors = useMemo(() => (form ? validateForm(form) : {}), [form]);
    const isValid = Object.keys(errors).length === 0;
    const isDirty = changedFields.length > 0;

    const groupMarks = useMemo(() => {
        const marks = { ...NO_MARKS };

        for (const field of changedFields) marks[FIELD_GROUP[field]] = 'changed';
        for (const field of Object.keys(errors) as EditField[]) marks[FIELD_GROUP[field]] = 'invalid';

        return marks;
    }, [changedFields, errors]);

    const discard = useCallback(() => setForm(stored), [stored]);

    // The values a save replaced, so one click can put them back into the form
    // while the sheet stays open.
    const rememberSave = useCallback(() => {
        if (item && stored) setLastSave({ id: item.id, previous: stored });
    }, [item, stored]);

    const canUndo = !!lastSave && !!item && !!stored && lastSave.id === item.id && changedFieldsOf(lastSave.previous, stored).length > 0;

    const undoLastSave = useCallback(() => {
        if (lastSave) setForm(lastSave.previous);
    }, [lastSave]);

    return { form, stored, changedFields, errors, isValid, isDirty, groupMarks, setField, applyValues, discard, rememberSave, canUndo, undoLastSave };
};

export type FurniEditorFormApi = ReturnType<typeof useFurniEditorForm>;
