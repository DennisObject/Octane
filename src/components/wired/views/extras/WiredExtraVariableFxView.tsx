import { parseWiredLiteral } from '../../../../api/wired/WiredLiteral';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    IWiredVariableFxParams,
    localizeWithFallback,
    readWiredVariableFxParams,
    WIRED_FX_CATEGORY,
    WIRED_FX_COLOR_DYNAMIC_LEVELLING,
    WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN,
    WIRED_FX_COLOR_DYNAMIC_TEAM,
    WIRED_FX_COLOR_NOT_APPLICABLE,
    WIRED_FX_ICONS,
    WIRED_FX_NUMBER_ALIGNMENTS,
    WIRED_FX_OVERRIDE_TARGET,
    WIRED_FX_PALETTE,
    WIRED_FX_RENDERER,
    WIRED_FX_SEGMENTS_MAX,
    WIRED_FX_SHOW_DURATION_MAX_MS,
    WIRED_FX_SHOW_DURATION_MIN_MS,
    WIRED_FX_SHOW_MODE,
    WIRED_FX_SOURCE,
    WIRED_FX_VISIBILITY,
    WIRED_FX_WIDTH_NOT_APPLICABLE,
    WIRED_FX_WIDTHS,
    WiredFurniType,
    wiredVariableFxSegmentsAllowed,
    wiredVariableFxStyle,
    wiredVariableFxStyles,
    wiredVariableFxUsesRange,
    writeWiredVariableFxParams
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, IWiredVariablePickerEntry, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { tokenOfVariableSlot, variableSlotOf, WIRED_VARIABLE_ABSENT } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

export interface WiredExtraVariableFxViewProps {
    category: number;
}

interface IFxOption {
    value: number;
    key: string;
    fallback: string;
}

/** The three variable slots of the card: override minimum, override maximum, audience. */
interface IFxVariableTokens {
    overrideMin: string;
    overrideMax: string;
    audience: string;
}

const SOURCE_OPTIONS: IFxOption[] = [
    { value: WIRED_FX_SOURCE.USER, key: 'wiredfurni.params.variablefx.source.user', fallback: 'User variable on this tile' },
    { value: WIRED_FX_SOURCE.FURNI, key: 'wiredfurni.params.variablefx.source.furni', fallback: 'Furni variable on this tile' }
];

const VISIBILITY_OPTIONS: IFxOption[] = [
    { value: WIRED_FX_VISIBILITY.EVERYONE, key: 'wiredfurni.params.variablefx.visibility.everyone', fallback: 'Everyone' },
    { value: WIRED_FX_VISIBILITY.ONLY_USER, key: 'wiredfurni.params.variablefx.visibility.only_user', fallback: 'Only the user it belongs to' },
    { value: WIRED_FX_VISIBILITY.GAME_TEAM, key: 'wiredfurni.params.variablefx.visibility.game_team', fallback: 'The user and their game team' },
    { value: WIRED_FX_VISIBILITY.HAS_VARIABLE, key: 'wiredfurni.params.variablefx.visibility.has_variable', fallback: 'Users who have a variable' },
    { value: WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE, key: 'wiredfurni.params.variablefx.visibility.has_variable_with_value', fallback: 'Users whose variable has a value' }
];

const SHOW_MODE_OPTIONS: IFxOption[] = [
    { value: WIRED_FX_SHOW_MODE.ALWAYS, key: 'wiredfurni.params.variablefx.show.always', fallback: 'Always' },
    { value: WIRED_FX_SHOW_MODE.WHEN_CHANGES, key: 'wiredfurni.params.variablefx.show.when_changes', fallback: 'While the value changes' },
    { value: WIRED_FX_SHOW_MODE.NEVER, key: 'wiredfurni.params.variablefx.show.never', fallback: 'Never (hidden)' }
];

const TARGET_OPTIONS: IFxOption[] = [
    { value: WIRED_FX_OVERRIDE_TARGET.HOLDER, key: 'wiredfurni.params.variablefx.override.holder', fallback: "The holder's own variable" },
    { value: WIRED_FX_OVERRIDE_TARGET.GLOBAL, key: 'wiredfurni.params.variablefx.override.global', fallback: 'A room variable' }
];

