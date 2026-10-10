import { WiredActionLayoutCode } from './WiredActionLayoutCode';
import { joinWiredLiteral, splitWiredLiteral } from './WiredLiteral';

/**
 * The variable fx boxes, as the server numbers them. Everything here mirrors WiredVariableFxStyles / WiredVariableFxSettings
 * on the gameserver: the int layout the editor sends (21 ints, 22 for levelling and number displays), the style catalogue the
 * editor offers, and the config extras the server attaches for the overlay. The three variable slots and a number display's
 * icon travel beside the ints, never inside them.
 */
export const WIRED_FX_CATEGORY = {
    HEALTH_POINTS: 0,
    PROGRESS_BAR: 1,
    LEVELLING_PROGRESS: 2,
    STATUS_BAR: 3,
    BOSS_BAR: 4,
    NUMBER_DISPLAY: 5
} as const;

/** The first int: 0 furni, 1 user. */
export const WIRED_FX_SOURCE = { FURNI: 0, USER: 1 } as const;

export const WIRED_FX_VISIBILITY = {
    ONLY_USER: 0,
    GAME_TEAM: 1,
    EVERYONE: 2,
    HAS_VARIABLE: 3,
    HAS_VARIABLE_WITH_VALUE: 4
} as const;

export const WIRED_FX_SHOW_MODE = { ALWAYS: 0, WHEN_CHANGES: 1, NEVER: 2 } as const;

/** Where a range override reads from: the holder's own variable, or a room variable (the wire code -10). */
export const WIRED_FX_OVERRIDE_TARGET = { HOLDER: 0, GLOBAL: 1 } as const;

export const WIRED_FX_GLOBAL_TARGET_CODE = -10;

export const WIRED_FX_COLOR_NOT_APPLICABLE = -1;
export const WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN = 1000;
export const WIRED_FX_COLOR_DYNAMIC_LEVELLING = 1001;
export const WIRED_FX_COLOR_DYNAMIC_TEAM = 1002;

export const WIRED_FX_WIDTH_NOT_APPLICABLE = -1;

export const WIRED_FX_SHOW_DURATION_MIN_MS = 1500;
export const WIRED_FX_SHOW_DURATION_MAX_MS = 20000;
export const WIRED_FX_SHOW_DURATION_DEFAULT_MS = 3000;
export const WIRED_FX_SEGMENTS_MAX = 100;
export const WIRED_FX_DEFAULT_MAX_VALUE = 100;

export const WIRED_FX_RENDERER = {
    PLAIN: 0,
    CLASSIC_MINI: 1,
    BLOCK: 2,
    STRIPED: 3,
    ARROW: 4,
    HEARTS: 10,
    HEALTH_BAR: 11,
    HEALTH_CROSS: 12,
    THERMOMETER: 13,
    LEVEL_WITH_PROGRESS: 20,
    LEVEL_DETAILS: 21,
    BOSS: 100,
    NUMBER_STYLED: 200,
    NUMBER_FREEZE: 201
} as const;

/** The status extras the server writes per value. */
export const WIRED_FX_STATUS_EXTRA = {
    CURRENT_LEVEL: 'current_level',
    MAX_LEVEL: 'max_level',
    IS_MAXED: 'is_maxed',
    DELEGATED_COLOR: 'delegated_color'
} as const;

/** The config extras a style carries. */
export const WIRED_FX_CONFIG_EXTRA = {
    ICON: 'icon',
    ICON_ALIGNMENT: 'icon_alignment',
    DESIGN: 'design',
    COLOR: 'color',
    METALLIC: 'metallic',
    SUB_RENDERER: 'sub_renderer',
    SEGMENTS: 'segments'
} as const;

/** One style the category offers, with the options the server allows for it. */
export interface IWiredVariableFxStyle {
    styleId: number;
    key: string;
    fallback: string;
    /** Only status bars choose between several renderers. */
    rendererIds: number[];
    colorIds: number[];
    widthIds: number[];
    defaultRendererId: number;
    defaultColorId: number;
    defaultWidthId: number;
    /** Levelling only: the bars a level badge may draw beside it (style 0) or its fixed bar (style 1). */
    subRendererIds: number[];
    defaultSubRendererId: number;
}

