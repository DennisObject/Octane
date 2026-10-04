import { useState } from 'react';
import { entryText, FurniDataEntry, FurniDetail, FurniImportResult } from './furniEditorData';
import type { FurniEditorText } from './furniEditorText';
import type { FurniEditorMutationKind } from './furniEditorTraffic';

interface DraftBaseline {
    id: number;
    name: string;
    description: string;
}

const sameClassname = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The furnidata display name and description being edited. Like the item
 * form, a fresh copy of the same furni keeps what the user is typing (but
 * takes the server's text for what was just saved); an "Import from Habbo"
 * answer fills both fields for review, never saves them. Import sequences
 * are session-wide, so comparing them is enough to apply each answer once.
 */
export const useFurnidataDraft = (
    item: FurniDetail | null,
    entry: FurniDataEntry | null,
    importResult: FurniImportResult | null,
    refreshedAfter: FurniEditorMutationKind | null
) => {
    const id = item?.id ?? 0;
    const storedName = entryText(entry, 'name');
    const storedDescription = entryText(entry, 'description');
    const [name, setName] = useState(storedName);
    const [description, setDescription] = useState(storedDescription);
    const [baseline, setBaseline] = useState<DraftBaseline>({ id, name: storedName, description: storedDescription });
    const [importNote, setImportNote] = useState<FurniEditorText | null>(null);
    const [appliedImport, setAppliedImport] = useState(importResult?.sequence ?? 0);
    const [submitted, setSubmitted] = useState<DraftBaseline | null>(null);

    if (baseline.id !== id || baseline.name !== storedName || baseline.description !== storedDescription) {
        const sameItem = baseline.id === id;
        const saved = sameItem && refreshedAfter === 'furnidata' && submitted?.id === id ? submitted : null;
        const keep = (current: string, base: string, sent: string | undefined) => sameItem && current !== base && !(saved && current === sent);

        setBaseline({ id, name: storedName, description: storedDescription });
        setName(keep(name, baseline.name, saved?.name) ? name : storedName);
        setDescription(keep(description, baseline.description, saved?.description) ? description : storedDescription);

        if (saved || !sameItem) setSubmitted(null);
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

    const rememberSubmit = (sentName: string, sentDescription: string) => setSubmitted({ id, name: sentName, description: sentDescription });

    return { name, description, storedName, storedDescription, isDirty, importNote, setName, setDescription, rememberSubmit };
};

export type FurnidataDraftApi = ReturnType<typeof useFurnidataDraft>;
