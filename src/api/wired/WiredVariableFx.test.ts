import { describe, expect, it } from 'vitest';
import { WiredActionLayoutCode } from './WiredActionLayoutCode';
import {
    defaultWiredVariableFxParams,
    formatWiredVariableFxValue,
    readWiredVariableFxParams,
    resolveWiredVariableFxColor,
    resolveWiredVariableFxRange,
    WIRED_FX_CATEGORY,
    WIRED_FX_COLOR_DYNAMIC_LEVELLING,
    WIRED_FX_COLOR_DYNAMIC_TEAM,
    WIRED_FX_RENDERER,
    WIRED_FX_SHOW_MODE,
    WIRED_FX_STATUS_BAR_THEMES,
    wiredVariableFxCategoryOfCode,
    wiredVariableFxLevel,
    wiredVariableFxProgress,
    wiredVariableFxSegmentRenderer,
    wiredVariableFxStyles,
    wiredVariableFxVisibleUntil,
    writeWiredVariableFxParams
} from './WiredVariableFx';

const config = (overrides: Partial<Parameters<typeof resolveWiredVariableFxColor>[0]> = {}) => ({
    category: WIRED_FX_CATEGORY.PROGRESS_BAR,
    styleId: 0,
    colorId: -1,
    widthId: 2,
    rendererId: WIRED_FX_RENDERER.PLAIN,
    showMode: WIRED_FX_SHOW_MODE.ALWAYS,
    showDurationMs: 3000,
    defaultMinValue: 0,
    defaultMaxValue: 100,
    extra: {} as Record<string, string>,
    ...overrides
});

const status = (overrides: Partial<Parameters<typeof resolveWiredVariableFxColor>[1]> = {}) => ({
    value: 50,
    overrideMinValue: null as number | null,
    overrideMaxValue: null as number | null,
    extra: {} as Record<string, string>,
    ...overrides
});

describe('WiredVariableFx helpers', () => {
    it('maps the six layout codes to their categories and nothing else', () => {
        expect(wiredVariableFxCategoryOfCode(WiredActionLayoutCode.VARIABLE_FX_HEALTH_POINTS_EXTRA)).toBe(WIRED_FX_CATEGORY.HEALTH_POINTS);
        expect(wiredVariableFxCategoryOfCode(WiredActionLayoutCode.VARIABLE_FX_NUMBER_DISPLAY_EXTRA)).toBe(WIRED_FX_CATEGORY.NUMBER_DISPLAY);
        expect(wiredVariableFxCategoryOfCode(WiredActionLayoutCode.CLICK_SETTINGS)).toBe(-1);
    });

    it('mirrors the server style tables', () => {
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.HEALTH_POINTS)).toHaveLength(4);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.PROGRESS_BAR)).toHaveLength(5);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.LEVELLING_PROGRESS)).toHaveLength(2);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.STATUS_BAR)).toHaveLength(WIRED_FX_STATUS_BAR_THEMES.length);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.BOSS_BAR)).toHaveLength(2);
        expect(wiredVariableFxStyles(WIRED_FX_CATEGORY.NUMBER_DISPLAY)).toHaveLength(3);
        expect(wiredVariableFxStyles(99)).toBe(wiredVariableFxStyles(WIRED_FX_CATEGORY.PROGRESS_BAR));
    });

    it('lets a level badge pass the segment count to the bar it draws', () => {
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.LEVELLING_PROGRESS, 0, WIRED_FX_RENDERER.ARROW)).toBe(WIRED_FX_RENDERER.ARROW);
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.LEVELLING_PROGRESS, 0, 77)).toBe(WIRED_FX_RENDERER.BLOCK);
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.LEVELLING_PROGRESS, 1, WIRED_FX_RENDERER.ARROW)).toBe(WIRED_FX_RENDERER.CLASSIC_MINI);
        expect(wiredVariableFxSegmentRenderer(WIRED_FX_CATEGORY.PROGRESS_BAR, 1, 0)).toBe(WIRED_FX_RENDERER.BLOCK);
    });

    it('draws against the status range when the server sent one and repairs an empty one', () => {
        expect(resolveWiredVariableFxRange(config(), status())).toEqual({ min: 0, max: 100 });
        expect(resolveWiredVariableFxRange(config(), status({ overrideMinValue: 10, overrideMaxValue: 40 }))).toEqual({ min: 10, max: 40 });
        expect(resolveWiredVariableFxRange(config({ defaultMaxValue: 0 }), status())).toEqual({ min: 0, max: 1 });
        expect(wiredVariableFxProgress(25, 0, 100)).toBe(0.25);
        expect(wiredVariableFxProgress(500, 0, 100)).toBe(1);
        expect(wiredVariableFxProgress(-5, 0, 100)).toBe(0);
    });

    it('reads the level extras with sensible defaults', () => {
        expect(wiredVariableFxLevel(status())).toEqual({ level: 1, maxLevel: 1, maxed: false });
        expect(wiredVariableFxLevel(status({ extra: { current_level: '4', max_level: '10', is_maxed: 'true' } }))).toEqual({ level: 4, maxLevel: 10, maxed: true });
    });

    it('resolves the team, level, palette, theme and battery colours in that order', () => {
        expect(resolveWiredVariableFxColor(config({ colorId: WIRED_FX_COLOR_DYNAMIC_TEAM }), status({ extra: { delegated_color: '#df291e' } }))).toBe('#df291e');
        expect(resolveWiredVariableFxColor(config({ colorId: WIRED_FX_COLOR_DYNAMIC_TEAM }), status())).toBeNull();
        expect(resolveWiredVariableFxColor(config({ colorId: WIRED_FX_COLOR_DYNAMIC_LEVELLING }), status({ extra: { current_level: '10', max_level: '10' } }))).toBe('hsl(120, 75%, 50%)');
        expect(resolveWiredVariableFxColor(config({ colorId: 1 }), status())).toBe('#e04b4b');
        expect(resolveWiredVariableFxColor(config({ category: WIRED_FX_CATEGORY.STATUS_BAR, extra: { color: '#4aa9f6' } }), status())).toBe('#4aa9f6');
        expect(resolveWiredVariableFxColor(config({ category: WIRED_FX_CATEGORY.STATUS_BAR }), status({ value: 100 }))).toBe('hsl(120, 75%, 50%)');
        expect(resolveWiredVariableFxColor(config(), status())).toBeNull();
    });

    it('formats big numbers compactly', () => {
        expect(formatWiredVariableFxValue(999)).toBe('999');
        expect(formatWiredVariableFxValue(12345)).toBe('12.3k');
        expect(formatWiredVariableFxValue(250000)).toBe('250k');
        expect(formatWiredVariableFxValue(2500000)).toBe('2.5M');
        expect(formatWiredVariableFxValue(-1500)).toBe('-1500');
        expect(formatWiredVariableFxValue(NaN)).toBe('0');
    });

    it('shows a value always, never, or for the show duration after it changed', () => {
        expect(wiredVariableFxVisibleUntil(config(), 0, 999999)).toEqual({ visible: true, until: null });
        expect(wiredVariableFxVisibleUntil(config({ showMode: WIRED_FX_SHOW_MODE.NEVER }), 0, 0)).toEqual({ visible: false, until: null });

        const changing = config({ showMode: WIRED_FX_SHOW_MODE.WHEN_CHANGES, showDurationMs: 2000 });

        expect(wiredVariableFxVisibleUntil(changing, 1000, 2500)).toEqual({ visible: true, until: 3000 });
        expect(wiredVariableFxVisibleUntil(changing, 1000, 3000)).toEqual({ visible: false, until: 3000 });
    });
});
