import { describe, expect, it } from 'vitest';
import { shouldVirtualizeCatalogOffers } from './catalogGridPerformance.helpers';

describe('catalog grid performance policy', () => {
    it('virtualizes the large pages that exist in the live catalog', () => {
        expect(shouldVirtualizeCatalogOffers(240)).toBe(true);
        expect(shouldVirtualizeCatalogOffers(101)).toBe(true);
        expect(shouldVirtualizeCatalogOffers(90)).toBe(false);
    });
});