/** The status bar themes, in the server's order; the style id is the index. A battery has no baked colour and runs red to green. */
export const WIRED_FX_STATUS_BAR_THEMES: { icon: string; color: string | null; metallic: boolean }[] = [
    { icon: 'energy', color: '#ffd83d', metallic: false },
    { icon: 'shield', color: '#4aa9f6', metallic: false },
    { icon: 'magic', color: '#8751d1', metallic: false },
    { icon: 'food', color: '#ff9f24', metallic: false },
    { icon: 'stamina', color: '#86d213', metallic: false },
    { icon: 'poison', color: '#8ddc35', metallic: false },
    { icon: 'mana', color: '#268fff', metallic: false },
    { icon: 'health', color: '#7dce35', metallic: false },
    { icon: 'gold', color: '#ffc83d', metallic: true },
    { icon: 'gems', color: '#416bdd', metallic: true },
    { icon: 'honor', color: '#fac384', metallic: false },
    { icon: 'reputation', color: '#ffd83d', metallic: false },
    { icon: 'cooldown', color: '#b8c3cc', metallic: false },
    { icon: 'timeleft', color: '#74b9e8', metallic: false },
    { icon: 'burning', color: '#ff5a1f', metallic: false },
    { icon: 'freezing', color: '#82cfff', metallic: false },
    { icon: 'battery', color: null, metallic: false },
    { icon: 'repairing', color: '#c9c5b8', metallic: true },
    { icon: 'stealth', color: '#6254a8', metallic: false },
    { icon: 'upgrading', color: '#6bdc34', metallic: false },
    { icon: 'star_power', color: '#ffd900', metallic: true },
    { icon: 'droplet', color: '#4aabf5', metallic: false }
];

/** The fixed palette, by the server's colour ids; the hex is what the overlay paints. */
const PALETTE_ROWS: [number, string, string][] = [
    [1, 'green', '#5fd35f'],
    [2, 'lime_green', '#9be33b'],
    [3, 'yellow', '#ffd83d'],
    [4, 'orange', '#ff9f24'],
    [5, 'red', '#e04b4b'],
    [6, 'cyan', '#4fd6e0'],
    [7, 'blue', '#3b7de3'],
    [8, 'purple', '#8751d1'],
    [9, 'pink', '#ff6fb5'],
    [10, 'brown', '#a0663a'],
    [11, 'beige', '#e8d3a8'],
    [12, 'teal', '#1f9e95'],
    [13, 'indigo', '#4b4bc4'],
    [14, 'magenta', '#d63ec7'],
    [15, 'light_blue', '#8fd3ff'],
    [16, 'fire_orange', '#ff5a1f'],
    [17, 'dark_green', '#2e7d32'],
    [18, 'dark_blue', '#1d3f8f'],
    [19, 'white', '#f4f4f4'],
    [100, 'bronze', '#cd7f32'],
    [101, 'silver', '#c0c0c0'],
    [102, 'gold', '#ffc83d'],
    [103, 'diamond', '#b9f2ff'],
    [104, 'emerald', '#50c878']
];

export const WIRED_FX_PALETTE: { id: number; key: string; fallback: string; hex: string }[] = PALETTE_ROWS.map(([id, name, hex]) => ({
    id,
    key: `wiredfurni.params.variablefx.color.${name}`,
    fallback: name.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()),
    hex
}));

/** The widths the server knows; the id is what the wire carries. */
export const WIRED_FX_WIDTHS: { id: number; key: string; fallback: string; px: number }[] = [
    { id: 0, key: 'wiredfurni.params.variablefx.width.extra_small', fallback: 'Extra small', px: 32 },
    { id: 1, key: 'wiredfurni.params.variablefx.width.small', fallback: 'Small', px: 44 },
    { id: 2, key: 'wiredfurni.params.variablefx.width.medium', fallback: 'Medium', px: 64 },
    { id: 3, key: 'wiredfurni.params.variablefx.width.large', fallback: 'Large', px: 96 },
    { id: 4, key: 'wiredfurni.params.variablefx.width.extra_large', fallback: 'Extra large', px: 140 },
    { id: 100, key: 'wiredfurni.params.variablefx.width.huge', fallback: 'Huge', px: 180 }
];

/** The icons the client ships; the server drops any other name. */
export const WIRED_FX_ICONS = [
    'battery',
    'burning',
    'cash',
    'cooldown',
    'droplet',
    'energy',
    'eye',
    'fish',
    'food',
    'freezing',
    'gems',
    'gold',
    'health',
    'honor',
    'magic',
    'mana',
    'poison',
    'repairing',
    'reputation',
    'shield',
    'stamina',
    'star_power',
    'stealth',
    'timeleft',
    'upgrading',
    'wooden_logs',
    'misc_heart',
    'misc_skull',
    'misc_star'
];

export const WIRED_FX_NUMBER_ALIGNMENTS = ['left', 'right', 'double'];

const COLOR_GREEN = 1;
const COLOR_YELLOW = 3;
const COLOR_RED = 5;
const COLOR_BLUE = 7;
const COLOR_WHITE = 19;

