import { EDIT_FIELDS, EditField, fieldLabelKey } from './furniEditorForm';
import type { FurniEditorText } from './furniEditorText';

/**
 * The sentences PlusEMU (E3) puts in FurniEditorResult.message and in the
 * furnidata diagnostic, mapped to furni.editor.* texts. Placeholders are
 * parsed out and passed as values; text that matches nothing is shown as the
 * server wrote it.
 */
export interface FurniServerMessage {
    text: FurniEditorText;
    tone: 'success' | 'error' | 'info';
    /** False for text the table does not know (shown verbatim). */
    known: boolean;
    /** The form field the sentence is about, so the sheet can show it there. */
    field?: EditField;
    /** "Import from Habbo is not configured": the import button goes away. */
    importUnconfigured?: boolean;
}

const known = (key: string, tone: FurniServerMessage['tone'] = 'error', values?: FurniEditorText['values']): FurniServerMessage => ({
    text: { key, values },
    tone,
    known: true
});

/** Fields the server names by their wire key; effectIdFemale follows effectIdMale on this hotel. */
const toEditField = (wireField: string): EditField | undefined => {
    if (wireField === 'effectIdFemale') return 'effectIdMale';

    return (EDIT_FIELDS as string[]).includes(wireField) ? (wireField as EditField) : undefined;
};

/** The field's label (or the raw key for a field the editor does not show). */
const fieldName = (wireField: string): FurniEditorText | string => {
    if (wireField === 'publicName') return { key: 'furni.editor.basic.public_name' };

    const field = toEditField(wireField);

    return field ? { key: fieldLabelKey(field) } : wireField;
};

const withField = (message: FurniServerMessage, wireField: string): FurniServerMessage => ({ ...message, field: toEditField(wireField) });

const EXACT: Record<string, FurniServerMessage> = {
    // Success
    'Item updated': known('furni.editor.status.saved', 'success'),
    'Item deleted': known('furni.editor.status.deleted', 'success'),
    'Furnidata updated': known('furni.editor.status.furnidata_saved', 'success'),
    'Furnidata reverted': known('furni.editor.status.reverted', 'success'),
    'No changes': known('furni.editor.status.no_changes', 'success'),
    // Refusals
    'No permission': known('furni.editor.status.no_permission'),
    'Too many requests': known('furni.editor.status.too_many'),
    // Import
    'Import from Habbo is not configured': { ...known('furni.editor.status.import_unconfigured', 'info'), importUnconfigured: true },
    'Import from Habbo is unavailable right now': known('furni.editor.server.import_unavailable', 'info'),
    // Furnidata
    'Furnidata source not configured': known('furni.editor.status.furnidata_unconfigured', 'info'),
    'Furnidata exceeds the configured size limit': known('furni.editor.server.furnidata_too_large'),
    'Furnidata would exceed the configured size limit': known('furni.editor.server.furnidata_would_exceed'),
    'Furnidata is not a JSON object': known('furni.editor.server.furnidata_not_object'),
    'No furnidata entry for this classname': known('furni.editor.status.furnidata_no_entry', 'info'),
    'Several furnidata entries share this classname and sprite id': known('furni.editor.server.furnidata_ambiguous'),
    'The furniture has no classname': known('furni.editor.server.no_classname'),
    'An edit cannot change the classname or id': known('furni.editor.server.identity_locked'),
    'Nothing to revert': known('furni.editor.status.nothing_to_revert', 'info'),
    'The furnidata entry changed since that edit; revert refused': known('furni.editor.server.revert_conflict'),
    'The logged entry is not a JSON object': known('furni.editor.server.log_not_object'),
    'The furnidata file could not be written': known('furni.editor.server.write_failed'),
    'The furnidata file could not be read': known('furni.editor.server.read_failed'),
    'The server could not finish this request': known('furni.editor.server.unfinished'),
    // Update payload
    'Update is too large': known('furni.editor.server.too_large'),
    'Invalid JSON data': known('furni.editor.server.invalid_json'),
    'Invalid effect id': { ...known('furni.editor.server.invalid_effect'), field: 'effectIdMale' },
    'This hotel uses one effect id for both genders': { ...known('furni.editor.server.one_effect'), field: 'effectIdMale' },
    // Furnidata payload
    'Invalid name or description': known('furni.editor.server.invalid_text'),
    'structure must be an object': known('furni.editor.server.structure_not_object'),
    'No name, description or structure provided': known('furni.editor.server.nothing_sent')
};

