import { BASE_VECTOR_X, BASE_VECTOR_Y, COMPONENT_TO_ANGLE, SQRT_TABLE } from './SnowWarTables';

// Integer helpers of the AIR simulation (snowwar/utils). Every value the simulation stores is an
// AS3 int, so results are truncated exactly where AIR assigns to an int.

export const SUBTURN_MS = 50;
export const SUBTURNS_PER_TURN = 3;
export const TILE_WIDTH = 3200;
export const TILE_HALFWIDTH = 1600;

/** `class_4083.javaDiv`: truncate toward zero. */
export const javaDiv = (value: number): number => (value >= 0 ? Math.floor(value) : Math.ceil(value));

/** AS3 `int(x)` / assignment of a Number to an int. */
export const toInt = (value: number): number => value | 0;

/** `Tile.convertToTileX/Y`. */
export const worldToTile = (value: number): number => javaDiv((value + TILE_HALFWIDTH) / TILE_WIDTH);

/** `class_4035.fast_sqrt`. */
export const fastSqrt = (value: number): number =>
{
    value = toInt(value);

    if(value >= 65536)
    {
        if(value >= 16777216)
        {
            if(value >= 268435456)
            {
                if(value >= 1073741824) return SQRT_TABLE[value >> 24] << 8;

                return SQRT_TABLE[value >> 22] << 7;
            }

            if(value >= 67108864) return SQRT_TABLE[value >> 20] << 6;

            return SQRT_TABLE[value >> 18] << 5;
        }

        if(value >= 1048576)
        {
            if(value >= 4194304) return SQRT_TABLE[value >> 16] << 4;

            return SQRT_TABLE[value >> 14] << 3;
        }

        if(value >= 262144) return SQRT_TABLE[value >> 12] << 2;

        return SQRT_TABLE[value >> 10] << 1;
    }

    if(value >= 256)
    {
        if(value >= 4096)
        {
            if(value >= 16384) return SQRT_TABLE[value >> 8];

            return SQRT_TABLE[value >> 6] >> 1;
        }

        if(value >= 1024) return SQRT_TABLE[value >> 4] >> 2;

        return SQRT_TABLE[value >> 2] >> 3;
    }

    if(value >= 0) return SQRT_TABLE[value] >> 4;

    return -1;
};

/** `Direction360.validateDirection360Value` (-360 stays 360, like AIR). */
export const validateDirection360 = (value: number): number =>
{
    if(value > 359) return value % 360;

    if(value < 0) return 360 + (value % 360);

    return value;
};

/** `Direction8.validateDirection8Value`. */
export const validateDirection8 = (value: number): number => value & 7;

/** `Direction8.rotateDirection`. */
export const rotateDirection8 = (direction: number, steps: number): number => validateDirection8(direction + steps);

/** `Direction360.direction360ValueToDirection8`: 0 = N(-y), 2 = E(+x). */
export const direction360ToDirection8 = (value: number): number =>
    validateDirection8(javaDiv(validateDirection360(value - 22) / 45) + 1);

/** `Direction360.direction8ToDirection360Value`. */
export const direction8ToDirection360 = (direction: number): number => ((direction >= 0 && direction <= 7) ? direction * 45 : -1);

/** `Direction8` unit vectors indexed by direction. */
export const DIRECTION8_X: readonly number[] = [ 0, 1, 1, 1, 0, -1, -1, -1 ];
export const DIRECTION8_Y: readonly number[] = [ -1, -1, 0, 1, 1, 1, 0, -1 ];

/** `Direction360.getBaseVectorXComponent(int)`. */
export const baseVectorX = (direction: number): number => BASE_VECTOR_X[validateDirection360(direction)];

/** `Direction360.getBaseVectorYComponent(int)`. */
export const baseVectorY = (direction: number): number => BASE_VECTOR_Y[validateDirection360(direction)];

/** `Direction360.getAngleFromComponents`. */
export const getAngleFromComponents = (x: number, y: number): number =>
{
    x = toInt(x);
    y = toInt(y);

    if(Math.abs(x) <= Math.abs(y))
    {
        if(y === 0) y = 1;

        x = toInt(x * 256);

        let index = javaDiv(x / y);

        if(index < 0) index = -index;
        if(index > 255) index = 255;

        if(y < 0)
        {
            if(x > 0) return COMPONENT_TO_ANGLE[index];

            return 360 - COMPONENT_TO_ANGLE[index];
        }

        if(x > 0) return 180 - COMPONENT_TO_ANGLE[index];

        return 180 + COMPONENT_TO_ANGLE[index];
    }

    if(x === 0) x = 1;

    y = toInt(y * 256);

    let index = javaDiv(y / x);

    if(index < 0) index = -index;
    if(index > 255) index = 255;

    if(y < 0)
    {
        if(x > 0) return 90 - COMPONENT_TO_ANGLE[index];

        return 270 + COMPONENT_TO_ANGLE[index];
    }

    if(x > 0) return 90 + COMPONENT_TO_ANGLE[index];

    return 270 - COMPONENT_TO_ANGLE[index];
};

/** `Location3D.isInDistanceStatic`: strict circle test in the xy plane. */
export const isInDistance = (x1: number, y1: number, x2: number, y2: number, distance: number): boolean =>
{
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);

    if(dy > distance || dx > distance) return false;

    return (dx * dx) + (dy * dy) < (distance * distance);
};

/** `QuickRandom.iterateSeed` (xorshift, arithmetic right shift). */
export const iterateSeed = (seed: number): number =>
{
    seed = toInt(seed);

    if(seed === 0) seed = -1;

    seed ^= seed << 13;
    seed ^= seed >> 17;

    return seed ^ (seed << 5);
};
