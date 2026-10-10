import { GetMarketplaceConfigurationMessageComposer, MarketplaceConfigurationEvent, MarketplaceConfigurationMessageParser } from '@volt/renderer';
import { UseQueryResult } from '@tanstack/react-query';
import { useVoltQuery } from '../../api/volt-query';

/**
 * Marketplace configuration (commission rates, min/max ask, etc.) as
 * returned by GetMarketplaceConfigurationMessageComposer →
 * MarketplaceConfigurationEvent. Cached at session level — the values
 * are server-side constants for the duration of a session.
 *
 * Replaces the previous pattern where MarketplacePostOfferView
 * stuffed the parser into catalogOptions.marketplaceConfiguration
 * via setCatalogOptions inside its own listener, and dispatched
 * GetMarketplaceConfigurationMessageComposer from an effect that
 * checked the same field as the cache. With useVoltQuery, the cache
 * is React Query's; the component just reads `data`.
 */
export const useMarketplaceConfiguration = (options: { enabled?: boolean } = {}): UseQueryResult<MarketplaceConfigurationMessageParser> =>
    useVoltQuery<MarketplaceConfigurationEvent, MarketplaceConfigurationMessageParser>({
        key: ['volt', 'catalog', 'marketplaceConfiguration'],
        request: () => new GetMarketplaceConfigurationMessageComposer(),
        parser: MarketplaceConfigurationEvent,
        select: (event) => event.getParser(),
        enabled: options.enabled,
        staleTime: Infinity
    });
