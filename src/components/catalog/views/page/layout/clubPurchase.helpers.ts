export interface ClubOfferLike {
    offerId: number;
    vip: boolean;
    months: number;
}

export interface ClubMembershipLike {
    clubDays: number;
    clubPeriods: number;
    isVip: boolean;
}

// The loyalty page sells the same club offers as the vip page, priced in the loyalty currency.
export const isVipPurchaseLayout = (layoutCode: string): boolean => layoutCode === 'vip_buy' || layoutCode === 'loyalty_vip_buy';

// Same rules as ClubBuyController.onOffers / VipBuyCatalogWidget.showOffer: VIP offers only, month terms only,
// ordered by term, narrowed to catalog.vip.buy.promo when that list is set.
export const getVipBuyOffers = <TOffer extends ClubOfferLike>(offers: readonly TOffer[], promotedMonthsCsv: string): TOffer[] => {
    const promotedMonths = promotedMonthsCsv
        .split(',')
        .map((value) => parseInt(value, 10))
        .filter((months) => !Number.isNaN(months) && months > 0);

    return offers
        .filter((offer) => offer.vip && offer.months > 0 && (promotedMonths.length === 0 || promotedMonths.includes(offer.months)))
        .sort((first, second) => first.months - second.months);
};

export const groupClubOffers = <TOffer extends ClubOfferLike>(layoutCode: string, offers: readonly TOffer[], promotedMonthsCsv = '') => {
    if (isVipPurchaseLayout(layoutCode)) {
        const vip = getVipBuyOffers(offers, promotedMonthsCsv);

        return { hc: [] as TOffer[], vip, visible: vip };
    }

    const vip = offers.filter((offer) => offer.vip);
    const hc = offers.filter((offer) => !offer.vip);

    return { hc, vip, visible: [...hc, ...vip] };
};

export const getClubMembershipSummary = (membership: ClubMembershipLike | null) => {
    if (!membership) return { active: false, tier: 'none' as const, totalDays: 0 };

    const totalDays = Math.max(0, membership.clubPeriods) * 31 + Math.max(0, membership.clubDays);

    if (!totalDays) return { active: false, tier: 'none' as const, totalDays: 0 };

    return {
        active: true,
        tier: membership.isVip ? ('vip' as const) : ('hc' as const),
        totalDays
    };
};

// nitro's ExternalTexts.json cuts catalog.vip.buy.hccenter off at '<a href'. The official text is used whenever the anchor is incomplete.
const HC_CENTER_LINK_OFFICIAL = 'Find out about HC Payday, gifts, benefits and more in the <a href="event:habboUI/open/hccenter">HC Center >></a>';

export const getHcCenterLinkHtml = (localized: string): string => (localized.includes('</a>') ? localized : HC_CENTER_LINK_OFFICIAL);
