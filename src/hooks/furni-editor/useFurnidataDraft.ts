import { useState } from 'react';
import { entryText, FurniDataEntry, FurniDetail, FurniImportResult } from './furniEditorData';
import type { FurniEditorText } from './furniEditorText';

interface DraftBaseline {
    id: number;
    name: string;
    description: string;
}

const sameClassname = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The furnidata display name and description being edited. Like the item
 * form, a fresh copy of the same furni keeps what the user is typing; an
 * "Import from Habbo" answer fills both fields for review, never saves them.
 */
export const useFurnidataDraft = (item: FurniDetail | null, entry: FurniDataEntry | null, importResult: FurniImportResult | null) => {
    const id = item?.id ?? 0;
    const storedName = entryText(entry, 'name');
    const storedDescription = entryText(entry, 'description');
    const [name, setName] = useState(storedName);
    const [description, setDescription] = useState(storedDescription);
    const [baseline, setBaseline] = useState<DraftBaseline>({ id, name: storedName, description: storedDescription });
    const [importNote, setImportNote] = useState<FurniEditorText | null>(null);
    const [appliedImport, setAppliedImport] = useState(importResult?.sequence ?? 0);

    if (baseline.id !== id || baseline.name !== storedName || baseline.description !== storedDescription) {
        const sameItem = baseline.id === id;

        setBaseline({ id, name: storedName, description: storedDescription });
        setName(sameItem && name !== baseline.name ? name : storedName);
        setDescription(sameItem && description !== baseline.description ? description : storedDescription);

        if (!sameItem) setImportNote(null);
    }

    if (importResult && importResult.sequence !== appliedImport) {
        setAppliedImport(importResult.sequence);

        // An answer for a furni the user has since left is dropped.
        if (item && importResult.itemId === item.id && (!importResult.classname || sameClassname(importResult.classname, item.itemName))) {
            if (importResult.found) {
                setName(importResult.name);
                setDescription(importResult.description);
                setImportNote({ key: 'furni.editor.names.import.applied' });
            } else {
                setImportNote({ key: 'furni.editor.names.import.not_found' });
            }
        }
    }

    const isDirty = name !== storedName || description !== storedDescription;

    return { name, description, storedName, storedDescription, isDirty, importNote, setName, setDescription };
};

export type FurnidataDraftApi = ReturnType<typeof useFurnidataDraft>;