/** The bars a segmented renderer or a level badge can be: the labels for the renderer ids the styles offer. */
const BAR_OPTIONS: Record<number, IFxOption> = {
    [WIRED_FX_RENDERER.CLASSIC_MINI]: { value: WIRED_FX_RENDERER.CLASSIC_MINI, key: 'wiredfurni.params.variablefx.style.classic_mini', fallback: 'Classic mini' },
    [WIRED_FX_RENDERER.BLOCK]: { value: WIRED_FX_RENDERER.BLOCK, key: 'wiredfurni.params.variablefx.style.block', fallback: 'Blocks' },
    [WIRED_FX_RENDERER.STRIPED]: { value: WIRED_FX_RENDERER.STRIPED, key: 'wiredfurni.params.variablefx.style.striped', fallback: 'Striped' },
    [WIRED_FX_RENDERER.ARROW]: { value: WIRED_FX_RENDERER.ARROW, key: 'wiredfurni.params.variablefx.style.arrow', fallback: 'Arrows' }
};

const CATEGORY_TITLES: Record<number, { key: string; fallback: string }> = {
    [WIRED_FX_CATEGORY.HEALTH_POINTS]: { key: 'wiredfurni.params.variablefx.category.health', fallback: 'Health points' },
    [WIRED_FX_CATEGORY.PROGRESS_BAR]: { key: 'wiredfurni.params.variablefx.category.progress', fallback: 'Progress bar' },
    [WIRED_FX_CATEGORY.LEVELLING_PROGRESS]: { key: 'wiredfurni.params.variablefx.category.level', fallback: 'Levelling progress' },
    [WIRED_FX_CATEGORY.STATUS_BAR]: { key: 'wiredfurni.params.variablefx.category.status', fallback: 'Status bar' },
    [WIRED_FX_CATEGORY.BOSS_BAR]: { key: 'wiredfurni.params.variablefx.category.boss', fallback: 'Boss bar' },
    [WIRED_FX_CATEGORY.NUMBER_DISPLAY]: { key: 'wiredfurni.params.variablefx.category.number', fallback: 'Number display' }
};

/** The colour an id stands for: the server's dynamic ids, the palette, or the style's own. */
const colourOption = (value: number): IFxOption => {
    switch (value) {
        case WIRED_FX_COLOR_NOT_APPLICABLE:
            return { value, key: 'wiredfurni.params.variablefx.color.default', fallback: "The style's own" };
        case WIRED_FX_COLOR_DYNAMIC_RED_TO_GREEN:
            return { value, key: 'wiredfurni.params.variablefx.color.red_to_green', fallback: 'Red to green by value' };
        case WIRED_FX_COLOR_DYNAMIC_LEVELLING:
            return { value, key: 'wiredfurni.params.variablefx.color.levelling', fallback: 'By level (red to green)' };
        case WIRED_FX_COLOR_DYNAMIC_TEAM:
            return { value, key: 'wiredfurni.params.variablefx.color.team', fallback: "The holder's team colour" };
        default: {
            const palette = WIRED_FX_PALETTE.find((entry) => entry.id === value);

            return { value, key: palette?.key ?? '', fallback: palette?.fallback ?? String(value) };
        }
    }
};

const widthOption = (value: number): IFxOption => {
    const width = WIRED_FX_WIDTHS.find((entry) => entry.id === value);

    return { value, key: width?.key ?? '', fallback: width?.fallback ?? String(value) };
};

const variableTokensFromWire = (variableIds: string[]): IFxVariableTokens => ({
    overrideMin: tokenOfVariableSlot(variableIds[0]),
    overrideMax: tokenOfVariableSlot(variableIds[1]),
    audience: tokenOfVariableSlot(variableIds[2])
});