const WIDTH_EXTRA_SMALL = 0;
const WIDTH_SMALL = 1;
const WIDTH_MEDIUM = 2;
const WIDTH_LARGE = 3;
const WIDTH_EXTRA_LARGE = 4;
const WIDTH_HUGE = 100;

const WIDTHS_ALL = [WIDTH_EXTRA_SMALL, WIDTH_SMALL, WIDTH_MEDIUM, WIDTH_LARGE, WIDTH_EXTRA_LARGE];

const NORMAL_COLORS = WIRED_FX_PALETTE.map((entry) => entry.id);
const TEAM_COLORS = [...NORMAL_COLORS, WIRED_FX_COLOR_DYNAMIC_TEAM];
const LEVELLING_COLORS = [...NORMAL_COLORS, WIRED_FX_COLOR_DYNAMIC_LEVELLING, WIRED_FX_COLOR_DYNAMIC_TEAM];
const RED_TO_GREEN_TEAM_COLORS = [...NORMAL_COLORS, WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN, WIRED_FX_COLOR_DYNAMIC_TEAM];

interface IFxStyleSpec {
    key: string;
    fallback: string;
    renderers: number[];
    colors: number[];
    widths: number[];
    color: number;
    width: number;
    renderer: number;
    subRenderers?: number[];
}

const buildStyles = (specs: IFxStyleSpec[]): IWiredVariableFxStyle[] =>
    specs.map((spec, styleId) => ({
        styleId,
        key: spec.key,
        fallback: spec.fallback,
        rendererIds: spec.renderers,
        colorIds: spec.colors,
        widthIds: spec.widths,
        defaultRendererId: spec.renderer,
        defaultColorId: spec.color,
        defaultWidthId: spec.width,
        subRendererIds: spec.subRenderers ?? [],
        defaultSubRendererId: spec.subRenderers?.[0] ?? 0
    }));

const progressStyle = (key: string, fallback: string, renderer: number): IFxStyleSpec => ({
    key,
    fallback,
    renderers: [renderer],
    colors: TEAM_COLORS,
    widths: WIDTHS_ALL,
    color: COLOR_GREEN,
    width: WIDTH_MEDIUM,
    renderer
});

