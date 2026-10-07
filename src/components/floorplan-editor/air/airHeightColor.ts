/** Official HeightMapEditor HSL ramp. WIN63-202609091217-117204808, 30 levels. */

const hue2rgb = (p: number, q: number, t: number): number => {
    let channel = t;
    if (channel < 0) channel += 1;
    if (channel > 1) channel -= 1;
    if (channel < 1 / 6) return p + (q - p) * 6 * channel;
    if (channel < 1 / 2) return q;
    if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
    return p;
};

/** HeightMapEditor.hslToRgb. Channels are 0..1 multipliers. s==0 returns the lightness. */
export const airHslMultipliers = (h: number, s: number, l: number): [number, number, number] => {
    if (s === 0) return [l, l, l];

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return [
        hue2rgb(p, q, h + 1 / 3),
        hue2rgb(p, q, h),
        hue2rgb(p, q, h - 1 / 3)
    ];
};

/** Byte palette for the height bar. createTileHeightColorMap stores uint(255 * channel). */
export const airHslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    const [red, green, blue] = airHslMultipliers(h, s, l);

    return [Math.trunc(red * 255), Math.trunc(green * 255), Math.trunc(blue * 255)];
};

/** Hue for level i, matching `0.6 - i / 30 * 0.85`, wrapped into 0..1. */
export const airHeightHue = (level: number): number => {
    const i = Math.max(0, Math.min(29, level | 0));
    let hue = 0.6 - (i / 30) * 0.85;
    if (hue < 0) hue += 1;
    return hue;
};

export const airHeightMultipliers = (level: number, occupied = false): [number, number, number] => {
    const hue = airHeightHue(level);

    return occupied ? airHslMultipliers(hue, 0.33, 0.4) : airHslMultipliers(hue, 1, 0.5);
};

export const airHeightRgb = (level: number, occupied = false): [number, number, number] => {
    const hue = airHeightHue(level);

    return occupied ? airHslToRgb(hue, 0.33, 0.4) : airHslToRgb(hue, 1, 0.5);
};

/** The running client rounds each ColorTransform product to the nearest byte (34 * 0.4 -> 14, 255 * 0.4 -> 102). */
const roundChannel = (value: number): number => Math.round(value);

/** Tile ColorTransform. Multipliers are the HSL floats, not the bar bytes. Alpha stays 1. */
export const applyTileColor = (
    red: number,
    green: number,
    blue: number,
    alpha: number,
    redMultiplier: number,
    greenMultiplier: number,
    blueMultiplier: number
): [number, number, number, number] => [
    roundChannel(red * redMultiplier),
    roundChannel(green * greenMultiplier),
    roundChannel(blue * blueMultiplier),
    alpha
];

/** Flash ColorTransform multiply by a byte color. Alpha multiplier stays 1, so PNG alpha is unchanged. */
export const applySkinColor = (
    red: number,
    green: number,
    blue: number,
    alpha: number,
    redByte: number,
    greenByte: number,
    blueByte: number
): [number, number, number, number] => [
    Math.trunc(red * redByte / 255),
    Math.trunc(green * greenByte / 255),
    Math.trunc(blue * blueByte / 255),
    alpha
];

export const airHeightHex = (level: number, occupied = false): string => {
    const [r, g, b] = airHeightRgb(level, occupied);
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};