/** The override slots are used only when their switch is on, and the audience only when visibility needs it. */
const variableIdsFor = (params: IWiredVariableFxParams, tokens: IFxVariableTokens, usesRange: boolean, needsAudience: boolean): string[] => [
    usesRange && params.overrideMinEnabled ? variableSlotOf(tokens.overrideMin) : WIRED_VARIABLE_ABSENT,
    usesRange && params.overrideMaxEnabled ? variableSlotOf(tokens.overrideMax) : WIRED_VARIABLE_ABSENT,
    needsAudience ? variableSlotOf(tokens.audience) : WIRED_VARIABLE_ABSENT
];

/** Only user-made variables carry an id the server can look up; the internal ones are left out. */
const customOnly = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] =>
    entries
        .map((entry) => (entry.children?.length ? { ...entry, children: customOnly(entry.children) } : entry))
        .filter((entry) => (entry.children ? entry.children.length > 0 : entry.kind === 'custom'));

const toInt = (raw: string, fallback: number) => {
    const parsed = parseInt(raw, 10);

    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * The one editor of the six variable fx boxes. What differs per category is which fields make sense: levels and
 * plain numbers have no range, a level badge picks the bar it draws, a number display places its icon, segments
 * only apply to segmented renderers, and the style decides which colours, widths and renderers are offered.
 */
export const WiredExtraVariableFxView: FC<WiredExtraVariableFxViewProps> = (props) => {
    const { category } = props;
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [] } = useWiredNativeVariables();
    const [params, setParams] = useState<IWiredVariableFxParams>(() => readWiredVariableFxParams([], category));
    const [variables, setVariables] = useState<IFxVariableTokens>(() => variableTokensFromWire([]));
    const [icon, setIcon] = useState('');
    const [rangeError, setRangeError] = useState(false);

    const styles = wiredVariableFxStyles(category);
    const style = wiredVariableFxStyle(category, params.styleId);
    const usesRange = wiredVariableFxUsesRange(category);
    const showsIcon = category === WIRED_FX_CATEGORY.NUMBER_DISPLAY;
    const showsLevelBar = category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS && style.subRendererIds.length > 1;
    const segmentsAllowed = wiredVariableFxSegmentsAllowed(category, params.rendererId, params.categoryExtra);
    const holderTarget: WiredVariablePickerTarget = params.source === WIRED_FX_SOURCE.FURNI ? 'furni' : 'user';
    const needsAudience = params.visibility >= WIRED_FX_VISIBILITY.HAS_VARIABLE;
    const visibilityOptions = VISIBILITY_OPTIONS.filter((option) => params.source === WIRED_FX_SOURCE.USER || option.value >= WIRED_FX_VISIBILITY.EVERYONE);

    const holderEntries = useMemo(
        () =>
            customOnly(
                buildWiredVariablePickerEntries(holderTarget, 'change-reference', holderTarget === 'furni' ? furniVariableDefinitions : userVariableDefinitions)
            ),
        [holderTarget, userVariableDefinitions, furniVariableDefinitions]
    );
    const roomEntries = useMemo(() => customOnly(buildWiredVariablePickerEntries('global', 'change-reference', roomVariableDefinitions)), [roomVariableDefinitions]);
    const audienceEntries = useMemo(() => customOnly(buildWiredVariablePickerEntries('user', 'change-reference', userVariableDefinitions)), [userVariableDefinitions]);

    useEffect(() => {
        setParams(readWiredVariableFxParams(trigger?.intData ?? [], category));
        setVariables(variableTokensFromWire(trigger?.variableIds ?? []));
        setIcon((trigger?.stringData ?? '').trim());
        setRangeError(false);
    }, [trigger, category]);

    const patch = (changes: Partial<IWiredVariableFxParams>) => setParams((previous) => ({ ...previous, ...changes }));
    const patchVariables = (changes: Partial<IFxVariableTokens>) => setVariables((previous) => ({ ...previous, ...changes }));

    const chooseSource = (source: number) => {
        patch({ source, visibility: source === WIRED_FX_SOURCE.FURNI && params.visibility < WIRED_FX_VISIBILITY.EVERYONE ? WIRED_FX_VISIBILITY.EVERYONE : params.visibility });
        // The holder changes with the source, so the holder's own override variables no longer apply.
        patchVariables({ overrideMin: '', overrideMax: '' });
    };

    // A style brings its own colour, width and renderer; the level bar follows the style too.
    const chooseStyle = (styleId: number) => {
        const next = wiredVariableFxStyle(category, styleId);

        patch({
            styleId: next.styleId,
            colorId: next.defaultColorId,
            widthId: next.defaultWidthId,
            rendererId: next.defaultRendererId,
            categoryExtra: category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS ? next.defaultSubRendererId : params.categoryExtra
        });
    };

    const validate = () => {
        const min = parseWiredLiteral(params.minValue);
        const max = parseWiredLiteral(params.maxValue);
        const invalidRange = usesRange && (min === null || max === null || max <= min);
        const missingOverride = usesRange && ((params.overrideMinEnabled && !variables.overrideMin) || (params.overrideMaxEnabled && !variables.overrideMax));
        const missingAudience = needsAudience && !variables.audience;

        setRangeError(invalidRange);

        return !invalidRange && !missingOverride && !missingAudience;
    };

    const save = () => {
        setIntParams(writeWiredVariableFxParams(params, category));
        setStringParam(showsIcon ? icon : '');
        setVariableIds(variableIdsFor(params, variables, usesRange, needsAudience));
    };

    const select = (label: string, value: number, options: IFxOption[], onChange: (value: number) => void, testId?: string) => (
        <div className="flex flex-col gap-1">
            <Text bold>{label}</Text>
            <select className="form-select form-select-sm" data-testid={testId} value={value} onChange={(event) => onChange(Number(event.target.value))}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {localizeWithFallback(option.key, option.fallback)}
                    </option>
                ))}
            </select>
        </div>
    );

    const overrideRow = (
        label: string,
        enabled: boolean,
        target: number,
        token: string,
        onChange: (enabled: boolean, target: number, token: string) => void,
        scope: string
    ) => (
        <div className="flex flex-col gap-1 octane-wired-fx-editor__override">
            <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" className="form-check-input" checked={enabled} onChange={(event) => onChange(event.target.checked, target, token)} />
                <Text bold>{label}</Text>
            </label>
            {enabled && (
                <div className="flex flex-col gap-1 pl-4">
                    <select className="form-select form-select-sm" value={target} onChange={(event) => onChange(enabled, Number(event.target.value), '')}>
                        {TARGET_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {localizeWithFallback(option.key, option.fallback)}
                            </option>
                        ))}
                    </select>
                    <WiredVariablePicker
                        entries={target === WIRED_FX_OVERRIDE_TARGET.GLOBAL ? roomEntries : holderEntries}
                        recentScope={scope}
                        selectedToken={token}
                        onSelect={(entry) => onChange(enabled, target, entry.token)}
                    />
                </div>
            )}
        </div>
    );

    const title = CATEGORY_TITLES[category] ?? CATEGORY_TITLES[WIRED_FX_CATEGORY.PROGRESS_BAR];
    const categoryLabel = localizeWithFallback(title.key, title.fallback);

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 420 }}>
            <div className="flex flex-col gap-2 octane-wired-fx-editor">
                <Text small={true}>
                    {localizeWithFallback(
                        'wiredfurni.params.variablefx.intro',
                        `${categoryLabel} drawn over every user or furni holding the variable box on this tile.`,
                        ['category'],
                        [categoryLabel]
                    )}
                </Text>

                {select(localizeWithFallback('wiredfurni.params.variablefx.source', 'Variable shown'), params.source, SOURCE_OPTIONS, chooseSource)}

                {select(
                    localizeWithFallback('wiredfurni.params.variablefx.visibility', 'Who sees it'),
                    params.visibility,
                    visibilityOptions,
                    (visibility) => patch({ visibility })
                )}

                {needsAudience && (
                    <div className="flex flex-col gap-1 pl-4">
                        <WiredVariablePicker
                            entries={audienceEntries}
                            recentScope="variable-fx-audience"
                            selectedToken={variables.audience}
                            onSelect={(entry) => patchVariables({ audience: entry.token })}
                        />
                        {params.visibility === WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE && (
                            <div className="flex items-center gap-1">
                                <Text>{localizeWithFallback('wiredfurni.params.variablefx.audience_value', 'with value')}</Text>
                                <OctaneInput
                                    type="number"
                                    inputSize="sm"
                                    data-testid="fx-audience-value"
                                    value={params.audienceValue}
                                    onChange={(event) => patch({ audienceValue: toInt(event.target.value, 0) })}
                                />
                            </div>
                        )}
                    </div>
                )}

                {select(localizeWithFallback('wiredfurni.params.variablefx.show', 'Show'), params.showMode, SHOW_MODE_OPTIONS, (showMode) => patch({ showMode }))}

                <label className="flex items-center gap-1">
                    <input type="checkbox" checked={params.showOnMouseHover === 1} onChange={event => patch({ showOnMouseHover: event.target.checked ? 1 : 0 })} />
                    {localizeWithFallback('wiredfurni.params.variablefx.mouse_hover', 'Show on mouse hover')}
                </label>
                {params.showMode === WIRED_FX_SHOW_MODE.WHEN_CHANGES && (
                    <div className="flex flex-wrap gap-2">
                        {[[1, 'New value'], [2, 'Increase'], [4, 'Decrease'], [8, 'Unchanged']].map(([bit, label]) => (
                            <label key={bit} className="flex items-center gap-1">
                                <input type="checkbox" checked={(params.updateMask & Number(bit)) !== 0} onChange={event => patch({ updateMask: event.target.checked ? params.updateMask | Number(bit) : params.updateMask & ~Number(bit) })} />
                                {label}
                            </label>
                        ))}
                    </div>
                )}

                {params.showMode === WIRED_FX_SHOW_MODE.WHEN_CHANGES && (
                    <div className="flex items-center gap-1 pl-4">
                        <Text>{localizeWithFallback('wiredfurni.params.variablefx.show_duration', 'for (ms)')}</Text>
                        <OctaneInput
                            type="number"
                            inputSize="sm"
                            data-testid="fx-show-duration"
                            min={WIRED_FX_SHOW_DURATION_MIN_MS}
                            max={WIRED_FX_SHOW_DURATION_MAX_MS}
                            step={100}
                            value={params.showDurationMs}
                            onChange={(event) =>
                                patch({
                                    showDurationMs: Math.max(WIRED_FX_SHOW_DURATION_MIN_MS, Math.min(WIRED_FX_SHOW_DURATION_MAX_MS, toInt(event.target.value, WIRED_FX_SHOW_DURATION_MIN_MS)))
                                })
                            }
                        />
                    </div>
                )}

                {select(
                    localizeWithFallback('wiredfurni.params.variablefx.style', 'Style'),
                    params.styleId,
                    styles.map((entry) => ({ value: entry.styleId, key: entry.key, fallback: entry.fallback })),
                    chooseStyle
                )}

                {style.rendererIds.length > 1 &&
                    select(
                        localizeWithFallback('wiredfurni.params.variablefx.bar', 'Bar'),
                        params.rendererId,
                        style.rendererIds.map((id) => BAR_OPTIONS[id]).filter(Boolean),
                        (rendererId) => patch({ rendererId })
                    )}

                {showsLevelBar &&
                    select(
                        localizeWithFallback('wiredfurni.params.variablefx.level_bar', 'Bar beside the badge'),
                        params.categoryExtra,
                        style.subRendererIds.map((id) => BAR_OPTIONS[id]).filter(Boolean),
                        (categoryExtra) => patch({ categoryExtra })
                    )}

                {showsIcon && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.icon', 'Icon')}</Text>
                        <select className="form-select form-select-sm" data-testid="fx-icon" value={icon} onChange={(event) => setIcon(event.target.value)}>
                            <option value="">{localizeWithFallback('wiredfurni.params.variablefx.icon.none', 'None')}</option>
                            {WIRED_FX_ICONS.map((name) => (
                                <option key={name} value={name}>
                                    {localizeWithFallback(`wiredfurni.params.variablefx.icon.${name}`, name.replace(/_/g, ' '))}
                                </option>
                            ))}
                        </select>
                        {icon &&
                            select(
                                localizeWithFallback('wiredfurni.params.variablefx.icon_alignment', 'Icon alignment'),
                                params.categoryExtra,
                                WIRED_FX_NUMBER_ALIGNMENTS.map((alignment, index) => ({
                                    value: index,
                                    key: `wiredfurni.params.variablefx.icon_alignment.${alignment}`,
                                    fallback: alignment
                                })),
                                (categoryExtra) => patch({ categoryExtra })
                            )}
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.color', 'Colour')}</Text>
                        <select
                            className="form-select form-select-sm"
                            data-testid="fx-color"
                            value={params.colorId}
                            onChange={(event) => patch({ colorId: Number(event.target.value) })}
                        >
                            {style.colorIds.map((id) => {
                                const option = colourOption(id);

                                return (
                                    <option key={option.value} value={option.value}>
                                        {localizeWithFallback(option.key, option.fallback)}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    {style.widthIds.some((id) => id !== WIRED_FX_WIDTH_NOT_APPLICABLE) && (
                        <div className="flex flex-col gap-1 flex-1">
                            <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.width', 'Width')}</Text>
                            <select className="form-select form-select-sm" value={params.widthId} onChange={(event) => patch({ widthId: Number(event.target.value) })}>
                                {style.widthIds.map((id) => {
                                    const option = widthOption(id);

                                    return (
                                        <option key={option.value} value={option.value}>
                                            {localizeWithFallback(option.key, option.fallback)}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}
                </div>

                {segmentsAllowed && (
                    <div className="flex items-center gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.segments', 'Segments (0 = continuous)')}</Text>
                        <OctaneInput
                            type="number"
                            inputSize="sm"
                            data-testid="fx-segments"
                            min={0}
                            max={WIRED_FX_SEGMENTS_MAX}
                            value={params.segments}
                            onChange={(event) => patch({ segments: Math.max(0, Math.min(WIRED_FX_SEGMENTS_MAX, toInt(event.target.value, 0))) })}
                        />
                    </div>
                )}

                {usesRange && (
                    <>
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.min', 'Minimum')}</Text>
                                <OctaneInput type="text" inputMode="numeric" inputSize="sm" data-testid="fx-min" value={params.minValue} onChange={(event) => patch({ minValue: event.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.max', 'Maximum')}</Text>
                                <OctaneInput type="text" inputMode="numeric" inputSize="sm" data-testid="fx-max" value={params.maxValue} onChange={(event) => patch({ maxValue: event.target.value })} />
                            </div>
                        </div>
                        {rangeError && (
                            <Text small={true} className="text-red-500">
                                {localizeWithFallback('wiredfurni.params.variablefx.validation.range', 'The maximum has to be above the minimum.')}
                            </Text>
                        )}
                        {overrideRow(
                            localizeWithFallback('wiredfurni.params.variablefx.override_min', 'Take the minimum from a variable'),
                            params.overrideMinEnabled,
                            params.overrideMinTarget,
                            variables.overrideMin,
                            (enabled, target, token) => {
                                patch({ overrideMinEnabled: enabled, overrideMinTarget: target });
                                patchVariables({ overrideMin: token });
                            },
                            'variable-fx-override-min'
                        )}
                        {overrideRow(
                            localizeWithFallback('wiredfurni.params.variablefx.override_max', 'Take the maximum from a variable'),
                            params.overrideMaxEnabled,
                            params.overrideMaxTarget,
                            variables.overrideMax,
                            (enabled, target, token) => {
                                patch({ overrideMaxEnabled: enabled, overrideMaxTarget: target });
                                patchVariables({ overrideMax: token });
                            },
                            'variable-fx-override-max'
                        )}
                    </>
                )}

                {category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS && (
                    <Text small={true}>
                        {localizeWithFallback(
                            'wiredfurni.params.variablefx.level_hint',
                            'Levels come from the level-up system addon on the same tile; without one the badge shows level 1.'
                        )}
                    </Text>
                )}
            </div>
        </WiredExtraBaseView>
    );
};