const STYLES: Record<number, IWiredVariableFxStyle[]> = {
    [WIRED_FX_CATEGORY.HEALTH_POINTS]: buildStyles([
        {
            key: 'wiredfurni.params.variablefx.style.hearts',
            fallback: 'Hearts',
            renderers: [WIRED_FX_RENDERER.HEARTS],
            colors: [WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN],
            widths: [WIDTH_SMALL, WIDTH_MEDIUM, WIDTH_LARGE],
            color: WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN,
            width: WIDTH_MEDIUM,
            renderer: WIRED_FX_RENDERER.HEARTS
        },
        {
            key: 'wiredfurni.params.variablefx.style.health_cross',
            fallback: 'Health cross',
            renderers: [WIRED_FX_RENDERER.HEALTH_CROSS],
            colors: TEAM_COLORS,
            widths: [WIDTH_MEDIUM, WIDTH_LARGE],
            color: COLOR_RED,
            width: WIDTH_MEDIUM,
            renderer: WIRED_FX_RENDERER.HEALTH_CROSS
        },
        {
            key: 'wiredfurni.params.variablefx.style.thermometer',
            fallback: 'Thermometer',
            renderers: [WIRED_FX_RENDERER.THERMOMETER],
            colors: [WIRED_FX_COLOR_NOT_APPLICABLE],
            widths: WIDTHS_ALL,
            color: WIRED_FX_COLOR_NOT_APPLICABLE,
            width: WIDTH_MEDIUM,
            renderer: WIRED_FX_RENDERER.THERMOMETER
        },
        {
            key: 'wiredfurni.params.variablefx.style.health_bar',
            fallback: 'Health bar',
            renderers: [WIRED_FX_RENDERER.HEALTH_BAR],
            colors: TEAM_COLORS,
            widths: [WIRED_FX_WIDTH_NOT_APPLICABLE],
            color: COLOR_RED,
            width: WIRED_FX_WIDTH_NOT_APPLICABLE,
            renderer: WIRED_FX_RENDERER.HEALTH_BAR
        }
    ]),
    [WIRED_FX_CATEGORY.PROGRESS_BAR]: buildStyles([
        progressStyle('wiredfurni.params.variablefx.style.plain', 'Plain', WIRED_FX_RENDERER.PLAIN),
        progressStyle('wiredfurni.params.variablefx.style.block', 'Blocks', WIRED_FX_RENDERER.BLOCK),
        progressStyle('wiredfurni.params.variablefx.style.striped', 'Striped', WIRED_FX_RENDERER.STRIPED),
        progressStyle('wiredfurni.params.variablefx.style.arrow', 'Arrows', WIRED_FX_RENDERER.ARROW),
        progressStyle('wiredfurni.params.variablefx.style.classic_mini', 'Classic mini', WIRED_FX_RENDERER.CLASSIC_MINI)
    ]),
    [WIRED_FX_CATEGORY.LEVELLING_PROGRESS]: buildStyles([
        {
            key: 'wiredfurni.params.variablefx.style.level_with_progress',
            fallback: 'Level badge with bar',
            renderers: [WIRED_FX_RENDERER.LEVEL_WITH_PROGRESS],
            colors: LEVELLING_COLORS,
            widths: [WIDTH_SMALL, WIDTH_MEDIUM, WIDTH_LARGE],
            color: WIRED_FX_COLOR_DYNAMIC_LEVELLING,
            width: WIDTH_MEDIUM,
            renderer: WIRED_FX_RENDERER.LEVEL_WITH_PROGRESS,
            subRenderers: [WIRED_FX_RENDERER.BLOCK, WIRED_FX_RENDERER.STRIPED, WIRED_FX_RENDERER.ARROW]
        },
        {
            key: 'wiredfurni.params.variablefx.style.level_details',
            fallback: 'Level details',
            renderers: [WIRED_FX_RENDERER.LEVEL_DETAILS],
            colors: LEVELLING_COLORS,
            widths: [WIDTH_SMALL, WIDTH_MEDIUM, WIDTH_LARGE, WIDTH_EXTRA_LARGE],
            color: WIRED_FX_COLOR_DYNAMIC_LEVELLING,
            width: WIDTH_MEDIUM,
            renderer: WIRED_FX_RENDERER.LEVEL_DETAILS,
            subRenderers: [WIRED_FX_RENDERER.CLASSIC_MINI]
        }
    ]),
    [WIRED_FX_CATEGORY.STATUS_BAR]: buildStyles(
        WIRED_FX_STATUS_BAR_THEMES.map((theme) => {
            const dynamic = theme.color === null;

            return {
                key: `wiredfurni.params.variablefx.icon.${theme.icon}`,
                fallback: theme.icon.replace(/_/g, ' '),
                renderers: [WIRED_FX_RENDERER.BLOCK, WIRED_FX_RENDERER.STRIPED, WIRED_FX_RENDERER.ARROW],
                colors: [dynamic ? WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN : WIRED_FX_COLOR_NOT_APPLICABLE],
                widths: WIDTHS_ALL,
                color: dynamic ? WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN : WIRED_FX_COLOR_NOT_APPLICABLE,
                width: WIDTH_MEDIUM,
                renderer: WIRED_FX_RENDERER.BLOCK
            };
        })
    ),
    [WIRED_FX_CATEGORY.BOSS_BAR]: buildStyles([
        {
            key: 'wiredfurni.params.variablefx.style.boss_skull',
            fallback: 'Boss bar with skulls',
            renderers: [WIRED_FX_RENDERER.BOSS],
            colors: [COLOR_RED],
            widths: [WIDTH_LARGE, WIDTH_EXTRA_LARGE, WIDTH_HUGE],
            color: COLOR_RED,
            width: WIDTH_EXTRA_LARGE,
            renderer: WIRED_FX_RENDERER.BOSS
        },
        {
            key: 'wiredfurni.params.variablefx.style.boss_plain',
            fallback: 'Boss bar',
            renderers: [WIRED_FX_RENDERER.BOSS],
            colors: RED_TO_GREEN_TEAM_COLORS,
            widths: [WIDTH_LARGE, WIDTH_EXTRA_LARGE, WIDTH_HUGE],
            color: COLOR_RED,
            width: WIDTH_EXTRA_LARGE,
            renderer: WIRED_FX_RENDERER.BOSS
        }
    ]),
    [WIRED_FX_CATEGORY.NUMBER_DISPLAY]: buildStyles([
        {
            key: 'wiredfurni.params.variablefx.style.freeze_style',
            fallback: 'Freeze style',
            renderers: [WIRED_FX_RENDERER.NUMBER_FREEZE],
            colors: [COLOR_RED, COLOR_GREEN, COLOR_BLUE, COLOR_YELLOW, COLOR_WHITE, WIRED_FX_COLOR_DYNAMIC_TEAM],
            widths: [WIRED_FX_WIDTH_NOT_APPLICABLE],
            color: COLOR_GREEN,
            width: WIRED_FX_WIDTH_NOT_APPLICABLE,
            renderer: WIRED_FX_RENDERER.NUMBER_FREEZE
        },
        {
            key: 'wiredfurni.params.variablefx.style.shalimar',
            fallback: 'Shalimar',
            renderers: [WIRED_FX_RENDERER.NUMBER_STYLED],
            colors: TEAM_COLORS,
            widths: [WIRED_FX_WIDTH_NOT_APPLICABLE],
            color: COLOR_GREEN,
            width: WIRED_FX_WIDTH_NOT_APPLICABLE,
            renderer: WIRED_FX_RENDERER.NUMBER_STYLED
        },
        {
            key: 'wiredfurni.params.variablefx.style.blocky',
            fallback: 'Blocky',
            renderers: [WIRED_FX_RENDERER.NUMBER_STYLED],
            colors: TEAM_COLORS,
            widths: [WIRED_FX_WIDTH_NOT_APPLICABLE],
            color: COLOR_GREEN,
            width: WIRED_FX_WIDTH_NOT_APPLICABLE,
            renderer: WIRED_FX_RENDERER.NUMBER_STYLED
        }
    ])
};

