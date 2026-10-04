import { entryText, type FurniDataEntry, type FurniDetail } from './furniEditorData';
import type { FurniEditorText } from './furniEditorText';
import type { FurniEditorGroup } from './furniEditorUiStore';

// The editable subset of items_base. Identity columns (id, classname, sprite,
// type) are deliberately absent: the server drops them from an update, so
// keeping them in the form would only make the dirty check lie.
export const editableForm = (item: FurniDetail) => ({
    width: item.width || 1,
    length: item.length || 1,
    stackHeight: item.stackHeight || 0,
    allowStack: !!item.allowStack,
    allowWalk: !!item.allowWalk,
    allowSit: !!item.allowSit,
    allowLay: !!item.allowLay,
    allowGift: !!item.allowGift,
    allowTrade: !!item.allowTrade,
    allowRecycle: !!item.allowRecycle,
    allowMarketplaceSell: !!item.allowMarketplaceSell,
    allowInventoryStack: !!item.allowInventoryStack,
    interactionType: item.interactionType || '',
    interactionModesCount: item.interactionModesCount || 0,
    customparams: item.customparams || '',
    vendingIds: item.vendingIds || '',
    multiheight: item.multiheight || '',
    effectIdMale: item.effectIdMale || 0,
    effectIdFemale: item.effectIdFemale || 0,
    clothingOnWalk: item.clothingOnWalk || ''
});

export type EditForm = ReturnType<typeof editableForm>;
export type EditField = keyof EditForm;
export type NumberField = { [K in EditField]: EditForm[K] extends number ? K : never }[EditField];
export type TextField = { [K in EditField]: EditForm[K] extends string ? K : never }[EditField];
export type FlagField = { [K in EditField]: EditForm[K] extends boolean ? K : never }[EditField];

export const FIELD_GROUP: Record<EditField, FurniEditorGroup> = {
    width: 'placement',
    length: 'placement',
    stackHeight: 'placement',
    allowStack: 'placement',
    allowWalk: 'placement',
    allowSit: 'placement',
    allowLay: 'placement',
    allowGift: 'placement',
    allowTrade: 'placement',
    allowRecycle: 'placement',
    allowMarketplaceSell: 'placement',
    allowInventoryStack: 'placement',
    interactionType: 'behaviour',
    interactionModesCount: 'behaviour',
    customparams: 'behaviour',
    vendingIds: 'behaviour',
    multiheight: 'behaviour',
    effectIdMale: 'behaviour',
    effectIdFemale: 'behaviour',
    clothingOnWalk: 'behaviour'
};

export const EDIT_FIELDS = Object.keys(FIELD_GROUP) as EditField[];

/**
 * Columns PlusEMU's items_base does not have: the server reports them as
 * false/empty and refuses any change, so the sheet shows them read-only or
 * not at all. They stay in the form so the wire payload keeps its shape.
 */
export const HOTEL_UNSUPPORTED_FIELDS: ReadonlySet<EditField> = new Set<EditField>(['allowLay', 'customparams', 'clothingOnWalk']);

/**
 * PlusEMU stores one effect id for both genders and refuses two different
 * values, so the female id follows the male one and is never shown on its own.
 */
export const MIRRORED_FIELDS: Readonly<Partial<Record<EditField, EditField>>> = { effectIdMale: 'effectIdFemale' };

const MIRROR_TARGETS: ReadonlySet<EditField> = new Set(Object.values(MIRRORED_FIELDS));

/** The fields a user can change on this hotel (the jump list, the unsaved list, the save diff). */
export const EDITABLE_FIELDS = EDIT_FIELDS.filter((field) => !HOTEL_UNSUPPORTED_FIELDS.has(field) && !MIRROR_TARGETS.has(field));

export const fieldLabelKey = (field: EditField): string => `furni.editor.field.${field}`;

const TIP_FIELDS: ReadonlySet<EditField> = new Set<EditField>([
    'stackHeight',
    'interactionType',
    'interactionModesCount',
    'vendingIds',
    'multiheight',
    'effectIdMale'
]);

export const fieldTipKey = (field: EditField): string | null => (TIP_FIELDS.has(field) ? `furni.editor.tip.${field}` : null);

export const PERMISSION_GROUPS: { labelKey: string; fields: FlagField[] }[] = [
    { labelKey: 'furni.editor.permissions.gameplay', fields: ['allowStack', 'allowWalk', 'allowSit', 'allowLay', 'allowInventoryStack'] },
    { labelKey: 'furni.editor.permissions.trading', fields: ['allowGift', 'allowTrade', 'allowRecycle', 'allowMarketplaceSell'] }
];

/** Fields whose change reshapes furni already standing in rooms. */
export const PLACEMENT_FIELDS: ReadonlySet<EditField> = new Set<EditField>([
    'width',
    'length',
    'stackHeight',
    'allowWalk',
    'allowStack',
    'allowSit',
    'allowLay'
]);

