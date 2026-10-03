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

export const fieldLabelKey = (field: EditField): string => `furni.editor.field.${field}`;

const TIP_FIELDS: ReadonlySet<EditField> = new Set<EditField>([
    'stackHeight',
    'interactionType',
    'interactionModesCount',
    'customparams',
    'vendingIds',
    'multiheight',
    'effectIdMale',
    'effectIdFemale',
    'clothingOnWalk'
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

// Mirrors FurniEditorUpdatePayload.validateValue on the emulator, plus the
// whole-number rule the server would otherwise apply by truncating. This is
// for the user only: the server validates every field again.
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
    wholeMin('effectIdMale', 0);
    wholeMin('effectIdFemale', 0);

    if (!Number.isFinite(form.stackHeight) || form.stackHeight < 0 || form.stackHeight > 99.99) {
        errors.stackHeight = { key: 'furni.editor.error.range', values: { min: 0, max: 99.99 } };
    }

    maxLength('interactionType', 500);
    maxLength('customparams', 256);
    maxLength('vendingIds', 255);
    maxLength('clothingOnWalk', 255);
    maxLength('multiheight', 50);

    return errors;
};

const sameValue = (a: unknown, b: unknown) => Object.is(a, b);

export const changedFieldsOf = (form: EditForm, stored: EditForm): EditField[] => EDIT_FIELDS.filter((field) => !sameValue(form[field], stored[field]));

/** Only the changed fields go to the server, so a save never rewrites a column another staff member just changed. */
export const changesPayload = (form: EditForm, stored: EditForm): Partial<EditForm> =>
    Object.fromEntries(changedFieldsOf(form, stored).map((field) => [field, form[field]]));

/**
 * Applies a fresh server copy under the form: fields the user left alone take
 * the new value, fields the user changed keep the user's value.
 */
export const rebaseForm = (form: EditForm, previous: EditForm, next: EditForm): EditForm => {
    const rebased = { ...next };

    for (const field of EDIT_FIELDS) {
        if (!sameValue(form[field], previous[field])) (rebased as Record<EditField, unknown>)[field] = form[field];
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

    const candidates: [StructureKey, number | boolean][] = [
        ['xdim', stored.width],
        ['ydim', stored.length],
        ['height', stored.stackHeight],
        ['canstandon', stored.allowWalk],
        ['cansiton', stored.allowSit],
        ['canlayon', stored.allowLay]
    ];

    return candidates
        .filter(([key, to]) => key in entry && entryText(entry, key) !== String(to))
        .map(([key, to]) => ({ key, from: entry[key], to }));
};