const REFERENCE_PARTS: [RegExp, string][] = [
    [/^(\d+) placed or owned items$/, 'furni.editor.server.ref.items'],
    [/^(\d+) catalog offers$/, 'furni.editor.server.ref.offers'],
    [/^(\d+) unopened gifts$/, 'furni.editor.server.ref.gifts'],
    [/^(\d+) open marketplace offers$/, 'furni.editor.server.ref.marketplace']
];

// "{n} placed or owned items, {n} catalog offers, catalog deals #5, #9": the
// deal ids are joined with the same ", " as the parts, so they are regrouped.
const parseReferences = (list: string): FurniEditorText[] | null => {
    const parts: FurniEditorText[] = [];
    let deals: string[] | null = null;

    for (const token of list.split(', ')) {
        const dealStart = /^catalog deals (#\d+)$/.exec(token);

        if (dealStart || (deals && /^#\d+$/.test(token))) {
            if (dealStart) {
                deals = [];
                parts.push({ key: 'furni.editor.server.ref.deals', values: { ids: '' } });
            }

            deals?.push(dealStart ? dealStart[1] : token);
            parts[parts.length - 1] = { key: 'furni.editor.server.ref.deals', values: { ids: (deals ?? []).join(', ') } };
            continue;
        }

        deals = null;

        const part = REFERENCE_PARTS.map(([pattern, key]) => [pattern.exec(token), key] as const).find(([match]) => match);

        if (!part?.[0]) return null;

        parts.push({ key: part[1], values: { count: Number(part[0][1]) } });
    }

    return parts;
};

const PATTERNS: [RegExp, (match: RegExpExecArray) => FurniServerMessage | null][] = [
    [/^Item not found: (\d+)$/, (m) => known('furni.editor.server.item_not_found', 'error', { id: m[1] })],
    [/^No item uses sprite id (-?\d+)$/, (m) => known('furni.editor.server.sprite_not_found', 'error', { spriteId: m[1] })],
    [
        /^Cannot delete: still used by (.+)$/,
        (m) => {
            const parts = parseReferences(m[1]);

            return parts ? known('furni.editor.server.cannot_delete', 'error', { list: parts }) : null;
        }
    ],
    [/^The furnidata entry has no (.+)$/, (m) => known('furni.editor.server.entry_missing_key', 'error', { key: m[1] })],
    [/^Invalid structure field: (.+)$/, (m) => known('furni.editor.server.invalid_structure', 'error', { key: m[1] })],
    [/^Unknown interaction type: (.*)$/, (m) => ({ ...known('furni.editor.server.unknown_interaction', 'error', { type: m[1] }), field: 'interactionType' })],
    [
        /^Invalid value for (\w+): use comma separated whole numbers$/,
        (m) => withField(known('furni.editor.server.invalid_number_list', 'error', { field: fieldName(m[1]) }), m[1])
    ],
    [
        /^Invalid value for (\w+): use comma separated heights$/,
        (m) => withField(known('furni.editor.server.invalid_height_list', 'error', { field: fieldName(m[1]) }), m[1])
    ],
    [/^Invalid value for (\w+)$/, (m) => withField(known('furni.editor.server.invalid_value', 'error', { field: fieldName(m[1]) }), m[1])],
    [/^(\w+) is limited to (\d+) characters$/, (m) => withField(known('furni.editor.server.too_long', 'error', { field: fieldName(m[1]), max: m[2] }), m[1])],
    [/^(\w+) is not supported by this hotel$/, (m) => withField(known('furni.editor.server.unsupported', 'error', { field: fieldName(m[1]) }), m[1])]
];

/** Maps one server sentence; null for an empty message. */
export const interpretFurniEditorMessage = (message: string, success = false): FurniServerMessage | null => {
    const text = message.trim();

    if (!text) return null;

    const exact = EXACT[text];

    if (exact) return exact;

    for (const [pattern, build] of PATTERNS) {
        const match = pattern.exec(text);
        const result = match ? build(match) : null;

        if (result) return result;
    }

    return { text: { key: 'furni.editor.status.message', values: { message: text } }, tone: success ? 'success' : 'error', known: false };
};