export const wiredVariableFxCategoryOfCode = (code: number): number => {
    switch (code) {
        case WiredActionLayoutCode.VARIABLE_FX_HEALTH_POINTS_EXTRA:
            return WIRED_FX_CATEGORY.HEALTH_POINTS;
        case WiredActionLayoutCode.VARIABLE_FX_PROGRESS_BAR_EXTRA:
            return WIRED_FX_CATEGORY.PROGRESS_BAR;
        case WiredActionLayoutCode.VARIABLE_FX_LEVELLING_PROGRESS_EXTRA:
            return WIRED_FX_CATEGORY.LEVELLING_PROGRESS;
        case WiredActionLayoutCode.VARIABLE_FX_STATUS_BAR_EXTRA:
            return WIRED_FX_CATEGORY.STATUS_BAR;
        case WiredActionLayoutCode.VARIABLE_FX_BOSS_BAR_EXTRA:
            return WIRED_FX_CATEGORY.BOSS_BAR;
        case WiredActionLayoutCode.VARIABLE_FX_NUMBER_DISPLAY_EXTRA:
            return WIRED_FX_CATEGORY.NUMBER_DISPLAY;
        default:
            return -1;
    }
};

export const wiredVariableFxStyles = (category: number): IWiredVariableFxStyle[] => STYLES[category] ?? STYLES[WIRED_FX_CATEGORY.PROGRESS_BAR];

export const wiredVariableFxStyle = (category: number, styleId: number): IWiredVariableFxStyle => {
    const styles = wiredVariableFxStyles(category);

    return styles.find((entry) => entry.styleId === styleId) ?? styles[0];
};

/** Levels and plain numbers have no editable range; the server pins them to 0..100. */
export const wiredVariableFxUsesRange = (category: number) => category !== WIRED_FX_CATEGORY.LEVELLING_PROGRESS && category !== WIRED_FX_CATEGORY.NUMBER_DISPLAY;

/** Levelling and number displays carry one more int: the level bar or the icon alignment. */
export const wiredVariableFxUsesCategoryExtra = (category: number) =>
    category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS || category === WIRED_FX_CATEGORY.NUMBER_DISPLAY;

export const wiredVariableFxRendererSupportsSegments = (rendererId: number) =>
    rendererId === WIRED_FX_RENDERER.BLOCK || rendererId === WIRED_FX_RENDERER.ARROW || rendererId === WIRED_FX_RENDERER.THERMOMETER;

/** The renderer a segment count applies to: the chosen renderer, or the bar a level badge draws beside it. */
export const wiredVariableFxSegmentRenderer = (category: number, rendererId: number, categoryExtra: number): number => {
    if (category !== WIRED_FX_CATEGORY.LEVELLING_PROGRESS || rendererId !== WIRED_FX_RENDERER.LEVEL_WITH_PROGRESS) return rendererId;

    const isBar = categoryExtra === WIRED_FX_RENDERER.BLOCK || categoryExtra === WIRED_FX_RENDERER.STRIPED || categoryExtra === WIRED_FX_RENDERER.ARROW;

    return isBar ? categoryExtra : WIRED_FX_RENDERER.BLOCK;
};

export const wiredVariableFxSegmentsAllowed = (category: number, rendererId: number, categoryExtra: number) =>
    wiredVariableFxRendererSupportsSegments(wiredVariableFxSegmentRenderer(category, rendererId, categoryExtra));

const int = (values: number[], index: number, fallback: number) =>
    Array.isArray(values) && index < values.length && Number.isFinite(values[index]) ? Math.trunc(values[index]) : fallback;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const pick = (value: number, allowed: number[], fallback: number) => (allowed.includes(value) ? value : fallback);

