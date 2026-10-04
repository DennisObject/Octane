import { describe, expect, it } from 'vitest';
import { getClubMembershipSummary } from './clubPurchase.helpers';

describe('club purchase rules', () => {
    it('returns a safe inactive membership state before purse data is available', () => {
        expect(getClubMembershipSummary(null)).toEqual({ active: false, tier: 'none', totalDays: 0 });
    });

    it('distinguishes active HC and VIP memberships', () => {
        expect(getClubMembershipSummary({ clubDays: 2, clubPeriods: 1, isVip: false })).toEqual({
            active: true,
            tier: 'hc',
            totalDays: 33
        });
        expect(getClubMembershipSummary({ clubDays: 4, clubPeriods: 0, isVip: true })).toEqual({
            active: true,
            tier: 'vip',
            totalDays: 4
        });
    });
});
