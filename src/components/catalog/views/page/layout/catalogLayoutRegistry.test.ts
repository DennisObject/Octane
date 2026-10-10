import { describe, expect, it } from 'vitest';
import { getCatalogLayoutDefinition } from './catalogLayoutRegistry';

describe('catalog layout registry', () => {
    it('resolves server aliases to explicit renderers', () => {
        expect(getCatalogLayoutDefinition('frontpage4')?.renderer).toBe('frontpage');
        expect(getCatalogLayoutDefinition('guild_custom_furni')?.renderer).toBe('guildCustomFurni');
        expect(getCatalogLayoutDefinition('club_gifts')?.renderer).toBe('clubGifts');
        expect(getCatalogLayoutDefinition('default_3x3')?.renderer).toBe('default');
    });

    it('rejects unknown layout identifiers instead of treating them as standard pages', () => {
        expect(getCatalogLayoutDefinition('future_layout')).toBeNull();
    });

    it('sells club days on the loyalty vip page instead of showing an information page', () => {
        expect(getCatalogLayoutDefinition('loyalty_vip_buy')?.renderer).toBe('vipBuy');
        expect(getCatalogLayoutDefinition('vip_buy')?.renderer).toBe('vipBuy');
    });
});