/** The 64-bit literal stored as a (high, low) pair from `index`; the fallback when the pair is not there. */
const literalAt = (values: number[], index: number, fallback: number | string) =>
    index + 1 < values.length ? joinWiredLiteral(int(values, index, 0), int(values, index + 1, 0)) : fallback;

/** The editor's view of one fx box: the shape it edits, with what the server writes for the category. */
export interface IWiredVariableFxParams {
    source: number;
    visibility: number;
    showMode: number;
    /** The server validates these two ints but nothing reads them; they are kept as stored. */
    reservedFlags: number;
    reservedToggle: number;
    showDurationMs: number;
    styleId: number;
    colorId: number;
    widthId: number;
    rendererId: number;
    minValue: number | string;
    maxValue: number | string;
    overrideMinEnabled: boolean;
    overrideMaxEnabled: boolean;
    overrideMinTarget: number;
    overrideMaxTarget: number;
    audienceValue: number;
    segments: number;
    /** Levelling: the bar beside the badge. Number display: the icon alignment. Other categories: 0. */
    categoryExtra: number;
}

export const defaultWiredVariableFxParams = (category: number = WIRED_FX_CATEGORY.PROGRESS_BAR): IWiredVariableFxParams => {
    const style = wiredVariableFxStyle(category, 0);

    return {
        source: WIRED_FX_SOURCE.USER,
        visibility: WIRED_FX_VISIBILITY.EVERYONE,
        showMode: WIRED_FX_SHOW_MODE.ALWAYS,
        reservedFlags: 0,
        reservedToggle: 0,
        showDurationMs: WIRED_FX_SHOW_DURATION_DEFAULT_MS,
        styleId: style.styleId,
        colorId: style.defaultColorId,
        widthId: style.defaultWidthId,
        rendererId: style.defaultRendererId,
        minValue: 0,
        maxValue: WIRED_FX_DEFAULT_MAX_VALUE,
        overrideMinEnabled: false,
        overrideMaxEnabled: false,
        overrideMinTarget: WIRED_FX_OVERRIDE_TARGET.HOLDER,
        overrideMaxTarget: WIRED_FX_OVERRIDE_TARGET.HOLDER,
        audienceValue: 0,
        segments: 0,
        categoryExtra: style.defaultSubRendererId
    };
};

/** The params as the box stored them, with anything missing or outside the server's options replaced by the server's default. */
export const readWiredVariableFxParams = (intData: number[], category: number): IWiredVariableFxParams => {
    const defaults = defaultWiredVariableFxParams(category);
    const styleCount = wiredVariableFxStyles(category).length;
    const styleId = clamp(int(intData, 6, defaults.styleId), 0, styleCount - 1);
    const style = wiredVariableFxStyle(category, styleId);
    const source = int(intData, 0, defaults.source) === WIRED_FX_SOURCE.FURNI ? WIRED_FX_SOURCE.FURNI : WIRED_FX_SOURCE.USER;
    const visibility = clamp(int(intData, 1, defaults.visibility), WIRED_FX_VISIBILITY.ONLY_USER, WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE);
    const overrideTarget = (index: number) => (int(intData, index, 0) === WIRED_FX_GLOBAL_TARGET_CODE ? WIRED_FX_OVERRIDE_TARGET.GLOBAL : WIRED_FX_OVERRIDE_TARGET.HOLDER);
    const categoryExtra = wiredVariableFxUsesCategoryExtra(category)
        ? category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS
            ? pick(int(intData, 21, defaults.categoryExtra), style.subRendererIds, style.defaultSubRendererId)
            : clamp(int(intData, 21, 0), 0, WIRED_FX_NUMBER_ALIGNMENTS.length - 1)
        : 0;

    return {
        source,
        visibility: source === WIRED_FX_SOURCE.FURNI && visibility < WIRED_FX_VISIBILITY.EVERYONE ? WIRED_FX_VISIBILITY.EVERYONE : visibility,
        showMode: clamp(int(intData, 2, defaults.showMode), WIRED_FX_SHOW_MODE.ALWAYS, WIRED_FX_SHOW_MODE.NEVER),
        reservedFlags: clamp(int(intData, 3, 0), 0, 15),
        reservedToggle: int(intData, 4, 0) === 1 ? 1 : 0,
        showDurationMs: clamp(int(intData, 5, defaults.showDurationMs), WIRED_FX_SHOW_DURATION_MIN_MS, WIRED_FX_SHOW_DURATION_MAX_MS),
        styleId,
        colorId: pick(int(intData, 7, defaults.colorId), style.colorIds, style.defaultColorId),
        widthId: pick(int(intData, 8, defaults.widthId), style.widthIds, style.defaultWidthId),
        rendererId: pick(int(intData, 9, defaults.rendererId), style.rendererIds, style.defaultRendererId),
        minValue: literalAt(intData, 10, defaults.minValue),
        maxValue: literalAt(intData, 12, defaults.maxValue),
        overrideMinEnabled: int(intData, 14, 0) === 1,
        overrideMaxEnabled: int(intData, 15, 0) === 1,
        overrideMinTarget: overrideTarget(16),
        overrideMaxTarget: overrideTarget(17),
        audienceValue: Number(literalAt(intData, 18, 0)),
        segments: clamp(int(intData, 20, 0), 0, WIRED_FX_SEGMENTS_MAX),
        categoryExtra
    };
};

