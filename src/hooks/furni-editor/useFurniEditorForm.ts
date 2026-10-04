import { useCallback, useMemo, useState } from 'react';
import type { FurniDetail } from './furniEditorData';
import type { FurniEditorMutationKind } from './furniEditorTraffic';
import type { FurniFieldError } from './useFurniEditorStore';
import { changedFieldsOf, EditField, EditForm, editableForm, FIELD_GROUP, MIRRORED_FIELDS, rebaseForm, validateForm } from './furniEditorForm';
import { FURNI_EDITOR_GROUPS, FurniEditorGroup } from './furniEditorUiStore';

export type FurniEditorGroupMark = 'changed' | 'invalid' | null;

const NO_MARKS = Object.fromEntries(FURNI_EDITOR_GROUPS.map((group) => [group, null])) as Record<FurniEditorGroup, FurniEditorGroupMark>;

/**
 * The items_base form of the open furni. A fresh server copy of the same
 * furni (after any save) is rebased under the form, so unsaved edits in other
 * fields survive; another furni resets it. refreshedAfter marks the re-read
 * that follows a successful write, so the fields just saved take the server
 * value even when the server normalised it.
 */
export const useFurniEditorForm = (item: FurniDetail | null, refreshedAfter: FurniEditorMutationKind | null, serverError: FurniFieldError | null = null) => {
    const stored = useMemo(() => (item ? editableForm(item) : null), [item]);
    const [form, setForm] = useState<EditForm | null>(stored);
    const [baseline, setBaseline] = useState<{ id: number; values: EditForm | null }>({ id: item?.id ?? 0, values: stored });
    const [lastSave, setLastSave] = useState<{ id: number; previous: EditForm } | null>(null);
    const [submitted, setSubmitted] = useState<{ id: number; values: Partial<EditForm> } | null>(null);

    if (baseline.values !== stored) {
        const previous = baseline.values;
        const sameItem = item !== null && baseline.id === item.id;

        setBaseline({ id: item?.id ?? 0, values: stored });

        if (sameItem && form && previous && stored) {
            const saved = refreshedAfter === 'update' && submitted?.id === item.id ? submitted.values : null;

            setForm(rebaseForm(form, previous, stored, saved));

            if (saved) setSubmitted(null);
        } else {
            setForm(stored);
            setLastSave(null);
            setSubmitted(null);
        }
    }

    const setField = useCallback(<K extends EditField>(field: K, value: EditForm[K]) => {
        const mirror = MIRRORED_FIELDS[field];

        setForm((previous) => (previous ? { ...previous, [field]: value, ...(mirror ? { [mirror]: value } : {}) } : previous));
    }, []);

    const applyValues = useCallback((values: Partial<EditForm>) => {
        setForm((previous) => (previous ? { ...previous, ...values } : previous));
    }, []);

    const changedFields = useMemo(() => (form && stored ? changedFieldsOf(form, stored) : []), [form, stored]);
    // The client checks, plus a field the server refused while it still holds the value that was sent.
    const errors = useMemo(() => {
        if (!form) return {};

        const local = validateForm(form);
        const sent = submitted?.id === serverError?.itemId ? submitted?.values : undefined;

        if (!serverError || item?.id !== serverError.itemId || !sent || !(serverError.field in sent)) return local;
        if (!Object.is(form[serverError.field], sent[serverError.field])) return local;

        return { [serverError.field]: serverError.text, ...local };
    }, [form, item, serverError, submitted]);
    const isValid = Object.keys(errors).length === 0;
    const isDirty = changedFields.length > 0;

    const groupMarks = useMemo(() => {
        const marks = { ...NO_MARKS };

        for (const field of changedFields) marks[FIELD_GROUP[field]] = 'changed';
        for (const field of Object.keys(errors) as EditField[]) marks[FIELD_GROUP[field]] = 'invalid';

        return marks;
    }, [changedFields, errors]);

    const discard = useCallback(() => setForm(stored), [stored]);

    // The values a save replaced (so one click can put them back while the
    // sheet stays open) and the values it sent (see refreshedAfter).
    const rememberSave = useCallback(
        (changes: Partial<EditForm>) => {
            if (!item || !stored) return;

            setLastSave({ id: item.id, previous: stored });
            setSubmitted({ id: item.id, values: changes });
        },
        [item, stored]
    );

    const canUndo = !!lastSave && !!item && !!stored && lastSave.id === item.id && changedFieldsOf(lastSave.previous, stored).length > 0;

    const undoLastSave = useCallback(() => {
        if (lastSave) setForm(lastSave.previous);
    }, [lastSave]);

    return { form, stored, changedFields, errors, isValid, isDirty, groupMarks, setField, applyValues, discard, rememberSave, canUndo, undoLastSave };
};

export type FurniEditorFormApi = ReturnType<typeof useFurniEditorForm>;
