import { CreateLinkEvent } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { GetActivityPointName, GetConfigurationValue, LocalizeFormattedNumber, localizeWithFallback } from '../../../api';
import { LayoutActivityPointIcon, UsesActivityPointIcon } from '../../../common';

interface SeasonalViewProps {
    type: number;
    amount: number;
}

// purse_indicator_seasonal_xml defaults: badge border 0x7adde9, name colour 0xbb7dc3.
const DEFAULT_BADGE_COLOR = '#7adde9';
const DEFAULT_NAME_COLOR = '#bb7dc3';

// Currency indicator base (Vg): a 40ms timer advances the change progress by 0.025, so a balance change runs for 40 ticks (1.6s).
const CHANGE_TICK_MS = 40;
const CHANGE_STEP = 0.025;
const INDICATOR_WIDTH = 192;
const OVERLAY_WIDTH = 33;

interface BalanceChange {
    id: number;
    from: number;
    to: number;
    progress: number;
}

// Tracks the last balance seen for this type; a later balance of the same type starts a change, the first one and a type switch do not.
const useBalanceChange = (type: number, amount: number): BalanceChange | null => {
    const [seen, setSeen] = useState({ type, amount, count: 0 });
    const [change, setChange] = useState<BalanceChange | null>(null);
    const changeId = change?.id ?? 0;

    if (seen.type !== type) {
        setSeen({ type, amount, count: seen.count });
        setChange(null);
    } else if (seen.amount !== amount) {
        setSeen({ type, amount, count: seen.count + 1 });
        setChange({ id: seen.count + 1, from: seen.amount, to: amount, progress: 0 });
    }

    useEffect(() => {
        if (changeId === 0) return;

        const timer = setInterval(() => {
            setChange((previous) => {
                if (!previous || previous.id !== changeId) return previous;

                const progress = previous.progress + CHANGE_STEP;

                return progress >= 1 - CHANGE_STEP ? null : { ...previous, progress };
            });
        }, CHANGE_TICK_MS);

        return () => clearInterval(timer);
    }, [changeId]);

    return change;
};

const toCssColor = (value: string, fallback: string): string => {
    const hex = (value ?? '').trim().replace(/^(#|0x)/i, '');

    return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex}` : fallback;
};

export const SeasonalView: FC<SeasonalViewProps> = (props) => {
    const { type = -1, amount = -1 } = props;
    // The indicator icon is getIconStyleFor(type, big); a type without a style keeps the hotel's wallet icon.
    const hasAirIcon = UsesActivityPointIcon(type, true);
    const iconUrl = hasAirIcon ? '' : GetConfigurationValue<string>('currency.asset.icon.url', '').replace('%type%', type.toString());
    // seasonalcurrency.id.<type> names the currency, seasonalcurrency.<id>.color its preset, which sets border and font colour.
    const currencyId = GetConfigurationValue<string>(`seasonalcurrency.id.${type}`, '');
    const preset = currencyId
        ? GetConfigurationValue<string>(`seasonalcurrency.${currencyId}.color`, GetConfigurationValue<string>('currency.seasonal.color', ''))
        : GetConfigurationValue<string>('currency.seasonal.color', '');
    // Without a preset there are no border/font keys to read, so the XML defaults stay.
    const badgeColor = toCssColor(preset ? GetConfigurationValue<string>(`seasonalcurrency.preset.${preset}.border`, '') : '', DEFAULT_BADGE_COLOR);
    const nameColor = toCssColor(preset ? GetConfigurationValue<string>(`seasonalcurrency.preset.${preset}.font`, '') : '', DEFAULT_NAME_COLOR);
    const page = GetConfigurationValue<string>('seasonalcurrencyindicator.page', '');
    // v75 looks the name up as activitypoint.name.<type> and localizes that key; the old purse.seasonal.currency.<type> only covers a missing config.
    const name = GetActivityPointName(type) || localizeWithFallback(`purse.seasonal.currency.${type}`, '');
    const formattedAmount = LocalizeFormattedNumber(amount);
    const change = useBalanceChange(type, amount);
    // The counter holds the old balance for the first half of the change, then counts to the new one.
    const shownAmount = change ? Math.trunc(change.from + Math.max(0, change.progress * 2 - 1) * (change.to - change.from)) : amount;
    // A zero balance shows the info text instead of the number.
    const amountText = shownAmount === 0 ? localizeWithFallback('purse.snowflakes.zero.amount.text', 'Info') : shownAmount.toString();
    const overlayT = change ? 4 * (change.progress - 0.5) ** 3 + 0.5 : 0;

    return (
        <button
            type="button"
            className="octane-purse-seasonal-currency"
            style={{ '--seasonal-badge': badgeColor, '--seasonal-name': nameColor } as CSSProperties}
            onClick={() => {
                if (page) CreateLinkEvent('catalog/open/' + page);
            }}
        >
            <span className="seasonal-text">{name}</span>
            <span className={`seasonal-amount${shownAmount === 0 ? ' is-info' : ''}`} title={formattedAmount}>
                {amountText}
            </span>
            <span className="seasonal-badge">
                {hasAirIcon && <LayoutActivityPointIcon big className="seasonal-icon" type={type} />}
                {iconUrl && <img src={iconUrl} alt="" className="seasonal-image" />}
            </span>
            {change && (
                <span
                    className="seasonal-change"
                    style={{ left: overlayT * (INDICATOR_WIDTH - OVERLAY_WIDTH), opacity: Math.min(1, Math.max(0, 1 - Math.abs(0.5 - overlayT) * 2)) }}
                >
                    {`${change.to > change.from ? '+' : ''}${change.to - change.from}`}
                </span>
            )}
        </button>
    );
};
