export type Gender = 'M' | 'F';

export interface PartSelection {
    partId: number;
    colors: number[];
}

export type FigureSelection = Record<string, PartSelection>;

// Set types offered while creating a Habbo, in figure-string order.
export const AVATAR_SET_TYPES = ['hd', 'hr', 'ha', 'he', 'ea', 'fa', 'ch', 'cp', 'cc', 'ca', 'lg', 'sh', 'wa'];

// A new Habbo always wears these; the rest are optional extras.
export const REQUIRED_SET_TYPES = ['hr', 'hd', 'ch', 'lg', 'sh'];

export const DEFAULT_LOOKS: Record<Gender, FigureSelection> = {
    M: {
        hr: { partId: 180, colors: [45] },
        hd: { partId: 180, colors: [1] },
        ch: { partId: 215, colors: [66] },
        lg: { partId: 270, colors: [82] },
        sh: { partId: 290, colors: [80] }
    },
    F: {
        hr: { partId: 515, colors: [45] },
        hd: { partId: 600, colors: [1] },
        ch: { partId: 660, colors: [100] },
        lg: { partId: 716, colors: [82] },
        sh: { partId: 725, colors: [61] }
    }
};

export const buildFigureString = (selection: FigureSelection): string =>
{
    const ordered = [...AVATAR_SET_TYPES, ...Object.keys(selection).filter((setType) => !AVATAR_SET_TYPES.includes(setType))];

    return ordered
        .filter((setType) => selection[setType] && selection[setType].partId >= 0)
        .map((setType) => [setType, selection[setType].partId, ...selection[setType].colors].join('-'))
        .join('.');
};

// Reads a figure string into a selection, filling any missing required part
// from the gender's default look so the result is always wearable.
export const parseFigureString = (figure: string, gender: Gender): FigureSelection =>
{
    const selection: FigureSelection = {};

    for (const part of figure.split('.'))
    {
        const [setType, partId, ...colors] = part.split('-');
        const id = parseInt(partId, 10);

        if (!AVATAR_SET_TYPES.includes(setType) || Number.isNaN(id)) continue;

        selection[setType] = { partId: id, colors: colors.map((color) => parseInt(color, 10)).filter((color) => !Number.isNaN(color)) };
    }

    for (const setType of REQUIRED_SET_TYPES) selection[setType] ??= { ...DEFAULT_LOOKS[gender][setType] };

    return selection;
};
