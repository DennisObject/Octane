import { CreateLinkEvent } from '@octane/renderer';
import { FC, useCallback, useMemo } from 'react';
import { CatalogPageName, GetConfigurationValue, LocalizeFormattedNumber, LocalizeShortNumber, localizeWithFallback } from '../../../api';
import creditsIcon from '../../../assets/images/purse/air/credits.png';
import diamondIcon from '../../../assets/images/purse/air/diamond.png';
import ducketsIcon from '../../../assets/images/purse/air/duckets.png';
import { LayoutCurrencyIcon } from '../../../common';

interface CurrencyViewProps {
    type: number;
    amount: number;
    short: boolean;
}

const AIR_PURSE_ICONS: Record<number, string> = {
    [-1]: creditsIcon,
    0: ducketsIcon,
    5: diamondIcon
};

// purse_xml tool_tip_caption of each currency button.
const TOOLTIP_KEYS: Record<number, [string, string]> = {
    [-1]: ['purse_coins', 'Credits'],
    0: ['achievements.activitypoint.0', 'Duckets'],
    5: ['achievements.activitypoint.5', 'Diamonds']
};

export const CurrencyView: FC<CurrencyViewProps> = (props) => {
    const { type = -1, amount = -1, short = false } = props;
    // The v75 purse prints balance.toString(); the short form is only for currency.display.number.short.
    const displayAmount = useMemo(() => (short ? LocalizeShortNumber(amount).toLowerCase() : amount.toString()), [amount, short]);
    const airIcon = AIR_PURSE_ICONS[type];
    const tooltip = TOOLTIP_KEYS[type] ? localizeWithFallback(TOOLTIP_KEYS[type][0], TOOLTIP_KEYS[type][1]) : undefined;

    // credits open the web shop, duckets and diamonds open their catalog info pages.
    const onClick = useCallback(() => {
        switch (type) {
            case -1: {
                const url = GetConfigurationValue<string>('web.shop.relative.url', '');

                if (url) window.open(url, '_blank');

                return;
            }
            case 0:
                CreateLinkEvent('catalog/open/' + CatalogPageName.DUCKET_INFO);
                return;
            case 5:
                CreateLinkEvent('catalog/open/' + CatalogPageName.LOYALTY_INFO);
                return;
        }
    }, [type]);

    return (
        <div className={`octane-purse-currency group relative octane-purse-currency--${type}`}>
            <button type="button" aria-label={tooltip} className={`octane-purse-button allcurrencypurse currency-info currency-${type}`} onClick={onClick}>
                <span className="octane-purse-button__amount currency-text">{displayAmount}</span>
                {airIcon ? <img src={airIcon} alt="" className="octane-purse-air-currency" /> : <LayoutCurrencyIcon type={type} />}
            </button>
            {short && (
                <div
                    role="tooltip"
                    className="pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100"
                >
                    {LocalizeFormattedNumber(amount)}
                </div>
            )}
        </div>
    );
};
