import { BundleDiscountRuleset, BundleDiscountRulesetMessageEvent, GetBundleDiscountRulesetComposer } from '@volt/renderer';
import { UseQueryResult } from '@tanstack/react-query';
import { useVoltQuery } from '../../api/volt-query';

export const useCatalogBundleDiscountRuleset = (options: { enabled?: boolean } = {}): UseQueryResult<BundleDiscountRuleset> =>
    useVoltQuery<BundleDiscountRulesetMessageEvent, BundleDiscountRuleset>({
        key: ['volt', 'catalog', 'bundleDiscountRuleset'],
        request: () => new GetBundleDiscountRulesetComposer(),
        parser: BundleDiscountRulesetMessageEvent,
        select: (event) => event.getParser().bundleDiscountRuleset,
        enabled: options.enabled,
        staleTime: Infinity
    });
