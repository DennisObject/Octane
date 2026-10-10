import { IWiredVariableFxConfig } from '@volt/renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import {
    formatWiredVariableFxValue,
    resolveWiredVariableFxColor,
    resolveWiredVariableFxRange,
    WIRED_FX_CONFIG_EXTRA,
    WIRED_FX_RENDERER,
    wiredVariableFxLevel,
    wiredVariableFxProgress,
    wiredVariableFxVisibleUntil,
    wiredVariableFxWidthPx
} from '../../../../api';
import { IWiredVariableFxStatusEntry } from '../../../../hooks';
import { classNames } from '../../../../layout';
import { wiredVariableFxIconGlyph, wiredVariableFxSegmentFills } from './WiredVariableFxOverlay.helpers';

export interface WiredVariableFxStatusViewProps {
    config: IWiredVariableFxConfig;
    entry: IWiredVariableFxStatusEntry;
}

const Icon: FC<{ icon: string }> = ({ icon }) => {
    if (!icon) return null;

    return (
        <span className={`volt-wired-fx__icon volt-wired-fx__icon--${icon}`} title={icon.replace(/_/g, ' ')}>
            {wiredVariableFxIconGlyph(icon)}
        </span>
    );
};

const Bar: FC<{ rendererId: number; progress: number; segments: number; color: string | null; widthPx: number; metallic?: boolean }> = (props) => {
    const { rendererId, progress, segments, color, widthPx, metallic = false } = props;
    const modifier =
        rendererId === WIRED_FX_RENDERER.BLOCK
            ? 'block'
            : rendererId === WIRED_FX_RENDERER.STRIPED
              ? 'striped'
              : rendererId === WIRED_FX_RENDERER.ARROW
                ? 'arrow'
                : rendererId === WIRED_FX_RENDERER.CLASSIC_MINI
                  ? 'mini'
                  : rendererId === WIRED_FX_RENDERER.THERMOMETER
                    ? 'thermometer'
                    : rendererId === WIRED_FX_RENDERER.HEALTH_BAR || rendererId === WIRED_FX_RENDERER.HEALTH_CROSS
                      ? 'health'
                      : 'plain';
    const style = { width: widthPx, ['--fx-color' as string]: color ?? undefined } as CSSProperties;

    if (segments > 0) {
        return (
            <div className={classNames('volt-wired-fx__bar', `volt-wired-fx__bar--${modifier}`, 'volt-wired-fx__bar--segmented', metallic ? 'volt-wired-fx__bar--metallic' : '')} style={style} data-testid="fx-bar">
                {wiredVariableFxSegmentFills(progress, segments).map((fill, index) => (
                    <span key={index} className="volt-wired-fx__segment" style={{ ['--fx-fill' as string]: fill } as CSSProperties} />
                ))}
            </div>
        );
    }

    return (
        <div className={classNames('volt-wired-fx__bar', `volt-wired-fx__bar--${modifier}`, metallic ? 'volt-wired-fx__bar--metallic' : '')} style={style} data-testid="fx-bar">
            <span className="volt-wired-fx__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
    );
};

