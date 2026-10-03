import { AVATAR_SET_TYPES, FigureSelection, Gender } from './avatarFigure';

// Unfinished sign-ups survive a reload of the same tab. The draft never holds
// the password and lives in sessionStorage, so the email is gone with the tab.
export type RegistrationStep = 'account' | 'avatar' | 'room';

export interface RegistrationDraft {
    email: string;
    username: string;
    gender: Gender;
    selection: FigureSelection;
    templateId: number | null;
}

const STORAGE_KEY = 'octane.registration.draft';
const LEGACY_STORAGE_KEY = 'nitro.registration.draft.v1';
const ALLOWED_SET_TYPES = new Set(AVATAR_SET_TYPES);

const sanitizeSelection = (value: unknown): FigureSelection =>
{
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    const selection: FigureSelection = {};

    for (const [setType, part] of Object.entries(value))
    {
        if (!ALLOWED_SET_TYPES.has(setType) || !part || typeof part !== 'object') continue;

        const candidate = part as { partId?: unknown; colors?: unknown };

        if (!Number.isInteger(candidate.partId) || (candidate.partId as number) < 0) continue;

        const colors = Array.isArray(candidate.colors) ? candidate.colors.filter((color): color is number => Number.isInteger(color) && color >= 0).slice(0, 4) : [];

        selection[setType] = { partId: candidate.partId as number, colors };
    }

    return selection;
};

export const clearRegistrationDraft = (): void =>
{
    try
    {
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    catch
    {}
};

export const loadRegistrationDraft = (): RegistrationDraft | null =>
{
    try
    {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);

        const candidate = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null') as Partial<RegistrationDraft> | null;

        if (!candidate || typeof candidate !== 'object') return null;

        return {
            email: typeof candidate.email === 'string' ? candidate.email.slice(0, 120) : '',
            username: typeof candidate.username === 'string' ? candidate.username.slice(0, 32) : '',
            gender: candidate.gender === 'M' ? 'M' : 'F',
            selection: sanitizeSelection(candidate.selection),
            templateId: Number.isInteger(candidate.templateId) && (candidate.templateId) > 0 ? (candidate.templateId) : null
        };
    }
    catch
    {
        return null;
    }
};

export const saveRegistrationDraft = (draft: RegistrationDraft): void =>
{
    try
    {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
    catch
    {}
};
