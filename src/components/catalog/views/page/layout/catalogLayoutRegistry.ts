export type CatalogLayoutRenderer =
    | 'badgeDisplay'
    | 'clubGifts'
    | 'colorGrouping'
    | 'default'
    | 'frontpage'
    | 'guildCustomFurni'
    | 'guildForum'
    | 'guildFrontpage'
    | 'info'
    | 'infoLoyalty'
    | 'marketplaceOwnItems'
    | 'marketplacePublicItems'
    | 'petCustomization'
    | 'pets'
    | 'pets2'
    | 'pets3'
    | 'roomAds'
    | 'roomBundle'
    | 'recycler'
    | 'recyclerPrizes'
    | 'singleBundle'
    | 'soundMachine'
    | 'spaces'
    | 'soldLimited'
    | 'trophies'
    | 'unavailable'
    | 'vipBuy';

export type CatalogLayoutAvailability = 'ready' | 'planned';

export interface CatalogLayoutDefinition {
    availability: CatalogLayoutAvailability;
    renderer: CatalogLayoutRenderer;
    runtimeCodes: readonly string[];
}

export const CATALOG_LAYOUT_REGISTRY = [
    { runtimeCodes: ['default_3x3'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['club_buy'], renderer: 'vipBuy', availability: 'ready' },
    { runtimeCodes: ['club_gifts', 'club_gift'], renderer: 'clubGifts', availability: 'ready' },
    { runtimeCodes: ['frontpage4', 'frontpage'], renderer: 'frontpage', availability: 'ready' },
    { runtimeCodes: ['pets'], renderer: 'pets', availability: 'ready' },
    { runtimeCodes: ['pets2'], renderer: 'pets2', availability: 'ready' },
    { runtimeCodes: ['pets3'], renderer: 'pets3', availability: 'ready' },
    { runtimeCodes: ['spaces_new'], renderer: 'spaces', availability: 'ready' },
    { runtimeCodes: ['spaces'], renderer: 'spaces', availability: 'ready' },
    { runtimeCodes: ['soundmachine'], renderer: 'soundMachine', availability: 'ready' },
    { runtimeCodes: ['trophies'], renderer: 'trophies', availability: 'ready' },
    { runtimeCodes: ['roomads'], renderer: 'roomAds', availability: 'ready' },
    { runtimeCodes: ['guild_frontpage', 'guilds'], renderer: 'guildFrontpage', availability: 'ready' },
    { runtimeCodes: ['guild_forum'], renderer: 'guildForum', availability: 'ready' },
    { runtimeCodes: ['guild_custom_furni', 'guild_furni'], renderer: 'guildCustomFurni', availability: 'ready' },
    { runtimeCodes: ['vip_buy'], renderer: 'vipBuy', availability: 'ready' },
    { runtimeCodes: ['marketplace'], renderer: 'marketplacePublicItems', availability: 'ready' },
    { runtimeCodes: ['marketplace_own_items'], renderer: 'marketplaceOwnItems', availability: 'ready' },
    { runtimeCodes: ['recycler'], renderer: 'recycler', availability: 'ready' },
    { runtimeCodes: ['recycler_info', 'info_recycler'], renderer: 'info', availability: 'ready' },
    { runtimeCodes: ['recycler_prizes'], renderer: 'recyclerPrizes', availability: 'ready' },
    { runtimeCodes: ['info_loyalty'], renderer: 'infoLoyalty', availability: 'ready' },
    { runtimeCodes: ['info_duckets'], renderer: 'info', availability: 'ready' },
    { runtimeCodes: ['info_rentables'], renderer: 'info', availability: 'ready' },
    { runtimeCodes: ['info_pets'], renderer: 'info', availability: 'ready' },
    { runtimeCodes: ['loyalty_vip_buy'], renderer: 'vipBuy', availability: 'ready' },
    { runtimeCodes: ['badge_display'], renderer: 'badgeDisplay', availability: 'ready' },
    { runtimeCodes: ['bots'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['single_bundle'], renderer: 'singleBundle', availability: 'ready' },
    { runtimeCodes: ['sold_ltd_items'], renderer: 'soldLimited', availability: 'ready' },
    { runtimeCodes: ['plasto'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['default_3x3_color_grouping'], renderer: 'colorGrouping', availability: 'ready' },
    { runtimeCodes: ['recent_purchases'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['room_bundle'], renderer: 'roomBundle', availability: 'ready' },
    { runtimeCodes: ['petcustomization'], renderer: 'petCustomization', availability: 'ready' },
    { runtimeCodes: ['frontpage_featured'], renderer: 'frontpage', availability: 'ready' },
    { runtimeCodes: ['root'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['monkey'], renderer: 'info', availability: 'ready' },
    { runtimeCodes: ['niko'], renderer: 'info', availability: 'ready' },
    { runtimeCodes: ['mad_money'], renderer: 'info', availability: 'ready' },
    { runtimeCodes: ['productpage1'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['collectibles'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['default_3x3_extrainfo'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['pixeleffects'], renderer: 'info', availability: 'ready' }
] as const satisfies readonly CatalogLayoutDefinition[];

const runtimeDefinitions = new Map<string, CatalogLayoutDefinition>();

for (const definition of CATALOG_LAYOUT_REGISTRY) {
    for (const runtimeCode of definition.runtimeCodes) {
        const current = runtimeDefinitions.get(runtimeCode);

        if (current && current.renderer !== definition.renderer) {
            throw new Error(`Catalog layout ${runtimeCode} has conflicting renderers.`);
        }

        runtimeDefinitions.set(runtimeCode, definition);
    }
}

export const getCatalogLayoutDefinition = (runtimeCode: string): CatalogLayoutDefinition | null => runtimeDefinitions.get(runtimeCode) ?? null;

// CatalogViewer.showCatalogPage: page.x = frameWidth - pageWidth - 8, and the left pane hides when that x is below 130.
// The Ubuntu frame is 570px. Every catalog page layout in WIN63-202609161723-93809945 is 360px except layout_frontpage_featured (552).
// frontpage4 is rewritten to frontpage_featured before the asset lookup, so it uses that 552px window too.
const CATALOG_FRAME_WIDTH = 570;
const CATALOG_PAGE_RIGHT_MARGIN = 8;
const CATALOG_LEFT_PANE_MIN_X = 130;
const STANDARD_CATALOG_PAGE_WIDTH = 360;
const FEATURED_FRONT_PAGE_WIDTH = 552;
const FEATURED_FRONT_PAGE_LAYOUTS = new Set(['frontpage', 'frontpage4', 'frontpage_featured']);

export const catalogPageHidesLeftPane = (layoutCode: string | null | undefined): boolean =>
{
    const pageWidth = layoutCode && FEATURED_FRONT_PAGE_LAYOUTS.has(layoutCode) ? FEATURED_FRONT_PAGE_WIDTH : STANDARD_CATALOG_PAGE_WIDTH;

    return CATALOG_FRAME_WIDTH - pageWidth - CATALOG_PAGE_RIGHT_MARGIN < CATALOG_LEFT_PANE_MIN_X;
};