/** The int layout the server validates: 21 ints, plus the category extra for levelling and number displays. */
export const writeWiredVariableFxParams = (params: IWiredVariableFxParams, category: number): number[] => {
    const usesRange = wiredVariableFxUsesRange(category);
    const source = params.source === WIRED_FX_SOURCE.FURNI ? WIRED_FX_SOURCE.FURNI : WIRED_FX_SOURCE.USER;
    const visibility = clamp(
        source === WIRED_FX_SOURCE.FURNI && params.visibility < WIRED_FX_VISIBILITY.EVERYONE ? WIRED_FX_VISIBILITY.EVERYONE : params.visibility,
        WIRED_FX_VISIBILITY.ONLY_USER,
        WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE
    );
    const style = wiredVariableFxStyle(category, params.styleId);
    const rendererId = pick(params.rendererId, style.rendererIds, style.defaultRendererId);
    const categoryExtra = wiredVariableFxUsesCategoryExtra(category)
        ? category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS
            ? pick(params.categoryExtra, style.subRendererIds, style.defaultSubRendererId)
            : clamp(params.categoryExtra, 0, WIRED_FX_NUMBER_ALIGNMENTS.length - 1)
        : 0;
    const segments = wiredVariableFxSegmentsAllowed(category, rendererId, categoryExtra) ? clamp(params.segments, 0, WIRED_FX_SEGMENTS_MAX) : 0;
    const [minHigh, minLow] = splitWiredLiteral(usesRange ? params.minValue : 0);
    const [maxHigh, maxLow] = splitWiredLiteral(usesRange ? params.maxValue : WIRED_FX_DEFAULT_MAX_VALUE);
    const [audienceHigh, audienceLow] = splitWiredLiteral(visibility >= WIRED_FX_VISIBILITY.HAS_VARIABLE ? params.audienceValue : 0);
    const holderCode = source;
    const targetCode = (target: number) => (target === WIRED_FX_OVERRIDE_TARGET.GLOBAL ? WIRED_FX_GLOBAL_TARGET_CODE : holderCode);
    const ints = [
        source,
        visibility,
        clamp(params.showMode, WIRED_FX_SHOW_MODE.ALWAYS, WIRED_FX_SHOW_MODE.NEVER),
        clamp(params.reservedFlags, 0, 15),
        params.reservedToggle === 1 ? 1 : 0,
        clamp(params.showDurationMs, WIRED_FX_SHOW_DURATION_MIN_MS, WIRED_FX_SHOW_DURATION_MAX_MS),
        style.styleId,
        pick(params.colorId, style.colorIds, style.defaultColorId),
        pick(params.widthId, style.widthIds, style.defaultWidthId),
        rendererId,
        minHigh,
        minLow,
        maxHigh,
        maxLow,
        usesRange && params.overrideMinEnabled ? 1 : 0,
        usesRange && params.overrideMaxEnabled ? 1 : 0,
        targetCode(params.overrideMinTarget),
        targetCode(params.overrideMaxTarget),
        audienceHigh,
        audienceLow,
        segments
    ];

    return wiredVariableFxUsesCategoryExtra(category) ? [...ints, categoryExtra] : ints;
};

/** What the overlay needs of a config to size and colour a value. */
export interface IWiredVariableFxConfigLike {
    category: number;
    styleId: number;
    colorId: number;
    widthId: number;
    rendererId: number;
    showMode: number;
    showDurationMs: number;
    defaultMinValue: number;
    defaultMaxValue: number;
    extra: Record<string, string>;
}

export interface IWiredVariableFxStatusLike {
    value: number;
    overrideMinValue: number | null;
    overrideMaxValue: number | null;
    extra: Record<string, string>;
}

