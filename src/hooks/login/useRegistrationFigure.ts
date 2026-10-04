import { GetConfiguration } from '@octane/renderer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AVATAR_SET_TYPES, buildFigureString, DEFAULT_LOOKS, FigureSelection, Gender, parseFigureString, REQUIRED_SET_TYPES } from '../../api';
import { configFileUrl } from '../../secure-assets';

export interface PredefinedLook {
    gender: Gender;
    figure: string;
}

interface FigureDataSet {
    id: number;
    gender: Gender | 'U';
    club: number;
    selectable: boolean;
    sellable?: boolean;
}

interface FigureDataJson {
    palettes: { id: number; colors: { id: number; hexCode: string; club: number; selectable: boolean }[] }[];
    setTypes: { type: string; paletteId: number; sets: FigureDataSet[] }[];
}

export type PartOptions = Record<string, Record<Gender, number[]>>;
export type PaletteOptions = Record<string, { id: number; hex: string }[]>;

const MAX_PREDEFINED_LOOKS = 6;

const pickRandom = <T>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];

const toPartOptions = (data: FigureDataJson): PartOptions =>
{
    const options: PartOptions = {};

    for (const setType of data.setTypes)
    {
        if (!AVATAR_SET_TYPES.includes(setType.type)) continue;

        // Only free, selectable parts: a new Habbo has no club membership yet.
        const free = (gender: Gender) => [
            ...new Set(setType.sets.filter((set) => set.selectable && set.club === 0 && !set.sellable && (set.gender === gender || set.gender === 'U')).map((set) => set.id))
        ];

        options[setType.type] = { M: free('M'), F: free('F') };
    }

    return options;
};

const toPaletteOptions = (data: FigureDataJson): PaletteOptions =>
{
    const options: PaletteOptions = {};

    for (const setType of data.setTypes)
    {
        if (!AVATAR_SET_TYPES.includes(setType.type)) continue;

        const palette = data.palettes.find((candidate) => candidate.id === setType.paletteId);

        options[setType.type] = (palette?.colors ?? []).filter((color) => color.selectable && color.club === 0).map((color) => ({ id: color.id, hex: `#${color.hexCode.toUpperCase()}` }));
    }

    return options;
};

const parsePredefinedLooks = (json: unknown): PredefinedLook[] =>
{
    if (!Array.isArray(json)) return [];

    return json
        .map((entry: Record<string, unknown>) => ({ gender: (typeof entry?._gender === 'string' ? entry._gender : '').toUpperCase(), figure: typeof entry?._figure === 'string' ? entry._figure : '' }))
        .filter((look): look is PredefinedLook => (look.gender === 'M' || look.gender === 'F') && !!look.figure);
};

// The look being built in the registration avatar step: figure data, the
// predefined looks offered by the hotel, and the wardrobe selection.
export const useRegistrationFigure = (initialGender: Gender, initialSelection: FigureSelection, active: boolean) =>
{
    const [gender, setGender] = useState<Gender>(initialGender);
    const [selection, setSelection] = useState<FigureSelection>(() => ({ ...DEFAULT_LOOKS[initialGender], ...initialSelection }));
    const [figureData, setFigureData] = useState<FigureDataJson | null>(null);
    const [predefinedLooks, setPredefinedLooks] = useState<PredefinedLook[]>([]);

    useEffect(() =>
    {
        if (!active || figureData) return;

        const url = GetConfiguration().interpolate(GetConfiguration().getValue<string>('avatar.figuredata.url', ''));

        if (!url) return;

        const controller = new AbortController();

        fetch(url, { credentials: 'omit', signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((json: FigureDataJson | null) => json && setFigureData(json))
            .catch(() =>
            {});

        return () => controller.abort();
    }, [active, figureData]);

    useEffect(() =>
    {
        if (!active || predefinedLooks.length) return;

        const controller = new AbortController();

        fetch(configFileUrl('hotlooks.json', true), { credentials: 'omit', signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((json: unknown) => setPredefinedLooks(parsePredefinedLooks(json)))
            .catch(() =>
            {});

        return () => controller.abort();
    }, [active, predefinedLooks.length]);

    const partOptions = useMemo(() => (figureData ? toPartOptions(figureData) : {}), [figureData]);
    const paletteOptions = useMemo(() => (figureData ? toPaletteOptions(figureData) : {}), [figureData]);
    const looksForGender = useMemo(() => predefinedLooks.filter((look) => look.gender === gender).slice(0, MAX_PREDEFINED_LOOKS), [predefinedLooks, gender]);

    const changeGender = useCallback((next: Gender) =>
    {
        setGender(next);
        setSelection({ ...DEFAULT_LOOKS[next] });
    }, []);

    const applyLook = useCallback((look: PredefinedLook) =>
    {
        setGender(look.gender);
        setSelection(parseFigureString(look.figure, look.gender));
    }, []);

    const selectPart = useCallback(
        (setType: string, partId: number) =>
        {
            setSelection((current) =>
            {
                const next = { ...current };

                if (partId < 0)
                {
                    delete next[setType];
                    return next;
                }

                const firstColor = paletteOptions[setType]?.[0]?.id;

                next[setType] = { partId, colors: current[setType]?.colors.length ? current[setType].colors : firstColor !== undefined ? [firstColor] : [] };

                return next;
            });
        },
        [paletteOptions]
    );

    const selectColor = useCallback((setType: string, colorId: number) =>
    {
        setSelection((current) => (current[setType] ? { ...current, [setType]: { ...current[setType], colors: [colorId] } } : current));
    }, []);

    const canRandomize = AVATAR_SET_TYPES.some((setType) => (partOptions[setType]?.[gender]?.length ?? 0) > 1);

    const randomize = useCallback(() =>
    {
        const next: FigureSelection = {};

        for (const setType of AVATAR_SET_TYPES)
        {
            const required = REQUIRED_SET_TYPES.includes(setType);

            if (!required && Math.random() < 0.55) continue;

            const partId = pickRandom(partOptions[setType]?.[gender] ?? []);
            const colorId = pickRandom(paletteOptions[setType] ?? [])?.id;

            if (partId === undefined)
            {
                if (required) next[setType] = { ...DEFAULT_LOOKS[gender][setType] };
                continue;
            }

            next[setType] = { partId, colors: colorId !== undefined ? [colorId] : [] };
        }

        setSelection(next);
    }, [gender, partOptions, paletteOptions]);

    // Predefined looks may list parts without a colour; give each one its
    // palette's first colour so the server always receives a complete figure.
    const figure = useMemo(() =>
    {
        const complete: FigureSelection = {};

        for (const [setType, part] of Object.entries(selection))
        {
            const fallbackColor = paletteOptions[setType]?.[0]?.id;

            complete[setType] = part.colors.length || fallbackColor === undefined ? part : { ...part, colors: [fallbackColor] };
        }

        return buildFigureString(complete);
    }, [selection, paletteOptions]);

    return {
        gender,
        selection,
        figure,
        partOptions,
        paletteOptions,
        predefinedLooks: looksForGender,
        canRandomize,
        changeGender,
        applyLook,
        selectPart,
        selectColor,
        randomize
    };
};

export type RegistrationFigure = ReturnType<typeof useRegistrationFigure>;
