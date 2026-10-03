import { LocalizeText } from '../../api';
import type { CatalogRef } from './furniEditorData';

/**
 * A localisation key plus its %placeholder% values. Pure helpers return these
 * instead of English text so the view localises at render time.
 */
export interface FurniEditorText {
    key: string;
    values?: Record<string, string | number>;
}

export const localizeFurniEditorText = ({ key, values }: FurniEditorText): string => {
    if (!values) return LocalizeText(key);

    const names = Object.keys(values);

    return LocalizeText(
        key,
        names,
        names.map((name) => String(values[name]))
    );
};

export const furniEditorText = (key: string, values?: Record<string, string | number>): string => localizeFurniEditorText({ key, values });

/** A field or furnidata value as the editor shows it in diffs and "was" hints. */
export const formatFurniEditorValue = (value: unknown): string => {
    if (typeof value === 'boolean') return LocalizeText(value ? 'furni.editor.value.on' : 'furni.editor.value.off');
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'string' && value !== '') return value;
    if (value !== null && typeof value === 'object') return JSON.stringify(value);

    return LocalizeText('furni.editor.value.empty');
};

export const formatCatalogPrice = (ref: CatalogRef): string => {
    const parts: string[] = [];

    if (ref.costCredits > 0) parts.push(furniEditorText('furni.editor.catalogue.price.credits', { amount: ref.costCredits }));
    if (ref.costPoints > 0) parts.push(furniEditorText('furni.editor.catalogue.price.points', { amount: ref.costPoints, type: ref.pointsType }));

    return parts.length ? parts.join(' + ') : LocalizeText('furni.editor.catalogue.price.free');
};