/** One drawn value; picks the markup by the config's renderer. */
export const WiredVariableFxStatusView: FC<WiredVariableFxStatusViewProps> = (props) => {
    const { config, entry } = props;
    const [, setTick] = useState(0);
    const visibility = wiredVariableFxVisibleUntil(config, entry.changedAt, Date.now());

    // "Show while changing": re-render once the show duration since the last change has passed.
    useEffect(() => {
        if (visibility.until === null || !visibility.visible) return;

        const timer = window.setTimeout(() => setTick((tick) => tick + 1), Math.max(0, visibility.until - Date.now()) + 10);

        return () => window.clearTimeout(timer);
    }, [visibility.until, visibility.visible]);

    if (!visibility.visible) return null;

    const status = entry.status;
    const range = resolveWiredVariableFxRange(config, status);
    const progress = wiredVariableFxProgress(status.value, range.min, range.max);
    const color = resolveWiredVariableFxColor(config, status);
    const widthPx = wiredVariableFxWidthPx(config.widthId);
    const segments = parseInt(config.extra?.[WIRED_FX_CONFIG_EXTRA.SEGMENTS] ?? '0', 10) || 0;
    const icon = config.extra?.[WIRED_FX_CONFIG_EXTRA.ICON] ?? '';
    const metallic = config.extra?.[WIRED_FX_CONFIG_EXTRA.METALLIC] === 'true';
    const changed = entry.previousValue !== null && entry.previousValue !== status.value && !status.initialize;
    const rootClass = classNames('volt-wired-fx', `volt-wired-fx--renderer-${config.rendererId}`, changed ? 'volt-wired-fx--changed' : '');

    switch (config.rendererId) {
        case WIRED_FX_RENDERER.HEARTS: {
            const hearts = segments > 0 ? segments : 5;

            return (
                <div className={rootClass} style={{ ['--fx-color' as string]: color ?? undefined } as CSSProperties} data-testid="fx-status">
                    {wiredVariableFxSegmentFills(progress, hearts).map((fill, index) => (
                        <span key={index} className="volt-wired-fx__heart" style={{ ['--fx-fill' as string]: fill } as CSSProperties}>
                            ♥
                        </span>
                    ))}
                </div>
            );
        }
        case WIRED_FX_RENDERER.HEALTH_CROSS:
            return (
                <div className={rootClass} data-testid="fx-status">
                    <span className="volt-wired-fx__cross">✚</span>
                    <Bar rendererId={config.rendererId} progress={progress} segments={segments} color={color ?? '#e04b4b'} widthPx={widthPx} />
                </div>
            );
        case WIRED_FX_RENDERER.LEVEL_WITH_PROGRESS: {
            const level = wiredVariableFxLevel(status);
            const subRenderer = parseInt(config.extra?.[WIRED_FX_CONFIG_EXTRA.SUB_RENDERER] ?? '', 10) || WIRED_FX_RENDERER.BLOCK;

            return (
                <div className={rootClass} data-testid="fx-status">
                    <span className={classNames('volt-wired-fx__level', level.maxed ? 'volt-wired-fx__level--maxed' : '')} style={{ ['--fx-color' as string]: color ?? undefined } as CSSProperties}>
                        {level.level}
                    </span>
                    <Bar rendererId={subRenderer} progress={level.maxed ? 1 : progress} segments={segments} color={color} widthPx={widthPx} />
                </div>
            );
        }
        case WIRED_FX_RENDERER.LEVEL_DETAILS: {
            const level = wiredVariableFxLevel(status);

            return (
                <div className={classNames(rootClass, 'volt-wired-fx--details')} data-testid="fx-status">
                    <span className="volt-wired-fx__level-text" style={{ color: color ?? undefined }}>
                        Lv {level.level}
                        {level.maxLevel > 1 ? ` / ${level.maxLevel}` : ''}
                    </span>
                    <span className="volt-wired-fx__value">{level.maxed ? 'MAX' : `${formatWiredVariableFxValue(status.value - range.min)} / ${formatWiredVariableFxValue(range.max - range.min)}`}</span>
                </div>
            );
        }
        case WIRED_FX_RENDERER.BOSS: {
            const alignment = config.extra?.[WIRED_FX_CONFIG_EXTRA.ICON_ALIGNMENT] ?? 'left';

            return (
                <div className={classNames(rootClass, 'volt-wired-fx--boss')} style={{ ['--fx-color' as string]: color ?? undefined } as CSSProperties} data-testid="fx-status">
                    {(alignment === 'left' || alignment === 'double') && <Icon icon={icon} />}
                    <div className="volt-wired-fx__boss-body">
                        <Bar rendererId={WIRED_FX_RENDERER.PLAIN} progress={progress} segments={0} color={color ?? '#e04b4b'} widthPx={Math.max(widthPx * 3, 220)} />
                        <span className="volt-wired-fx__boss-text">
                            {formatWiredVariableFxValue(status.value)} / {formatWiredVariableFxValue(range.max)}
                        </span>
                    </div>
                    {(alignment === 'right' || alignment === 'double') && <Icon icon={icon} />}
                </div>
            );
        }
        case WIRED_FX_RENDERER.NUMBER_STYLED:
        case WIRED_FX_RENDERER.NUMBER_FREEZE: {
            const design = config.extra?.[WIRED_FX_CONFIG_EXTRA.DESIGN] ?? 'freeze_style';
            const alignment = config.extra?.[WIRED_FX_CONFIG_EXTRA.ICON_ALIGNMENT] ?? 'left';

            return (
                <div className={classNames(rootClass, 'volt-wired-fx--number', `volt-wired-fx--design-${design}`)} style={{ color: color ?? undefined }} data-testid="fx-status">
                    {(alignment === 'left' || alignment === 'double') && <Icon icon={icon} />}
                    <span className="volt-wired-fx__number">{formatWiredVariableFxValue(status.value)}</span>
                    {(alignment === 'right' || alignment === 'double') && <Icon icon={icon} />}
                </div>
            );
        }
        default:
            return (
                <div className={rootClass} data-testid="fx-status">
                    <Icon icon={icon} />
                    <Bar rendererId={config.rendererId} progress={progress} segments={segments} color={color} widthPx={widthPx} metallic={metallic} />
                </div>
            );
    }
};
