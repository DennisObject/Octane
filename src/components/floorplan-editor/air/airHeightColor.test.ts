import { describe, expect, it } from 'vitest';
import { airHeightHex, airHeightMultipliers, airHeightRgb, applySkinColor, applyTileColor } from './airHeightColor';

describe('applySkinColor', () => {
    it('multiplies RGB with trunc and keeps the PNG alpha', () => {
        expect(applySkinColor(255, 255, 255, 128, 0x0b, 0xb3, 0xe3)).toEqual([0x0b, 0xb3, 0xe3, 128]);
        expect(applySkinColor(0, 0, 0, 0, 0x0b, 0xb3, 0xe3)).toEqual([0, 0, 0, 0]);
        expect(applySkinColor(217, 217, 217, 203, 0xaa, 0xaa, 0xaa)).toEqual([144, 144, 144, 203]);
        expect(applySkinColor(255, 255, 255, 255, 0, 0, 0)).toEqual([0, 0, 0, 255]);
        expect(applySkinColor(255, 255, 255, 0, 0, 0, 0)).toEqual([0, 0, 0, 0]);
    });

    it('keeps the byte palette separate from the tile multiplier', () => {
        const [, green] = airHeightMultipliers(0, false);
        const [, greenByte] = airHeightRgb(0, false);

        expect(green.toFixed(8)).toBe('0.40000000');
        expect(greenByte).toBe(101);
        expect(airHeightHex(0, false)).toBe('#0065ff');
        expect(applyTileColor(189, 189, 189, 255, 0, green, 1)).toEqual([0, 75, 189, 255]);
        expect(Math.trunc(189 * greenByte / 255)).toBe(74);
        expect(applySkinColor(189, 189, 189, 255, 0, greenByte, 255)[1]).toBe(74);
    });
});