export type FormErrors = Partial<Record<EditField, FurniEditorText>>;

const isWholeIn = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;

// Comma separated lists as the item loader parses them (spaces are dropped, empty is allowed).
const isNumberList = (value: string, integers: boolean) => {
    const text = value.replace(/ /g, '');

    if (!text) return true;

    return text.split(',').every((entry) => (integers ? /^\d+$/.test(entry) : /^(\d+\.?\d*|\.\d+)$/.test(entry) && Number(entry) <= 99.99));
};

// Mirrors FurniEditorUpdatePayload on the emulator (PlusEMU E3). This is for
// the user only: the server validates every field again.
export const validateForm = (form: EditForm): FormErrors => {
    const errors: FormErrors = {};
    const wholeRange = (field: NumberField, min: number, max: number) => {
        if (!isWholeIn(form[field], min, max)) errors[field] = { key: 'furni.editor.error.whole_range', values: { min, max } };
    };
    const wholeMin = (field: NumberField, min: number) => {
        if (!isWholeIn(form[field], min, Number.MAX_SAFE_INTEGER)) errors[field] = { key: 'furni.editor.error.whole_min', values: { min } };
    };
    const maxLength = (field: TextField, max: number) => {
        if (form[field].length > max) errors[field] = { key: 'furni.editor.error.max_length', values: { max } };
    };

    wholeRange('width', 1, 64);
    wholeRange('length', 1, 64);
    wholeRange('interactionModesCount', 0, 100);
    wholeRange('effectIdMale', 0, 999);

    if (!Number.isFinite(form.stackHeight) || form.stackHeight < 0 || form.stackHeight > 99.99) {
        errors.stackHeight = { key: 'furni.editor.error.range', values: { min: 0, max: 99.99 } };
    }

    maxLength('interactionType', 25);
    maxLength('vendingIds', 255);
    maxLength('multiheight', 50);

    if (!errors.vendingIds && !isNumberList(form.vendingIds, true)) errors.vendingIds = { key: 'furni.editor.error.number_list' };
    if (!errors.multiheight && !isNumberList(form.multiheight, false)) errors.multiheight = { key: 'furni.editor.error.height_list' };

    return errors;
};

const sameValue = (a: unknown, b: unknown) => Object.is(a, b);

/** Changed fields, without mirror targets (they change with their source). */
export const changedFieldsOf = (form: EditForm, stored: EditForm): EditField[] =>
    EDIT_FIELDS.filter((field) => !MIRROR_TARGETS.has(field) && !sameValue(form[field], stored[field]));

/**
 * Only the changed fields go to the server, so a save never rewrites a column
 * another staff member just changed. A mirrored pair always travels together.
 */
export const changesPayload = (form: EditForm, stored: EditForm): Partial<EditForm> => {
    const fields = changedFieldsOf(form, stored);

    for (const field of [...fields]) {
        const mirror = MIRRORED_FIELDS[field];

        if (mirror) fields.push(mirror);
    }

    return Object.fromEntries(fields.map((field) => [field, form[field]]));
};

/**
 * Applies a fresh server copy under the form: fields the user left alone take
 * the new value, fields the user changed keep the user's value. After a save,
 * fields still holding what was submitted take the server value too, since
 * the server may have normalised it (lowercased type, rounded height, ...).
 */
export const rebaseForm = (form: EditForm, previous: EditForm, next: EditForm, submitted: Partial<EditForm> | null = null): EditForm => {
    const rebased = { ...next };

    for (const field of EDIT_FIELDS) {
        const untouched = sameValue(form[field], previous[field]);
        const justSaved = !!submitted && field in submitted && sameValue(form[field], submitted[field]);

        if (!untouched && !justSaved) (rebased as Record<EditField, unknown>)[field] = form[field];
    }

    return rebased;
};

export type StructureKey = 'xdim' | 'ydim' | 'height' | 'canstandon' | 'cansiton' | 'canlayon';

export interface StructureRow {
    key: StructureKey;
    from: unknown;
    to: number | boolean;
}

// The reverse of the furnidata suggestions: when items_base is right and the
// entry is wrong, these DB values can be written into the entry. Only fields
// the entry carries and that differ are offered.
export const furnidataStructureDiff = (entry: FurniDataEntry | null, stored: EditForm): StructureRow[] => {
    if (!entry) return [];

    // No canlayon: items_base on this hotel has no lay flag, so its "false" says nothing about the entry.
    const candidates: [StructureKey, number | boolean][] = [
        ['xdim', stored.width],
        ['ydim', stored.length],
        ['height', stored.stackHeight],
        ['canstandon', stored.allowWalk],
        ['cansiton', stored.allowSit]
    ];

    return candidates.filter(([key, to]) => key in entry && entryText(entry, key) !== String(to)).map(([key, to]) => ({ key, from: entry[key], to }));
};
