import { GetConfigurationValue } from '../volt';
import { localizeWithFallback } from '../utils';

// Port of the AIR currency type table (com.sulake.habbo.catalog.purse, WIN63-202609091217).
const ActivityPointType = {
    CREDITS: -1,
    DUCKET: 0,
    SUBSCRIPTION_POINT: 3,
    DIAMOND: 5,
    SILVER: 1000,
    EMERALD: 1001
} as const;

// createSeasonalCurrencyIconMap: seasonalcurrency.id.<type> names -> [small, big] icon styles.
const SEASONAL_ICON_STYLES: Record<string, [number, number]> = {
    snowflakes: [27, 27],
    horseshoes: [31, 30],
    nuts: [39, 38],
    stars: [45, 44],
    clouds: [46, 47],
    plain_pumpkins: [49, 50],
    seashells: [55, 55],
    flowers: [59, 58],
    candy: [61, 60],
    popsicles: [63, 62],
    golden_fishes: [65, 64],
    balloons: [67, 66],
    pumpkins: [69, 68],
    easter_eggs: [73, 72],
    truffles: [75, 74],
    blue_balloons: [77, 76],
    mushrooms: [79, 78],
    acorn: [81, 80],
    coconuts: [83, 82],
    cards: [85, 84],
    letter: [87, 86]
};

// habbo_skin_icon_set_xml regions (x, y, width, height) in habbo_icons_png for the currency icon styles.
export const ACTIVITY_POINT_ICON_REGIONS: Record<number, [number, number, number, number]> = {
    27: [57, 16, 21, 20],
    30: [116, 16, 22, 22],
    31: [244, 0, 14, 14],
    32: [160, 16, 22, 22],
    33: [272, 0, 14, 14],
    34: [138, 16, 22, 22],
    35: [258, 0, 14, 14],
    36: [182, 16, 22, 22],
    37: [286, 0, 14, 14],
    38: [204, 17, 22, 20],
    39: [301, 0, 14, 14],
    40: [228, 17, 53, 20],
    41: [283, 18, 19, 19],
    42: [316, 1, 11, 11],
    43: [305, 17, 55, 20],
    44: [360, 16, 22, 22],
    45: [328, 0, 14, 14],
    46: [343, 1, 14, 12],
    47: [384, 18, 19, 20],
    48: [405, 17, 50, 20],
    49: [358, 0, 13, 13],
    50: [456, 16, 22, 21],
    51: [479, 16, 54, 21],
    53: [534, 16, 22, 22],
    54: [371, 0, 14, 14],
    55: [433, 40, 20, 20],
    56: [512, 39, 20, 20],
    57: [385, 1, 11, 11],
    58: [458, 41, 19, 19],
    59: [398, 1, 12, 12],
    60: [481, 42, 18, 16],
    61: [412, 1, 12, 10],
    62: [419, 41, 11, 19],
    63: [426, 1, 8, 12],
    64: [536, 42, 19, 15],
    65: [436, 1, 12, 10],
    66: [559, 39, 13, 18],
    67: [451, 1, 9, 12],
    68: [574, 39, 18, 18],
    69: [462, 0, 12, 12],
    70: [594, 39, 20, 20],
    71: [476, 0, 12, 12],
    72: [616, 39, 14, 17],
    73: [490, 0, 10, 12],
    74: [553, 19, 16, 16],
    75: [501, 0, 12, 12],
    76: [571, 18, 12, 18],
    77: [514, 0, 9, 12],
    78: [584, 18, 16, 18],
    79: [524, 0, 12, 12],
    80: [601, 18, 15, 18],
    81: [537, 0, 11, 12],
    82: [617, 18, 18, 18],
    83: [549, 0, 12, 12],
    84: [636, 18, 15, 18],
    85: [562, 0, 11, 12],
    86: [631, 37, 17, 15],
    87: [574, 0, 12, 11]
};

export const IsSeasonalActivityPointType = (type: number): boolean => type >= 101 && type <= 105;

// getIconStyleFor: the icon style for a currency type, 0 when the hotel configures none.
export const GetActivityPointIconStyle = (type: number, big: boolean, combo: boolean = false): number => {
    if (type === ActivityPointType.CREDITS || type === 7) return big ? 34 : 35;
    if (type === ActivityPointType.DUCKET) return big ? 32 : 33;
    if (type === ActivityPointType.SUBSCRIPTION_POINT) return big ? 36 : 37;
    if (type === ActivityPointType.DIAMOND) {
        if (GetConfigurationValue<boolean>('diamonds.enabled', false)) return big ? 41 : 42;

        return big ? 53 : 54;
    }
    if (type === ActivityPointType.SILVER) return big ? 56 : 57;
    if (type === ActivityPointType.EMERALD) return big ? 70 : 71;

    if (IsSeasonalActivityPointType(type)) {
        const styles = SEASONAL_ICON_STYLES[GetConfigurationValue<string>(`seasonalcurrency.id.${type}`, '')];

        if (styles) return big ? styles[1] : styles[0];
    }

    return Number(GetConfigurationValue<number>(`currencyiconstyle.${big ? 'big' : 'small'}.${type}${combo ? '.combo' : ''}`, 0)) || 0;
};

// getActivityPointName: activitypoint.name.<type> holds a text key, which is then localized.
export const GetActivityPointName = (type: number): string => {
    const key = GetConfigurationValue<string>(`activitypoint.name.${type}`, '');

    return key ? localizeWithFallback(key, key) : '';
};