/** The range a status is drawn against: its own pair when the server sent one, the config's otherwise. */
export const resolveWiredVariableFxRange = (config: IWiredVariableFxConfigLike, status: IWiredVariableFxStatusLike): { min: number; max: number } => {
    const hasOverrides = status.overrideMinValue !== null && status.overrideMaxValue !== null && status.overrideMinValue !== undefined && status.overrideMaxValue !== undefined;
    const min = hasOverrides ? status.overrideMinValue : config.defaultMinValue;
    let max = hasOverrides ? status.overrideMaxValue : config.defaultMaxValue;

    if (max <= min) max = min + 1;

    return { min, max };
};

/** 0..1 of the way from min to max, clamped. */
export const wiredVariableFxProgress = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value) || max <= min) return 0;

    return clamp((value - min) / (max - min), 0, 1);
};

export interface IWiredVariableFxLevel {
    level: number;
    maxLevel: number;
    maxed: boolean;
}

export const wiredVariableFxLevel = (status: IWiredVariableFxStatusLike): IWiredVariableFxLevel => {
    const level = parseInt(status.extra?.[WIRED_FX_STATUS_EXTRA.CURRENT_LEVEL] ?? '', 10);
    const maxLevel = parseInt(status.extra?.[WIRED_FX_STATUS_EXTRA.MAX_LEVEL] ?? '', 10);

    return {
        level: Number.isFinite(level) ? level : 1,
        maxLevel: Number.isFinite(maxLevel) ? maxLevel : 1,
        maxed: status.extra?.[WIRED_FX_STATUS_EXTRA.IS_MAXED] === 'true'
    };
};

/** A level's hue: red at level one, green at the cap. */
const levelColor = (level: IWiredVariableFxLevel): string => {
    const span = Math.max(1, level.maxLevel - 1);
    const ratio = clamp((level.level - 1) / span, 0, 1);

    return `hsl(${Math.round(ratio * 120)}, 75%, 50%)`;
};

/** A value's hue on the red-to-green scale of its range. */
const progressColor = (config: IWiredVariableFxConfigLike, status: IWiredVariableFxStatusLike): string => {
    const range = resolveWiredVariableFxRange(config, status);

    return `hsl(${Math.round(wiredVariableFxProgress(status.value, range.min, range.max) * 120)}, 75%, 50%)`;
};

/**
 * The colour a value is drawn in: the holder's team colour or level hue when the box asked for a
 * dynamic one, a palette entry, the status bar's baked colour, or null for "the style's own".
 */
export const resolveWiredVariableFxColor = (config: IWiredVariableFxConfigLike, status: IWiredVariableFxStatusLike): string | null => {
    if (config.colorId === WIRED_FX_COLOR_DYNAMIC_TEAM) return status.extra?.[WIRED_FX_STATUS_EXTRA.DELEGATED_COLOR] ?? null;

    if (config.colorId === WIRED_FX_COLOR_DYNAMIC_LEVELLING) return levelColor(wiredVariableFxLevel(status));

    if (config.colorId === WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN) return progressColor(config, status);

    const palette = WIRED_FX_PALETTE.find((entry) => entry.id === config.colorId);

    if (palette) return palette.hex;

    if (config.category === WIRED_FX_CATEGORY.STATUS_BAR) {
        const baked = config.extra?.[WIRED_FX_CONFIG_EXTRA.COLOR];

        return baked || progressColor(config, status);
    }

    return null;
};

export const wiredVariableFxWidthPx = (widthId: number): number => (WIRED_FX_WIDTHS.find((entry) => entry.id === widthId) ?? WIRED_FX_WIDTHS[2]).px;

/** Compact numbers so a boss bar reads "1.2k / 5k" instead of overflowing. */
export const formatWiredVariableFxValue = (value: number): string => {
    if (!Number.isFinite(value)) return '0';

    const abs = Math.abs(value);

    if (abs < 10000) return String(Math.trunc(value));
    if (abs < 1000000) return `${(value / 1000).toFixed(abs < 100000 ? 1 : 0).replace(/\.0$/, '')}k`;
    if (abs < 1000000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;

    return `${(value / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
};

/**
 * Whether a value is on screen right now: always, never, or only for the show duration after it
 * last changed. Returns the moment it hides, or null when that never happens on its own.
 */
export const wiredVariableFxVisibleUntil = (config: IWiredVariableFxConfigLike, changedAt: number, now: number): { visible: boolean; until: number | null } => {
    switch (config.showMode) {
        case WIRED_FX_SHOW_MODE.NEVER:
            return { visible: false, until: null };
        case WIRED_FX_SHOW_MODE.WHEN_CHANGES: {
            const until = changedAt + Math.max(WIRED_FX_SHOW_DURATION_MIN_MS, config.showDurationMs || 0);

            return { visible: now < until, until };
        }
        default:
            return { visible: true, until: null };
    }
};
