/** Exact retained AIR32 glyph parser, layout, rasterization and renderer graph. */
type NativeContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

import type {
    AdvancedSetupOptions,
    AlignmentZoneAxis,
    BytePixels,
    ColorChannels,
    CoverageRaster,
    CsmCutoffs,
    CsmRecord,
    DistanceSetup,
    FlattenedPath,
    GlyphPlacement,
    Imp1Glyph,
    Imp1RasterSetup,
    LowNormalSetup,
    NativeBundle,
    NativeFont,
    NativeGlyph,
    NativeLineMetrics,
    NativeProfile,
    NativeRenderOptions,
    NativeTextLayout,
    NormalRasterLine,
    NormalSampleSetup,
    PositionedCoverageRaster,
    RasterCache,
    RasterEdgePoint,
    RasterGrid,
    RasterLine,
    RasterPoint,
    RasterVertex,
    RawNativeProfile,
    SwfFont,
    SwfGlyph,
    TextColor,
    TextPixelTarget,
    TextRenderStyle
} from './NativeTextTypes';

export type { TextPixelTarget, TextRenderStyle } from './NativeTextTypes';

type AdvancedPixelSetup = ReturnType<typeof deriveAir32AdvancedPixelSetup>;
type ResolvedNativeOptions = ReturnType<typeof resolveOptions>;
type NativeGlyphRaster = ReturnType<typeof rasterizeOccurrence>;
type CachedGlyphRaster = NativeGlyphRaster & { originOffsetX: number; originOffsetY: number };
export function roundTiesEven(value: number) {
    if (!isFiniteNumber(value)) throw new TypeError('value must be finite');
    let floor = Math.floor(value),
        fraction = value - floor;
    return fraction < 0.5 ? floor : fraction > 0.5 ? floor + 1 : floor % 2 === 0 ? floor : floor + 1;
}
export function roundRationalTiesEven(numerator: number, denominator: number) {
    if (!isSafeInteger(numerator) || !isSafeInteger(denominator) || numerator < 0 || denominator <= 0)
        throw new RangeError('roundRationalTiesEven requires safe non-negative integers');
    let quotient = Math.floor(numerator / denominator),
        doubledRemainder = (numerator - quotient * denominator) * 2 - denominator;
    return doubledRemainder < 0 ? quotient : doubledRemainder > 0 ? quotient + 1 : quotient % 2 === 0 ? quotient : quotient + 1;
}
export function quantizeAir32AlphaMultiplier(alphaMultiplier: number) {
    if (!isFiniteNumber(alphaMultiplier)) throw new TypeError('alphaMultiplier must be finite');
    let quantized = Math.max(0, Math.min(256, Math.floor(Math.max(0, Math.min(1, alphaMultiplier)) * 256)));
    return Math.max(0, quantized - 1);
}
export function premultiplyAir32Color(color: ColorChannels) {
    let channels = normalizeColor(color),
        alpha = channels[3]!,
        alphaScale = alpha + 1;
    return [Math.floor((channels[0]! * alphaScale) / 256), Math.floor((channels[1]! * alphaScale) / 256), Math.floor((channels[2]! * alphaScale) / 256), alpha];
}
export function blendAir32Component(destination: number, foregroundPremultiplied: number, globalAlpha: number, mask: number) {
    for (let [name, value] of [
        ['destination', destination],
        ['foregroundPremultiplied', foregroundPremultiplied],
        ['globalAlpha', globalAlpha],
        ['mask', mask]
    ] as const)
        if (!Number.isInteger(value) || value < 0 || value > 255) throw new RangeError(`${name} must be an integer from 0 through 255`);
    let scaledDestination = Math.floor((destination * globalAlpha) / 256),
        difference = foregroundPremultiplied - scaledDestination;
    return clampByte(destination + Math.floor((difference * mask) / 256));
}
var componentMaskInverse = buildAir32ComponentMaskInverse();
export function buildAir32ComponentMaskInverse() {
    let inverse = new Uint8Array(256);
    inverse[0]! = 255;
    for (let coverage = 0; coverage <= 255; coverage++) {
        let component = coverage === 0 ? 255 : 255 - Math.ceil((254 * coverage) / 256);
        inverse[component]! === 0 && component !== 255 && (inverse[component]! = coverage);
    }
    return inverse;
}
export function clampByte(value: number) {
    return Math.max(0, Math.min(255, value));
}
export function normalizeColor(color: ColorChannels) {
    if (!isArray(color) && !ArrayBuffer.isView(color)) throw new TypeError('color must be an RGBA array');
    if (color.length !== 4 || [...color].some((e) => !Number.isInteger(e) || e < 0 || e > 255))
        throw new RangeError('RGBA channels must be integers from 0 through 255');
    return color;
}
var defaultCsmTable = Object.freeze({
        dark: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.5299999713897705, inside: 0.25, gamma: 1 }),
            Object.freeze({ pixelSize: 12, outside: -0.4399999976158142, inside: 0.20000000298023224, gamma: 1 }),
            Object.freeze({
                pixelSize: 13.333333969116211,
                outside: -0.43799999356269836,
                inside: 0.23800000548362732,
                gamma: 1
            }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.6000000238418579,
                inside: 0.4000000059604645,
                gamma: 1
            })
        ]),
        light: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.824999988079071, inside: 0.07500000298023224, gamma: 1 }),
            Object.freeze({ pixelSize: 12, outside: -0.824999988079071, inside: 0.02500000037252903, gamma: 1 }),
            Object.freeze({ pixelSize: 16, outside: -0.8199999928474426, inside: 0.11999999731779099, gamma: 1 }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.8600000143051147,
                inside: 0.3400000035762787,
                gamma: 1
            })
        ])
    }),
    defaultDarkCsmTable = defaultCsmTable.dark,
    mediumCsmTable = Object.freeze({
        dark: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.4399999976158142, inside: 0.4359999895095825, gamma: 1 }),
            Object.freeze({
                pixelSize: 10.666666984558105,
                outside: -0.4300000071525574,
                inside: 0.49399998784065247,
                gamma: 1
            }),
            Object.freeze({ pixelSize: 12, outside: -0.41999998688697815, inside: 0.5600000023841858, gamma: 1 }),
            Object.freeze({
                pixelSize: 17.33333396911621,
                outside: -0.41999998688697815,
                inside: 0.5600000023841858,
                gamma: 1
            }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.4699999988079071,
                inside: 0.6100000143051147,
                gamma: 1
            })
        ]),
        light: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.675000011920929, inside: 0.07500000298023224, gamma: 1 }),
            Object.freeze({ pixelSize: 12, outside: -0.5450000166893005, inside: 0.3050000071525574, gamma: 1 }),
            Object.freeze({ pixelSize: 16, outside: -0.5, inside: 0.4399999976158142, gamma: 1 }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.550000011920929,
                inside: 0.6499999761581421,
                gamma: 1
            })
        ])
    }),
    strongCsmTable = Object.freeze({
        dark: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.41999998688697815, inside: 0.5600000023841858, gamma: 1 }),
            Object.freeze({ pixelSize: 16, outside: -0.41999998688697815, inside: 0.5600000023841858, gamma: 1 }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.4699999988079071,
                inside: 0.6100000143051147,
                gamma: 1
            })
        ]),
        light: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.574999988079071, inside: 0.17499999701976776, gamma: 1 }),
            Object.freeze({ pixelSize: 12, outside: -0.39500001072883606, inside: 0.45500001311302185, gamma: 1 }),
            Object.freeze({ pixelSize: 16, outside: -0.41999998688697815, inside: 0.5199999809265137, gamma: 1 }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.550000011920929,
                inside: 0.6499999761581421,
                gamma: 1
            })
        ])
    }),
    csmTables: readonly Readonly<Record<string, readonly CsmRecord[]>>[] = Object.freeze([defaultCsmTable, mediumCsmTable, strongCsmTable]);
export function interpolateCsmTable(pixelSize: number, table: readonly CsmRecord[] = defaultDarkCsmTable) {
    if ((assertFinite('pixelSize', pixelSize), pixelSize < 0)) throw new RangeError('pixelSize must be non-negative');
    if (!isArray(table) || table.length === 0) throw new TypeError('CSM table must contain at least one record');
    let fround = Math.fround,
        roundedSize = fround(pixelSize);
    if (roundedSize <= table[0]!.pixelSize) return { ...table[0]! };
    let last = table.at(-1)!;
    if (roundedSize >= last.pixelSize) return { ...last };
    for (let index = 1; index < table.length; index++) {
        let upper = table[index]!;
        if (roundedSize <= upper.pixelSize) {
            let lower = table[index - 1]!,
                fraction = fround((roundedSize - lower.pixelSize) / (upper.pixelSize - lower.pixelSize));
            return {
                pixelSize: roundedSize,
                outside: fround(lower.outside + (upper.outside - lower.outside) * fraction),
                inside: fround(lower.inside + (upper.inside - lower.inside) * fraction),
                gamma: lower.gamma
            };
        }
    }
    return { ...last };
}
export function applyTextFieldControlsToCutoffs(base: CsmCutoffs, pixelSize: number, thickness: number, sharpness: number) {
    assertFinite('base.outside', base.outside),
        assertFinite('base.inside', base.inside),
        assertFinite('pixelSize', pixelSize),
        assertFinite('thickness', thickness),
        assertFinite('sharpness', sharpness);
    let sharpnessScale = Math.max(-400, Math.min(400, sharpness)) / 1e4,
        thicknessScale = Math.max(-200, Math.min(200, thickness)) / 1e4;
    return {
        outside: base.outside + pixelSize * (sharpnessScale / 2 - thicknessScale),
        inside: base.inside - pixelSize * (sharpnessScale / 2 + thicknessScale),
        gamma: base.gamma ?? 1
    };
}
export function resolveAir32TextFieldCsm(pixelSize: number, thickness = 0, sharpness = 0, colorType = 'dark', csmTableHint = 0) {
    if (!Number.isInteger(csmTableHint) || csmTableHint < 0 || csmTableHint >= csmTables.length) throw new RangeError('csmTableHint must be 0, 1, or 2');
    let table = csmTables[csmTableHint]![colorType]!;
    if (!table) throw new RangeError('colorType must be dark or light');
    return applyTextFieldControlsToCutoffs(interpolateCsmTable(pixelSize, table), pixelSize, thickness, sharpness);
}
export function air32DistanceToMask(distance: number, outside: number, inside: number) {
    if ((assertFinite('distance', distance), assertFinite('outside', outside), assertFinite('inside', inside), outside > inside))
        throw new RangeError('outside cutoff must be <= inside cutoff');
    if (distance < outside) return 0;
    if (distance >= inside || outside === inside) return 255;
    let fround = Math.fround,
        scale = fround(1 / (inside - outside)),
        offset = fround(-outside * scale),
        normalized = fround(fround(distance * scale) + offset);
    return roundTiesEvenInteger(fround(normalized * 255));
}
export function normalSampleCountToDensity(coveredSamples: number) {
    if (!Number.isInteger(coveredSamples) || coveredSamples < 0 || coveredSamples > 16)
        throw new RangeError('coveredSamples must be an integer from 0 through 16');
    return coveredSamples === 0 ? 0 : coveredSamples * 16 - 1;
}
export function assertFinite(name: string, value: number) {
    if (!isFiniteNumber(value)) throw new TypeError(`${name} must be a finite number`);
}
export function roundTiesEvenInteger(value: number) {
    let floor = Math.floor(value),
        fraction = value - floor;
    return fraction < 0.5 ? floor : fraction > 0.5 ? floor + 1 : floor % 2 === 0 ? floor : floor + 1;
}
var float32 = Math.fround,
    outsideDistanceSentinel = -1e3,
    scanlineBias = 0.0010000000474974513,
    scanlineEpsilon = float32(1e-8);
export function rasterizeAir32AdfDistances(lines: RasterLine[], setup: DistanceSetup) {
    return rasterizeAir32AdfDistancesAtScale(lines, setup, 3);
}
export function rasterizeAir32GrayscaleAdfDistances(lines: RasterLine[], setup: DistanceSetup) {
    return rasterizeAir32AdfDistancesAtScale(lines, setup, 1);
}
export function rasterizeAir32AdfDistancesAtScale(lines: RasterLine[], setup: DistanceSetup, scale: number) {
    validate(lines, setup);
    let width = setup.width * scale,
        height = setup.height,
        stepX = float32(1 / scale),
        stepY = 1,
        inverseX = scale,
        inverseY = 1,
        cutoff = float32(Math.max(Math.abs(float32(setup.outsideCutoff)), Math.abs(float32(setup.insideCutoff)))),
        values = new Float32Array(width * height);
    values.fill(outsideDistanceSentinel);
    let grid = { width: width, height: height, stepX: stepX, stepY: stepY, inverseX: inverseX, inverseY: inverseY, values: values };
    if (cutoff !== 0) {
        for (let line of lines) rasterizeLineRectangle(line, cutoff, grid);
        for (let line of lines) rasterizeEndpoint(line.to, cutoff, grid);
    }
    return applyWindingSigns(lines, grid), { width: width, height: height, values: values };
}
export function rasterizeLineRectangle(line: RasterLine, cutoff: number, grid: RasterGrid) {
    let { from: from, to: to } = line,
        dx = float32(to.x - from.x),
        dy = float32(to.y - from.y),
        length = float32(Math.sqrt(dx * dx + dy * dy));
    if (!(length > 0)) return;
    let inverseLength = float32(1 / length),
        normalX = float32(dy * inverseLength),
        normalY = float32(-dx * inverseLength);
    if (normalX === 0 || normalY === 0) {
        rasterizeAxisLine(line, cutoff, normalX, normalY, grid);
        return;
    }
    let offsetX = float32(cutoff * normalX),
        offsetY = float32(cutoff * normalY),
        vertex = (S: number, z: number, K: number) => ({ x: float32(S * grid.inverseX), y: float32(z * grid.inverseY), distance: K }),
        fromOutside = vertex(from.x - offsetX, from.y - offsetY, -cutoff),
        fromInside = vertex(from.x + offsetX, from.y + offsetY, cutoff),
        toOutside = vertex(to.x - offsetX, to.y - offsetY, -cutoff),
        toInside = vertex(to.x + offsetX, to.y + offsetY, cutoff),
        lineSlope = float32(((to.x - from.x) * grid.inverseX) / ((to.y - from.y) * grid.inverseY)),
        cutoffSlope = float32((normalX * grid.inverseX) / (normalY * grid.inverseY)),
        distanceStep = float32(grid.stepY / normalY),
        edges = [
            makeEdge(fromOutside, toOutside, lineSlope, 0),
            makeEdge(fromInside, toInside, lineSlope, 0),
            makeEdge(fromOutside, fromInside, cutoffSlope, distanceStep),
            makeEdge(toOutside, toInside, cutoffSlope, distanceStep)
        ],
        xDistanceStep = float32(normalX * grid.stepX);
    rasterizePolygonRows(edges, xDistanceStep, grid);
}
export function makeEdge(from: RasterVertex, to: RasterVertex, slope: number, distanceStep: number) {
    let top = from.y <= to.y ? from : to,
        bottom = top === from ? to : from,
        firstRow = Math.max(0, Math.ceil(top.y)),
        lastRow = Math.floor(bottom.y),
        rowOffset = float32(firstRow - top.y),
        x = float32(rowOffset * slope + top.x),
        distance = float32(rowOffset * distanceStep + top.distance),
        edge = new Map<number, RasterEdgePoint>();
    for (let row = firstRow; row <= lastRow; row++)
        edge.set(row, { x: x, distance: distance }), (x = float32(x + slope)), (distance = float32(distance + distanceStep));
    return edge;
}
export function rasterizePolygonRows(edges: Map<number, RasterEdgePoint>[], step: number, grid: RasterGrid) {
    for (let row = 0; row < grid.height; row++) {
        let intersections = [];
        for (let edge of edges) {
            let intersection = edge.get(row);
            intersection && intersections.push(intersection);
        }
        if (intersections.length < 2) continue;
        intersections.sort((edge, intersection) => edge.x - intersection.x);
        let left = intersections[0]!,
            right = intersections.at(-1)!,
            firstX = Math.max(0, Math.ceil(left.x)),
            lastX = Math.min(grid.width - 1, Math.ceil(right.x) - 1);
        if (firstX > lastX) continue;
        let distance = float32((firstX - left.x) * step + left.distance),
            index = row * grid.width + firstX;
        for (let edge = firstX; edge <= lastX; edge++, index++) {
            let intersection = -Math.abs(distance);
            Math.abs(intersection) <= Math.abs(grid.values[index]!) && (grid.values[index]! = intersection), (distance = float32(distance + step));
        }
    }
}
export function rasterizeEndpoint(point: RasterPoint, cutoff: number, grid: RasterGrid) {
    let firstX = Math.max(0, Math.ceil((point.x - cutoff) * grid.inverseX)),
        lastX = Math.min(grid.width - 1, Math.ceil((point.x + cutoff) * grid.inverseX) - 1),
        firstY = Math.max(0, Math.ceil((point.y - cutoff) * grid.inverseY)),
        lastY = Math.min(grid.height - 1, Math.ceil((point.y + cutoff) * grid.inverseY) - 1);
    if (firstX > lastX || firstY > lastY) return;
    let xOffsets = new Float32Array(lastX - firstX + 1),
        dx = float32(firstX * grid.stepX - point.x);
    for (let row = 0; row < xOffsets.length; row++) (xOffsets[row]! = dx), (dx = float32(dx + grid.stepX));
    let dy = float32(firstY * grid.stepY - point.y);
    for (let row = firstY; row <= lastY; row++) {
        let index = row * grid.width + firstX;
        for (let column = firstX; column <= lastX; column++, index++) {
            let xOffset = xOffsets[column - firstX]!,
                distanceSquared = float32(xOffset * xOffset + dy * dy);
            grid.values[index]! * grid.values[index]! >= distanceSquared && (grid.values[index]! = -float32(Math.sqrt(distanceSquared)));
        }
        dy = float32(dy + grid.stepY);
    }
}
export function rasterizeAxisLine(line: RasterLine, cutoff: number, normalX: number, normalY: number, grid: RasterGrid) {
    let s = normalX !== 0,
        o = float32((s ? line.from.x - cutoff : Math.min(line.from.x, line.to.x)) * grid.inverseX),
        d = float32((s ? line.from.x + cutoff : Math.max(line.from.x, line.to.x)) * grid.inverseX),
        c = float32((s ? Math.min(line.from.y, line.to.y) : line.from.y - cutoff) * grid.inverseY),
        f = float32((s ? Math.max(line.from.y, line.to.y) : line.from.y + cutoff) * grid.inverseY),
        b = Math.max(0, Math.ceil(o)),
        l = Math.min(grid.width - 1, Math.ceil(d) - 1),
        _ = Math.max(0, Math.ceil(c)),
        h = Math.min(grid.height - 1, Math.ceil(f) - 1);
    if (!(b > l || _ > h))
        if (s) {
            let p = float32(line.from.x - b * grid.stepX);
            for (let m = _; m <= h; m++) {
                let v = p,
                    w = m * grid.width + b;
                for (let I = b; I <= l; I++, w++) {
                    let C = -Math.abs(v);
                    Math.abs(C) <= Math.abs(grid.values[w]!) && (grid.values[w]! = C), (v = float32(v - grid.stepX));
                }
            }
        } else {
            let p = float32(line.from.y - _ * grid.stepY);
            for (let m = _; m <= h; m++) {
                let v = -Math.abs(p),
                    w = m * grid.width + b;
                for (let I = b; I <= l; I++, w++) Math.abs(v) <= Math.abs(grid.values[w]!) && (grid.values[w]! = v);
                p = float32(p - grid.stepY);
            }
        }
}
export function applyWindingSigns(lines: RasterLine[], grid: RasterGrid) {
    let windings = new Int8Array(grid.width * grid.height);
    for (let row of lines) rasterizeWindingLine(row, windings, grid);
    for (let row = 0; row < grid.height; row++) {
        let winding = 0,
            index = row * grid.width;
        for (let column = 0; column < grid.width; column++, index++)
            (winding = (winding + windings[index]!) & 255), winding !== 0 && (grid.values[index]! = -grid.values[index]!);
    }
}
export function rasterizeWindingLine(line: RasterLine, windings: Int8Array, grid: RasterGrid) {
    let t = float32(line.from.x * grid.inverseX),
        i = float32(line.to.x * grid.inverseX),
        s = biasScanY(float32(line.from.y * grid.inverseY)),
        o = biasScanY(float32(line.to.y * grid.inverseY)),
        d = Math.trunc(s),
        c = Math.trunc(o);
    if (d === c || (s < 0 && o < 0)) return;
    let f = o > s,
        l = (f ? s : o) >= 0 ? (f ? d : c) + 1 : 0,
        _ = f ? c : d;
    if (((_ = Math.min(grid.height - 1, _)), l > _)) return;
    let h = float32(i - t),
        p = float32(1 / (o - s)),
        m = float32((l - s) * p),
        v = float32(h * p),
        w = float32(h * m + t + 1),
        I = f ? 1 : -1,
        C = l * grid.width;
    for (let W = l; W <= _; W++, C += grid.width) {
        let R = Math.trunc(w);
        R >= 0 && R < grid.width && (windings[C + R]! += I), (w = float32(w + v));
    }
}
export function biasScanY(value: number) {
    let integer = Math.trunc(value),
        difference = integer - value;
    return difference < 0 && (difference = -integer - value), float32(difference) <= scanlineEpsilon ? float32(value - scanlineBias) : value;
}
export function validate(lines: RasterLine[], setup: DistanceSetup) {
    if (
        !isArray(lines) ||
        lines.some((r) => !r?.from || !r?.to || !isFiniteNumber(r.from.x) || !isFiniteNumber(r.from.y) || !isFiniteNumber(r.to.x) || !isFiniteNumber(r.to.y))
    )
        throw new TypeError('lines must contain finite from/to points');
    if (
        !setup ||
        !Number.isInteger(setup.width) ||
        setup.width < 1 ||
        !Number.isInteger(setup.height) ||
        setup.height < 1 ||
        !isFiniteNumber(setup.outsideCutoff) ||
        !isFiniteNumber(setup.insideCutoff)
    )
        throw new TypeError('setup must contain dimensions and finite cutoffs');
}
export function reduceAir32LcdColor(red: number, green: number, blue: number, amount = 0.5) {
    for (let [channel, value] of Object.entries({ red: red, green: green, blue: blue }))
        if (!Number.isInteger(value) || value < 0 || value > 255) throw new RangeError(`${channel} must be an 8-bit integer`);
    if (!isFiniteNumber(amount)) throw new TypeError('amount must be finite');
    let threshold = Math.trunc((1 - amount) * 64),
        luminance = Math.floor(red * 0.299) + Math.floor(green * 0.587) + Math.floor(blue * 0.114),
        distance = Math.abs(red - luminance) + Math.abs(green - luminance) + Math.abs(blue - luminance);
    return distance <= threshold
        ? [red, green, blue]
        : [red, green, blue].map((channel) => luminance + Math.trunc(((channel - luminance) * threshold) / distance));
}
export function air32ColorType(color: TextColor, globalAlpha = 255) {
    let [red, green, blue] = normalizeRgb(color);
    if (!Number.isInteger(globalAlpha) || globalAlpha < 0 || globalAlpha > 255) throw new RangeError('globalAlpha must be an 8-bit integer');
    let alphaScale = globalAlpha + 1,
        scaledRed = Math.floor((red * alphaScale) / 256),
        scaledGreen = Math.floor((green * alphaScale) / 256),
        scaledBlue = Math.floor((blue * alphaScale) / 256);
    return 30 * scaledRed + 59 * scaledGreen + 11 * scaledBlue > 2e4 ? 'light' : 'dark';
}
export function normalizeRgb(color: TextColor): [number, number, number] {
    if (isSafeInteger(color) && color >= 0 && color <= 16777215) return [color >>> 16, (color >>> 8) & 255, color & 255];
    if ((isArray(color) || ArrayBuffer.isView(color)) && color.length >= 3 && [...color.slice(0, 3)].every((e) => Number.isInteger(e) && e >= 0 && e <= 255))
        return [color[0]!, color[1]!, color[2]!];
    throw new RangeError('color must be a 24-bit integer or RGB byte array');
}
var float32BitsView = new DataView(new ArrayBuffer(4));
export function float32Bits(value: number) {
    if (!isFiniteNumber(value)) throw new TypeError('value must be finite');
    return float32BitsView.setFloat32(0, value, !0), float32BitsView.getUint32(0, !0);
}
export function air32TransformAndFlattenImp1(glyph: Imp1Glyph, matrix: readonly number[]) {
    if (!glyph || !isArray(glyph.commands)) throw new TypeError('imp1 must be a parsed IMP1 glyph');
    if (glyph.pathType !== 0) throw new RangeError('only filled IMP1 paths are currently supported');
    if (!isArray(matrix) || matrix.length < 6 || matrix.slice(0, 6).some((command) => !isFiniteNumber(command)))
        throw new TypeError('matrix must contain six finite affine components');
    let fround = Math.fround,
        [scaleX, skewX, translateX, skewY, scaleY, translateY] = matrix as readonly [number, number, number, number, number, number],
        transform = (command: number, point: number) => ({
            x: fround(command * scaleX + point * skewX + translateX),
            y: fround(command * skewY + point * scaleY + translateY)
        }),
        commands = [],
        previous = { x: 0, y: 0 };
    for (let command of glyph.commands) {
        let point = transform(command.x, command.y);
        if (command.opcode === 0) {
            commands.push({ opcode: 0, type: 'move', ...point }), (previous = point);
            continue;
        }
        if (command.opcode === 1) {
            commands.push({ opcode: 1, type: 'line', ...point }), (previous = point);
            continue;
        }
        if (command.opcode !== 2) throw new RangeError(`unsupported IMP1 opcode ${command.opcode}`);
        let control = transform(command.controlX, command.controlY),
            dx = fround(control.x - (point.x + previous.x) * 0.5),
            dy = fround(control.y - (point.y + previous.y) * 0.5),
            distance = fround(Math.sqrt(dx * dx + dy * dy)),
            segments = Math.trunc(Math.sqrt(distance * 5)) + 1,
            step = fround(1 / segments),
            progress = step;
        for (let segment = 1; segment < segments; ++segment) {
            let inverse = fround(1 - progress),
                startWeight = fround(inverse * inverse),
                controlWeight = fround((progress + progress) * inverse),
                endWeight = fround(progress * progress);
            commands.push({
                opcode: 1,
                type: 'line',
                x: fround(previous.x * startWeight + control.x * controlWeight + point.x * endWeight),
                y: fround(previous.y * startWeight + control.y * controlWeight + point.y * endWeight)
            }),
                (progress = fround(progress + step));
        }
        commands.push({ opcode: 1, type: 'line', ...point }), (previous = point);
    }
    return { pathType: glyph.pathType, strokeWidth: 0, commandCount: commands.length, commands: commands };
}
export function air32FlattenedPathToLines(path: FlattenedPath) {
    if (!path || !isArray(path.commands)) throw new TypeError('path must contain flattened commands');
    let lines = [],
        previous = null;
    for (let command of path.commands) {
        let point = { x: command.x, y: command.y };
        if (command.opcode === 0) previous = point;
        else if (command.opcode === 1) {
            if (previous === null) throw new Error('line command precedes a move');
            lines.push({ from: previous, to: point }), (previous = point);
        } else throw new RangeError(`flattened path retained opcode ${command.opcode}`);
    }
    return lines;
}
var defaultQuadraticFlatness = 0.4,
    defaultFlatnessMode = 'second-euclidean',
    lcdSampleOffsets = Object.freeze([-1 / 3, 0, 1 / 3]),
    lcdSampleWidth = Math.fround(1 / 3);
export function rasterizeAir32Imp1(glyph: Imp1Glyph, setup: Imp1RasterSetup) {
    validateSetup(setup);
    let lines =
            setup.quadraticFlatness === void 0 && setup.flatnessMode === void 0
                ? air32FlattenedPathToLines(air32TransformAndFlattenImp1(glyph, setup.matrix))
                : transformAndFlattenImp1(glyph, setup.matrix, setup.quadraticFlatness ?? defaultQuadraticFlatness, setup.flatnessMode ?? defaultFlatnessMode),
        rowStride = setup.rowStride ?? setup.width * 4;
    if (!isSafeInteger(rowStride) || rowStride < setup.width * 4) throw new RangeError('rowStride is too small for BGRA8 output');
    let distances = rasterizeAir32AdfDistances(lines, setup),
        pixels = new Uint8Array(rowStride * setup.height);
    for (let row = 0; row < setup.height; row++)
        for (let column = 0; column < setup.width; column++) {
            let masks = lcdSampleOffsets.map((l, _) => {
                    let h = column * 3 + _ - 1,
                        p = h < 0 ? -1e3 : distances.values[row * distances.width + h]!;
                    return air32DistanceToMask(p, setup.outsideCutoff, setup.insideCutoff);
                }),
                channels = setup.useColorReduction === !1 ? masks : reduceAir32LcdColor(masks[0]!, masks[1]!, masks[2]!, setup.colorReductionAmount ?? 0.5),
                offset = row * rowStride + column * 4;
            (pixels[offset]! = channels[2]!),
                (pixels[offset + 1]! = channels[1]!),
                (pixels[offset + 2]! = channels[0]!),
                (pixels[offset + 3]! = channels[0]! || channels[1]! || channels[2]! ? 255 : 0);
        }
    return { width: setup.width, height: setup.height, rowStride: rowStride, pixels: pixels, lines: lines, distances: distances.values };
}
export function transformAndFlattenImp1(glyph: Imp1Glyph, matrix: readonly number[], tolerance = defaultQuadraticFlatness, flatnessMode = 'perpendicular') {
    if (!glyph || !isArray(glyph.commands)) throw new TypeError('imp1.commands must be an array');
    if (!isArray(matrix) || matrix.length < 6 || matrix.slice(0, 6).some((command) => !isFiniteNumber(command)))
        throw new TypeError('matrix must contain six finite affine values');
    if (!isFiniteNumber(tolerance) || tolerance <= 0) throw new RangeError('quadratic tolerance must be positive');
    if (!['perpendicular', 'second-euclidean', 'second-max', 'second-manhattan'].includes(flatnessMode))
        throw new RangeError('unsupported quadratic flatness mode');
    let [scaleX, skewX, translateX, skewY, scaleY, translateY] = matrix as readonly [number, number, number, number, number, number],
        fround = Math.fround,
        transform = (command: number, point: number) => ({
            x: fround(fround(fround(scaleX * command) + fround(skewX * point)) + translateX),
            y: fround(fround(fround(skewY * command) + fround(scaleY * point)) + translateY)
        }),
        lines = [],
        previous = null;
    for (let command of glyph.commands) {
        let point = transform(command.x, command.y);
        if (command.opcode === 0) previous = point;
        else if (command.opcode === 1) {
            if (!previous) throw new Error('IMP1 line occurs before a move');
            lines.push({ from: previous, to: point }), (previous = point);
        } else if (command.opcode === 2) {
            if (!previous) throw new Error('IMP1 quadratic occurs before a move');
            let control = transform(command.controlX, command.controlY);
            flattenQuadratic(lines, previous, control, point, tolerance, flatnessMode, 0), (previous = point);
        } else throw new Error(`unsupported IMP1 opcode ${command.opcode}`);
    }
    return lines;
}
export function flattenQuadratic(
    lines: RasterLine[],
    from: RasterPoint,
    control: RasterPoint,
    to: RasterPoint,
    tolerance: number,
    mode: string,
    depth: number
) {
    if (depth >= 16 || quadraticFlatness(from, control, to, mode) <= tolerance) {
        lines.push({ from: from, to: to });
        return;
    }
    let leftMidpoint = midpoint(from, control),
        rightMidpoint = midpoint(control, to),
        center = midpoint(leftMidpoint, rightMidpoint);
    flattenQuadratic(lines, from, leftMidpoint, center, tolerance, mode, depth + 1),
        flattenQuadratic(lines, center, rightMidpoint, to, tolerance, mode, depth + 1);
}
export function quadraticFlatness(from: RasterPoint, control: RasterPoint, to: RasterPoint, mode: string) {
    if (mode === 'perpendicular') return Math.sqrt(pointLineSquaredDistance(control.x, control.y, from, to));
    let dx = from.x - 2 * control.x + to.x,
        dy = from.y - 2 * control.y + to.y;
    return mode === 'second-euclidean' ? Math.hypot(dx, dy) : mode === 'second-max' ? Math.max(Math.abs(dx), Math.abs(dy)) : Math.abs(dx) + Math.abs(dy);
}
export function midpoint(from: RasterPoint, to: RasterPoint) {
    return { x: Math.fround(Math.fround(from.x + to.x) * 0.5), y: Math.fround(Math.fround(from.y + to.y) * 0.5) };
}
export function pointLineSquaredDistance(x: number, y: number, from: RasterPoint, to: RasterPoint) {
    let dx = to.x - from.x,
        dy = to.y - from.y,
        lengthSquared = dx * dx + dy * dy,
        projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / lengthSquared)),
        nearestX = from.x + projection * dx,
        nearestY = from.y + projection * dy;
    return (x - nearestX) ** 2 + (y - nearestY) ** 2;
}
export function validateSetup(setup: DistanceSetup) {
    if (!setup || !isSafeInteger(setup.width) || setup.width < 1 || !isSafeInteger(setup.height) || setup.height < 1)
        throw new TypeError('setup must contain positive integer width and height');
    for (let e of ['outsideCutoff', 'insideCutoff'] as const) if (!isFiniteNumber(setup[e]!)) throw new TypeError(`setup.${e} must be finite`);
}
var lcdAxisBias = 1 / 3,
    lcdImagePadding = 5 / 3,
    verticalZoneRoundingBias = 0.800000011920929,
    lcdZoneOffsetBias = 0.1666666716337204;
export function deriveAir32AdvancedPixelSetup(glyph: Imp1Glyph, options: AdvancedSetupOptions) {
    if (
        !glyph ||
        !isFiniteNumber(glyph.normalizedEm) ||
        !isFiniteNumber(glyph.normalizationFactor) ||
        !isFiniteNumber(glyph.referenceX) ||
        !isFiniteNumber(glyph.referenceY)
    )
        throw new TypeError('imp1 must contain the parsed native ADF attributes');
    if (glyph.pathType !== 0 || ((glyph.sazMask ?? 0) & -4) !== 0) throw new RangeError('the exact setup currently covers filled glyphs');
    let pointSize = Math.fround(finitePositive(options?.pointSize, 'pointSize')),
        dpi = options?.dpi ?? 72;
    if (!isSafeInteger(dpi) || dpi <= 0) throw new RangeError('dpi must be a positive integer');
    let displayScaleX = Math.fround(options?.scaleX ?? 1),
        displayScaleY = Math.fround(options?.scaleY ?? 1);
    if (displayScaleX !== 1 || displayScaleY !== 1) throw new RangeError('only an identity display scale is currently exact');
    let penX = options?.fittedPenX,
        penY = options?.fittedPenY;
    if (!isFiniteNumber(penX) || !isFiniteNumber(penY)) throw new TypeError('fittedPenX and fittedPenY must be finite');
    let fround = Math.fround,
        pixelSize = dpi === 72 ? pointSize : fround((pointSize * dpi) / 72),
        scale = fround(pixelSize / glyph.normalizedEm),
        zones = decodeStandardAlignmentZones(glyph),
        fittedScaleX = fitStandardAlignmentZoneScale(scale, glyph.normalizedEm, zones.xSpan, 0.5),
        fittedScaleY = fitStandardAlignmentZoneScale(scale, glyph.normalizedEm, zones.ySpan, verticalZoneRoundingBias),
        xAxis =
            (zones.mask & 1) === 0
                ? { ...setupAxis(fround(penX), fittedScaleX, glyph.referenceX, !0), residual: 0, zoneCoordinate: null }
                : setupStandardAlignmentZoneAxis({
                      pen: fround(penX),
                      scale: fittedScaleX,
                      normalizedEm: glyph.normalizedEm,
                      reference: glyph.referenceX,
                      emCoordinate: zones.xCoordinate,
                      lcd: !0
                  }),
        yAxis =
            (zones.mask & 2) === 0
                ? { ...setupAxis(fround(penY), fittedScaleY, glyph.referenceY, !1), residual: 0, zoneCoordinate: null }
                : setupStandardAlignmentZoneAxis({
                      pen: fround(penY),
                      scale: fittedScaleY,
                      normalizedEm: glyph.normalizedEm,
                      reference: glyph.referenceY,
                      emCoordinate: zones.yCoordinate,
                      lcd: !1
                  }),
        width = Math.trunc(fittedScaleX + lcdImagePadding),
        height = Math.trunc(fittedScaleY + 1);
    if (width < 1 || height < 1 || width > 65535 || height > 65535) throw new RangeError('derived native glyph image is outside uint16 bounds');
    let normalizedPixelScale = fround(scale * glyph.normalizationFactor),
        normalizedScaleX = fround(fittedScaleX * glyph.normalizationFactor),
        normalizedScaleY = fround(fittedScaleY * glyph.normalizationFactor),
        matrix = Object.freeze([fittedScaleX, 0, xAxis.translation, 0, fittedScaleY, yAxis.translation, 0, 0, 1]),
        nativeKeyWords = new Uint32Array([
            3,
            0,
            0,
            float32Bits(glyph.referenceX),
            float32Bits(glyph.referenceY),
            float32Bits(fittedScaleX),
            float32Bits(fittedScaleY),
            float32Bits(scale),
            float32Bits(normalizedPixelScale),
            float32Bits(normalizedPixelScale),
            float32Bits(normalizedScaleX),
            float32Bits(normalizedScaleY)
        ]);
    return {
        pointSize: pointSize,
        dpi: dpi,
        pixelSize: pixelSize,
        fittedPenX: fround(penX),
        fittedPenY: fround(penY),
        scale: scale,
        scaleX: fittedScaleX,
        scaleY: fittedScaleY,
        normalizedScaleX: normalizedScaleX,
        normalizedScaleY: normalizedScaleY,
        residualX: xAxis.residual,
        residualY: yAxis.residual,
        standardAlignmentZones: zones,
        matrix: matrix,
        matrixBits: matrix.map(float32Bits),
        width: width,
        height: height,
        rowStride: width * 4,
        imageType: 1,
        lcdPhase: 1,
        offsetX: xAxis.offset,
        offsetY: yAxis.offset,
        originX: xAxis.offset,
        originY: -(height + yAxis.offset),
        normalizedPixelScale: normalizedPixelScale,
        nativeKeyWords: nativeKeyWords
    };
}
export function deriveAir32AdvancedRetainedSetup(glyph: Imp1Glyph, options: AdvancedSetupOptions) {
    let setup = deriveAir32AdvancedPixelSetup(glyph, options),
        xAxis =
            (setup.standardAlignmentZones.mask & 1) === 0
                ? setupAxis(Math.fround(options.fittedPenX), setup.scaleX, glyph.referenceX, !1)
                : setupStandardAlignmentZoneAxis({
                      pen: Math.fround(options.fittedPenX),
                      scale: setup.scaleX,
                      normalizedEm: glyph.normalizedEm,
                      reference: glyph.referenceX,
                      emCoordinate: setup.standardAlignmentZones.xCoordinate,
                      lcd: !1
                  }),
        width = Math.trunc(setup.scaleX + 1);
    if (width < 1 || width > 65535) throw new RangeError('derived retained glyph image is outside uint16 bounds');
    let matrix = Object.freeze([setup.scaleX, 0, xAxis.translation, 0, setup.scaleY, setup.matrix[5]!, 0, 0, 1]);
    return {
        ...setup,
        matrix: matrix,
        matrixBits: matrix.map(float32Bits),
        width: width,
        rowStride: width,
        imageType: 0,
        lcdPhase: 0,
        offsetX: xAxis.offset,
        originX: xAxis.offset,
        residualX: xAxis.residual ?? 0
    };
}
export function decodeStandardAlignmentZones(glyph: Imp1Glyph) {
    if (!isArray(glyph?.encodedSaz) || glyph.encodedSaz.length !== 4) throw new TypeError('imp1 must contain four encoded SAZ words');
    let zones = glyph.encodedSaz.map(float32FromBits),
        mask = glyph.sazMask ?? 0;
    return Object.freeze({
        mask: mask,
        xCoordinate: (mask & 1) === 0 ? 0 : zones[0]!,
        yCoordinate: (mask & 2) === 0 ? 0 : zones[1]!,
        xSpan: (mask & 1) === 0 ? 0 : zones[2]!,
        ySpan: (mask & 2) === 0 ? 0 : zones[3]!
    });
}
export function fitStandardAlignmentZoneScale(scale: number, normalizedEm: number, span: number, bias: number) {
    let fround = Math.fround;
    if (span === 0) return fround(scale);
    let zoneSpan = fround(normalizedEm * span),
        pixelSpan = fround(fround(scale) * zoneSpan),
        fittedSpan = bias === 0.5 ? roundTiesEven(pixelSpan) : Math.trunc(pixelSpan + bias);
    return fittedSpan <= 0 ? fround(scale) : fround(fround(scale) * (fittedSpan / pixelSpan));
}
export function setupStandardAlignmentZoneAxis({ pen, scale, normalizedEm, reference, emCoordinate, lcd }: AlignmentZoneAxis) {
    let fround = Math.fround,
        zoneCoordinate = fround(reference + normalizedEm * emCoordinate),
        scaledReference = fround(scale * reference),
        centeredPen = fround(fround(pen - scaledReference) - 0.5),
        centeredAnchor = fround(centeredPen + scale * zoneCoordinate),
        residual = fround(Math.floor(centeredAnchor) + 0.5 - centeredAnchor),
        adjustedPen = fround(centeredPen + residual),
        offset = Math.floor(adjustedPen + (lcd ? lcdZoneOffsetBias : 0.5)),
        translation = fround(adjustedPen - offset);
    return {
        scaledReference: scaledReference,
        biasedPen: fround(adjustedPen + 0.5),
        centeredPen: adjustedPen,
        centeredAnchor: centeredAnchor,
        zoneCoordinate: zoneCoordinate,
        residual: residual,
        offset: offset,
        translation: translation
    };
}
var float32ValueView = new DataView(new ArrayBuffer(4));
export function float32FromBits(bits: number) {
    return float32ValueView.setUint32(0, bits >>> 0, !0), float32ValueView.getFloat32(0, !0);
}
export function air32GlyphRasterKey(glyphId: number, setup: AdvancedPixelSetup, extra: number[] = []) {
    if (!isSafeInteger(glyphId)) throw new TypeError('glyphId must be a safe integer');
    return [glyphId, ...setup.matrixBits, setup.width, setup.height, ...extra].join(':');
}
export function setupAxis(
    pen: number,
    scale: number,
    reference: number,
    lcd: boolean
): { scaledReference: number; biasedPen: number; offset: number; translation: number; residual?: number } {
    let fround = Math.fround,
        scaledReference = fround(scale * reference),
        biasedPen = fround(pen - scaledReference),
        offset = Math.floor(biasedPen - (lcd ? lcdAxisBias : 0)),
        translation = fround(fround(biasedPen - 0.5) - offset);
    return { scaledReference: scaledReference, biasedPen: biasedPen, offset: offset, translation: translation };
}
export function finitePositive(value: number, name: string) {
    if (!isFiniteNumber(value) || value <= 0) throw new RangeError(`${name} must be positive and finite`);
    return value;
}
export function parseImp1(input: ArrayBuffer | ArrayBufferView) {
    let bytes = asUint8Array(input);
    if (bytes.byteLength < 80) throw new RangeError('IMP1 block is shorter than its 0x50-byte header');
    let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0, !0) !== 1229803569) throw new Error('invalid IMP1 magic');
    let totalBytes = view.getUint32(4, !0),
        headerBytes = view.getUint32(8, !0),
        commandCount = view.getUint32(12, !0);
    if (headerBytes !== 80) throw new Error(`unsupported IMP1 header size ${headerBytes}`);
    let expectedBytes = headerBytes + commandCount * 20;
    if (totalBytes !== expectedBytes || totalBytes > bytes.byteLength)
        throw new Error(`inconsistent IMP1 size: header declares ${totalBytes}, commands require ${expectedBytes}`);
    let glyph: Imp1Glyph = {
        magic: 'IMP1',
        totalBytes: totalBytes,
        headerBytes: headerBytes,
        commandCount: commandCount,
        userId: view.getUint32(16, !0),
        normalizationFactor: view.getFloat32(20, !0),
        normalizedEm: view.getFloat32(24, !0),
        pathType: view.getUint32(28, !0),
        strokeWidth: view.getFloat32(32, !0),
        referenceX: view.getFloat32(36, !0),
        referenceY: view.getFloat32(40, !0),
        bounds: {
            xMin: view.getFloat32(44, !0),
            yMin: view.getFloat32(48, !0),
            xMax: view.getFloat32(52, !0),
            yMax: view.getFloat32(56, !0)
        },
        encodedSaz: [view.getUint32(60, !0), view.getUint32(64, !0), view.getUint32(68, !0), view.getUint32(72, !0)],
        sazMask: view.getUint32(76, !0),
        commands: []
    };
    if (glyph.pathType !== 0 && glyph.pathType !== 1) throw new Error(`unsupported IMP1 path type ${glyph.pathType}`);
    for (let index = 0; index < commandCount; index++) {
        let offset = headerBytes + index * 20,
            opcode = view.getUint32(offset, !0);
        if (opcode > 2) throw new Error(`unsupported IMP1 opcode ${opcode}`);
        glyph.commands.push({
            opcode: opcode,
            type: ['move', 'line', 'quadratic'][opcode]!,
            x: view.getFloat32(offset + 4, !0),
            y: view.getFloat32(offset + 8, !0),
            controlX: view.getFloat32(offset + 12, !0),
            controlY: view.getFloat32(offset + 16, !0)
        });
    }
    return glyph;
}
export function asUint8Array(input: ArrayBuffer | ArrayBufferView) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError('IMP1 input must be an ArrayBuffer or typed array');
}
export function prepareAir32NativeProfile(profile: RawNativeProfile) {
    if (!profile || !isArray(profile.glyphs)) throw new TypeError('native profile must contain a glyphs array');
    let glyphs = new Map<number, NativeGlyph>();
    for (let record of profile.glyphs) {
        if (!isSafeInteger(record.codepoint) || typeof record.imp1Base64 != 'string')
            throw new TypeError('native glyph records require codepoint and imp1Base64');
        let imp1 = parseImp1(decodeBase64(record.imp1Base64));
        if (imp1.userId !== record.codepoint) throw new Error(`IMP1 user id does not match U+${record.codepoint.toString(16)}`);
        let renders = (record.renders ?? []).map((render) => {
            let rawImage = render.rawImageBase64 ? decodeBase64(render.rawImageBase64) : null;
            if (rawImage && rawImage.length !== render.rowStride * render.imageHeight)
                throw new Error(`raw mapper image has an invalid size for U+${record.codepoint.toString(16)}`);
            return { ...render, rawImage: rawImage };
        });
        glyphs.set(record.codepoint, { ...record, imp1: imp1, renders: renders });
    }
    return { schemaVersion: profile.schemaVersion, runtime: profile.runtime, fontSha256: profile.fontSha256, glyphs: glyphs, source: profile };
}
export function decodeBase64(text: string) {
    if (typeof globalThis.atob == 'function') {
        let binary = globalThis.atob(text),
            bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index]! = binary.charCodeAt(index);
        return bytes;
    }
    throw new Error('a standards-compatible atob implementation is required');
}
var normalSampleOffsets = Object.freeze([0.125, 0.375, 0.625, 0.875]);
export function rasterizeAir32NormalImp1(glyph: Imp1Glyph, { sampleMasks, width, height, originX, baselineY, size, emSquare }: NormalSampleSetup) {
    if (
        (validateRasterArguments(glyph, {
            sampleMasks: sampleMasks,
            width: width,
            height: height,
            originX: originX,
            baselineY: baselineY,
            size: size,
            emSquare: emSquare
        }),
        glyph.pathType !== 0)
    )
        throw new RangeError('exact AIR32 NORMAL rasterization currently supports filled IMP1 paths');
    let scale = (20 * (size / emSquare)) / glyph.normalizationFactor,
        lines = transformLineCommands(glyph, originX, baselineY, scale);
    if (lines.length === 0) return sampleMasks;
    let { firstX: firstX, lastX: lastX, firstY: firstY, lastY: lastY } = rasterBounds(lines, width, height);
    for (let row = firstY; row < lastY; row++)
        for (let column = firstX; column < lastX; column++) {
            let mask = 0,
                bit = 1;
            for (let sampleY of normalSampleOffsets) {
                let y = row + sampleY;
                for (let sampleX of normalSampleOffsets) hasNonZeroWinding(lines, column + sampleX, y) && (mask |= bit), (bit <<= 1);
            }
            sampleMasks[row * width + column]! |= mask;
        }
    return sampleMasks;
}
export function rasterizeAirLowNormalImp1(glyph: Imp1Glyph, { coverage, width, height, originX, baselineY, size, emSquare }: LowNormalSetup) {
    validateLowRasterArguments(glyph, {
        coverage: coverage,
        width: width,
        height: height,
        originX: originX,
        baselineY: baselineY,
        size: size,
        emSquare: emSquare
    }),
        validateLineOnlyImp1(glyph);
    let scale = (20 * (size / emSquare)) / glyph.normalizationFactor,
        lines = transformLineCommands(glyph, originX, baselineY, scale);
    if (lines.length === 0) return coverage;
    let { firstX: firstX, lastX: lastX, firstY: firstY, lastY: lastY } = rasterBounds(lines, width, height);
    for (let row = firstY; row < lastY; row++) {
        let y = row + 0.5;
        for (let column = firstX; column < lastX; column++) hasNonZeroWinding(lines, column + 0.5, y) && (coverage[row * width + column]! = 255);
    }
    return coverage;
}
export function normalSampleMaskCount(mask: number) {
    if (!isSafeInteger(mask) || mask < 0 || mask > 65535) throw new RangeError('NORMAL sample mask must be an unsigned 16-bit integer');
    let count = mask;
    return (
        (count = count - ((count >>> 1) & 21845)),
        (count = (count & 13107) + ((count >>> 2) & 13107)),
        (count = (count + (count >>> 4)) & 3855),
        (count + (count >>> 8)) & 31
    );
}
export function transformLineCommands(glyph: Imp1Glyph, originX: number, baselineY: number, scale: number) {
    let lines = [],
        previous = null;
    for (let command of glyph.commands) {
        let point = { x: originX + (command.x - glyph.referenceX) * scale, y: baselineY + (glyph.referenceY - command.y) * scale };
        if (command.opcode === 0) {
            previous = point;
            continue;
        }
        if (command.opcode === 2) throw new RangeError('exact AIR32 NORMAL rasterization currently requires line-only IMP1 outlines');
        if (command.opcode !== 1) throw new RangeError(`unsupported IMP1 opcode ${command.opcode}`);
        if (previous === null) throw new Error('IMP1 line command precedes its move command');
        lines.push({ fromX: previous.x, fromY: previous.y, toX: point.x, toY: point.y }), (previous = point);
    }
    return lines;
}
export function rasterBounds(lines: NormalRasterLine[], width: number, height: number) {
    let minX = 1 / 0,
        maxX = -1 / 0,
        minY = 1 / 0,
        maxY = -1 / 0;
    for (let line of lines)
        (minX = Math.min(minX, line.fromX, line.toX)),
            (maxX = Math.max(maxX, line.fromX, line.toX)),
            (minY = Math.min(minY, line.fromY, line.toY)),
            (maxY = Math.max(maxY, line.fromY, line.toY));
    return {
        firstX: Math.max(0, Math.floor(minX) - 1),
        lastX: Math.min(width, Math.ceil(maxX) + 1),
        firstY: Math.max(0, Math.floor(minY) - 1),
        lastY: Math.min(height, Math.ceil(maxY) + 1)
    };
}
export function hasNonZeroWinding(lines: NormalRasterLine[], x: number, y: number) {
    let winding = 0;
    for (let line of lines) {
        let dx = line.toX - line.fromX,
            dy = line.toY - line.fromY,
            crossProduct = dx * (y - line.fromY) - (x - line.fromX) * dy;
        line.fromY <= y ? line.toY > y && crossProduct > 0 && winding++ : line.toY <= y && crossProduct < 0 && winding--;
    }
    return winding !== 0;
}
export function validateRasterArguments(glyph: Imp1Glyph, setup: NormalSampleSetup) {
    if (
        !glyph ||
        !isArray(glyph.commands) ||
        !isFiniteNumber(glyph.normalizationFactor) ||
        glyph.normalizationFactor === 0 ||
        !isFiniteNumber(glyph.referenceX) ||
        !isFiniteNumber(glyph.referenceY)
    )
        throw new TypeError('imp1 must be a parsed, normalized IMP1 glyph');
    let { sampleMasks: r, width: t, height: i } = setup;
    if (!(r instanceof Uint16Array) || !isSafeInteger(t) || t <= 0 || !isSafeInteger(i) || i <= 0 || r.length !== t * i)
        throw new TypeError('sampleMasks must be a width-by-height Uint16Array');
    for (let s of ['originX', 'baselineY', 'size', 'emSquare'] as const) if (!isFiniteNumber(setup[s]!)) throw new TypeError(`${s} must be finite`);
    if (setup.size <= 0 || setup.emSquare <= 0) throw new RangeError('size and emSquare must be positive');
}
export function validateLowRasterArguments(glyph: Imp1Glyph, setup: LowNormalSetup) {
    if (
        !glyph ||
        !isArray(glyph.commands) ||
        !isFiniteNumber(glyph.normalizationFactor) ||
        glyph.normalizationFactor === 0 ||
        !isFiniteNumber(glyph.referenceX) ||
        !isFiniteNumber(glyph.referenceY)
    )
        throw new TypeError('imp1 must be a parsed, normalized IMP1 glyph');
    let { coverage: r, width: t, height: i } = setup;
    if (!(r instanceof Uint8Array) || !isSafeInteger(t) || t <= 0 || !isSafeInteger(i) || i <= 0 || r.length !== t * i)
        throw new TypeError('coverage must be a width-by-height Uint8Array');
    for (let s of ['originX', 'baselineY', 'size', 'emSquare'] as const) if (!isFiniteNumber(setup[s]!)) throw new TypeError(`${s} must be finite`);
    if (setup.size <= 0 || setup.emSquare <= 0) throw new RangeError('size and emSquare must be positive');
}
export function validateLineOnlyImp1(glyph: Imp1Glyph) {
    if (glyph.pathType !== 0) throw new RangeError('exact AIR LOW NORMAL rasterization currently supports filled IMP1 paths');
}
export function createAir32RetainedBitmap(width: number, height: number) {
    if (!isSafeInteger(width) || width < 1 || !isSafeInteger(height) || height < 1)
        throw new RangeError('retained bitmap dimensions must be positive integers');
    return new Uint8ClampedArray(width * height * 4);
}
export function compositeAir32RetainedCoverage(destination: BytePixels, offset: number, color: ColorChannels, coverage: number) {
    if (!(destination instanceof Uint8Array || destination instanceof Uint8ClampedArray)) throw new TypeError('destination must be an 8-bit typed array');
    if (!isSafeInteger(offset) || offset < 0 || offset + 3 >= destination.length) throw new RangeError('retained destination offset is out of bounds');
    if (!Number.isInteger(coverage) || coverage < 0 || coverage > 255) throw new RangeError('coverage must be an 8-bit integer');
    if (coverage === 0) return;
    let premultiplied = premultiplyAir32Color(color),
        alpha = premultiplied[3]!;
    for (let channel = 0; channel < 3; channel++)
        destination[offset + channel]! = blendAir32Component(destination[offset + channel]!, premultiplied[channel]!, alpha, coverage);
    destination[offset + 3]! = blendAir32Component(destination[offset + 3]!, alpha, alpha, coverage);
}
export function setAir32NormalRetainedCoverage(destination: BytePixels, offset: number, color: ColorChannels, coverage: number) {
    if (!(destination instanceof Uint8Array || destination instanceof Uint8ClampedArray)) throw new TypeError('destination must be an 8-bit typed array');
    if (!isSafeInteger(offset) || offset < 0 || offset + 3 >= destination.length) throw new RangeError('retained destination offset is out of bounds');
    if (!Number.isInteger(coverage) || coverage < 0 || coverage > 255) throw new RangeError('coverage must be an 8-bit integer');
    if (coverage === 0) return;
    let foreground = normalizeOpaqueForeground(color);
    (destination[offset]! = (foreground[0]! * (coverage + 1)) >> 8),
        (destination[offset + 1]! = (foreground[1]! * (coverage + 1)) >> 8),
        (destination[offset + 2]! = (foreground[2]! * (coverage + 1)) >> 8),
        (destination[offset + 3]! = coverage);
}
export function compositeAir32RetainedToOpaque(retained: BytePixels, background: ColorChannels) {
    if (!(retained instanceof Uint8Array || retained instanceof Uint8ClampedArray) || retained.length % 4 !== 0)
        throw new TypeError('retained must contain premultiplied RGBA bytes');
    let channels = normalizeOpaqueBackground(background),
        pixels = new Uint8ClampedArray(retained.length);
    for (let offset = 0; offset < retained.length; offset += 4) {
        let inverseAlpha = 256 - retained[offset + 3]!;
        for (let channel = 0; channel < 3; channel++)
            pixels[offset + channel]! = Math.min(255, retained[offset + channel]! + ((channels[channel]! * inverseAlpha) >> 8));
        pixels[offset + 3]! = 255;
    }
    return pixels;
}
export function normalizeOpaqueForeground(color: ColorChannels) {
    if ((!isArray(color) && !ArrayBuffer.isView(color)) || color.length !== 4 || [...color].some((e) => !Number.isInteger(e) || e < 0 || e > 255))
        throw new RangeError('foreground must contain RGBA bytes');
    if (color[3]! !== 255) throw new RangeError('exact AIR32 NORMAL retained rendering requires opaque text');
    return color;
}
export function normalizeOpaqueBackground(color: ColorChannels) {
    if ((!isArray(color) && !ArrayBuffer.isView(color)) || color.length !== 4 || [...color].some((e) => !Number.isInteger(e) || e < 0 || e > 255))
        throw new RangeError('background must contain RGBA bytes');
    if (color[3]! !== 255) throw new RangeError('retained destination background must be opaque');
    return color;
}
var defaultOptions = Object.freeze({
        antiAliasType: 'advanced',
        gridFitType: 'pixel',
        thickness: 0,
        sharpness: 0,
        kerning: !0,
        stageQuality: 'high',
        renderingPipeline: 'direct',
        color: Object.freeze([0, 0, 0, 255]),
        background: Object.freeze([255, 255, 255, 255]),
        padding: 0
    }),
    etchingOffsets: Readonly<Record<string, RasterPoint>> = Object.freeze({
        'top-left': Object.freeze({ x: -1, y: -1 }),
        top: Object.freeze({ x: 0, y: -1 }),
        'top-right': Object.freeze({ x: 1, y: -1 }),
        left: Object.freeze({ x: -1, y: 0 }),
        right: Object.freeze({ x: 1, y: 0 }),
        'bottom-left': Object.freeze({ x: -1, y: 1 }),
        bottom: Object.freeze({ x: 0, y: 1 }),
        'bottom-right': Object.freeze({ x: 1, y: 1 })
    }),
    maxRasterCacheEntries = 8192,
    maxRasterCacheBytes = 2 * 1024 * 1024,
    maxZonedLayoutCacheEntries = 8192,
    fontRasterCaches = new WeakMap<NativeFont, RasterCache<CoverageRaster>>();
export function prepareAir32NativeFont(profile: RawNativeProfile | NativeProfile, swfFont: SwfFont) {
    let preparedProfile = profile?.glyphs instanceof Map ? (profile as NativeProfile) : prepareAir32NativeProfile(profile as RawNativeProfile);
    if (!swfFont || !isSafeInteger(swfFont.emSquare) || !isArray(swfFont.glyphs) || !isArray(swfFont.kerning))
        throw new TypeError('swfFont must contain DefineFont3 emSquare, glyphs, and kerning');
    let swfGlyphs = new Map(swfFont.glyphs.map((s) => [s.code, s])),
        kerning = new Map(swfFont.kerning.map((s) => [`${s.leftCode},${s.rightCode}`, s.adjustment]));
    return { profile: preparedProfile, swfFont: swfFont, swfGlyphs: swfGlyphs, kerning: kerning };
}
export class Air32NativeTextRenderer {
    declare font: NativeFont;
    declare glyphRunCache: Map<string, CachedGlyphRaster>;
    constructor(font: NativeFont) {
        if (!font?.profile?.glyphs || !font?.swfGlyphs) throw new TypeError('nativeFont must be returned by prepareAir32NativeFont');
        (this.font = font), (this.glyphRunCache = new Map());
    }
    clearGlyphRunCache() {
        this.glyphRunCache.clear();
    }
    render(text: unknown, options: NativeRenderOptions = {}) {
        let resolved = resolveOptions(options),
            content = String(text),
            size = resolved.size,
            normal = resolved.antiAliasType === 'normal',
            metrics = resolveLineMetrics(this.font.swfFont, size, normal, resolved.stageQuality),
            layout = normal ? layoutNormalText(this.font, content, size, resolved.kerning) : layoutNativeText(this.font, content, size, resolved.kerning);
        !normal &&
            this.font.swfFont.alignmentZones != null &&
            resolved.fontStyle === 'italic' &&
            (layout = { ...layout, fieldWidth: Math.round((layout.fieldWidth + air51AdvancedItalicOverhang(size)) * 20) / 20 }),
            normal &&
                resolved.stageQuality === 'low' &&
                resolved.fontStyle === 'italic' &&
                !this.font.swfFont.flags?.italic &&
                (layout = { ...layout, fieldWidth: layout.fieldWidth + lowNormalItalicOverhang(size) });
        let width = resolved.target?.width ?? Math.max(1, Math.ceil(layout.fieldWidth) + resolved.padding * 2),
            height = resolved.target?.height ?? Math.max(1, Math.ceil(metrics.fieldHeight) + resolved.padding * 2),
            retainedPipeline = resolved.renderingPipeline === 'habbo-retained',
            retained = retainedPipeline ? (resolved.target?.pixels ?? createAir32RetainedBitmap(width, height)) : null,
            pixels = resolved.target?.pixels ?? new Uint8ClampedArray(width * height * 4);
        if ((retainedPipeline || fillOpaque(pixels, resolved.background), normal))
            if (resolved.stageQuality === 'low') {
                let coverage = rasterizeLowNormalRun(this.font, layout, metrics, resolved, width, height);
                retainedPipeline
                    ? compositeLowNormalRetainedCoverage(coverage, retained!, resolved.color)
                    : compositeLowNormalCoverage(coverage, pixels, resolved.color);
            } else {
                let coverage = rasterizeNormalRun(this.font, layout, metrics, resolved, width, height);
                retainedPipeline
                    ? compositeNormalRetainedCoverage(coverage, retained!, resolved.color)
                    : compositeNormalCoverage(coverage, pixels, resolved.color);
            }
        else {
            let colorType = air32ColorType(resolved.color, resolved.color[3]!),
                cutoffs = resolveAir32TextFieldCsm(
                    size,
                    resolved.thickness,
                    resolved.sharpness,
                    colorType,
                    this.font.swfFont.alignmentZones?.csmTableHint ?? 0
                );
            if (retainedPipeline)
                resolved.etching &&
                    renderAdvancedRetainedPass(
                        this.font,
                        layout,
                        metrics,
                        resolved,
                        width,
                        height,
                        retained!,
                        cutoffs,
                        resolved.etching.glyphColor,
                        resolved.etching.offset.x,
                        resolved.etching.offset.y,
                        resolved.underline ? resolved.etching.lineColor : null
                    ),
                    renderAdvancedRetainedPass(
                        this.font,
                        layout,
                        metrics,
                        resolved,
                        width,
                        height,
                        retained!,
                        cutoffs,
                        resolved.transformedGlyphColor ?? resolved.color,
                        resolved.target?.offsetX ?? 0,
                        resolved.target?.offsetY ?? 0,
                        resolved.underline ? (resolved.transformedLineColor ?? resolved.color) : null
                    );
            else {
                if (this.font.swfFont.alignmentZones != null)
                    for (let placementIndex = layout.placements.length - 1; placementIndex >= 0; placementIndex--) {
                        let placement = layout.placements[placementIndex]!;
                        if (!placement.hasInk) continue;
                        let glyph = requireNativeGlyph(this.font, placement.codepoint),
                            prepared = prepareOccurrence(glyph, placement, metrics, resolved.padding),
                            key = glyphRunCacheKey(placement.codepoint, placement.phaseIndex, prepared.setup, cutoffs);
                        if (this.glyphRunCache.has(key)) continue;
                        let raster = rasterizeOccurrence(glyph, prepared.setup, cutoffs);
                        this.glyphRunCache.set(key, {
                            ...raster,
                            originOffsetX: raster.originX - prepared.deviceAnchorX,
                            originOffsetY: raster.originY - prepared.deviceAnchorY
                        });
                    }
                for (const placement of layout.placements) {
                    if (!placement.hasInk) continue;
                    const glyph = requireNativeGlyph(this.font, placement.codepoint);
                    const prepared = prepareOccurrence(glyph, placement, metrics, resolved.padding);
                    const key = glyphRunCacheKey(placement.codepoint, placement.phaseIndex, prepared.setup, cutoffs);
                    let cached = this.glyphRunCache.get(key);
                    if (!cached) {
                        const raster = rasterizeOccurrence(glyph, prepared.setup, cutoffs);
                        cached = {
                            ...raster,
                            originOffsetX: raster.originX - prepared.deviceAnchorX,
                            originOffsetY: raster.originY - prepared.deviceAnchorY
                        };
                        this.glyphRunCache.set(key, cached);
                    }
                    const originX = prepared.deviceAnchorX + cached.originOffsetX;
                    const originY = prepared.deviceAnchorY + cached.originOffsetY;
                    compositeNativeGlyph(cached, pixels, width, height, originX, originY, resolved.color);
                }
            }
        }
        return (
            retainedPipeline && !resolved.target && (pixels = compositeAir32RetainedToOpaque(retained!, resolved.background)),
            { ...layout, ...metrics, width: width, height: height, pixels: pixels, ...(retainedPipeline ? { retainedPixels: retained } : {}) }
        );
    }
    put(context: NativeContext2D, text: unknown, x = 0, y = 0, options: NativeRenderOptions = {}) {
        if (!context?.createImageData || !context?.putImageData) throw new TypeError('context must be a Canvas 2D rendering context');
        let rendered = this.render(text, options),
            image = context.createImageData(rendered.width, rendered.height);
        return image.data.set(rendered.pixels), context.putImageData(image, x, y), rendered;
    }
}
export function layoutNativeText(font: NativeFont, text: string, size: number, useKerning = true): NativeTextLayout {
    if (!isSafeInteger(size) || size <= 0) throw new RangeError('the exact native layout currently requires integer size');
    if (typeof useKerning != 'boolean') throw new TypeError('useKerning must be boolean');
    if (font.swfFont.alignmentZones != null) return layoutZonedNativeText(font, text, size, useKerning);
    let { emSquare: emSquare } = font.swfFont,
        penUnits = 0,
        previousCodepoint = null,
        placements = [];
    for (let stringIndex = 0; stringIndex < text.length; stringIndex++) {
        let codepoint = text.charCodeAt(stringIndex),
            glyph = font.swfGlyphs.get(codepoint);
        if (!glyph || glyph.advance == null) throw new RangeError(`DefineFont3 has no mapped glyph for U+${codepoint.toString(16).padStart(4, '0')}`);
        useKerning && previousCodepoint !== null && (penUnits += font.kerning.get(`${previousCodepoint},${codepoint}`) ?? 0);
        let scaledPen = penUnits * size;
        assertSafeRun(scaledPen);
        let integerPen = Math.floor(scaledPen / emSquare),
            remainder = scaledPen - integerPen * emSquare,
            roundedPhase = roundRationalTiesEven(remainder * 8, emSquare),
            phaseIndex = roundedPhase & 7,
            anchorX = integerPen + (roundedPhase >= 4 ? 1 : 0);
        placements.push({
            codepoint: codepoint,
            stringIndex: stringIndex,
            penUnits: penUnits,
            penX: scaledPen / emSquare,
            phaseIndex: phaseIndex,
            roundedPhase: roundedPhase,
            anchorX: anchorX,
            maskPenX: integerPen + roundedPhase / 8,
            hasInk: swfGlyphHasInk(font, glyph, codepoint)
        }),
            (penUnits += glyph.advance),
            (previousCodepoint = codepoint);
    }
    let scaledWidth = penUnits * size;
    assertSafeRun(scaledWidth);
    let rawTextWidth = scaledWidth / emSquare,
        textWidth = Math.floor((scaledWidth * 20) / emSquare) / 20;
    return { placements: placements, rawTextWidth: rawTextWidth, textWidth: textWidth, fieldWidth: textWidth + 4 };
}
export function layoutZonedNativeText(font: NativeFont, text: string, size: number, useKerning = true): NativeTextLayout {
    if (!isSafeInteger(size) || size <= 0) throw new RangeError('the exact native layout currently requires integer size');
    if (typeof useKerning != 'boolean') throw new TypeError('useKerning must be boolean');
    let cache = zonedLayoutCaches.get(font);
    cache || ((cache = new Map()), zonedLayoutCaches.set(font, cache));
    let penX = 0,
        placements = [];
    for (let stringIndex = 0; stringIndex < text.length; stringIndex++) {
        let codepoint = text.charCodeAt(stringIndex),
            glyph = font.swfGlyphs.get(codepoint);
        if (!glyph || glyph.advance == null) throw new RangeError(`DefineFont3 has no mapped glyph for U+${codepoint.toString(16).padStart(4, '0')}`);
        let integerPen = Math.floor(penX),
            roundedPhase = roundTiesEven((penX - integerPen) * 8),
            phaseIndex = roundedPhase & 7,
            maskPenX = integerPen + roundedPhase / 8,
            anchorX = integerPen + (roundedPhase >= 4 ? 1 : 0),
            hasInk = swfGlyphHasInk(font, glyph, codepoint);
        placements.push({
            codepoint: codepoint,
            stringIndex: stringIndex,
            penX: penX,
            phaseIndex: phaseIndex,
            roundedPhase: roundedPhase,
            anchorX: anchorX,
            maskPenX: maskPenX,
            hasInk: hasInk
        });
        let scale = size / 1024,
            residual = 0;
        if (hasInk) {
            let cacheKey = `${codepoint}:${size}:${maskPenX}`,
                cachedScale = cache.get(cacheKey);
            if (cachedScale) cache.delete(cacheKey);
            else {
                let nativeGlyph = requireNativeGlyph(font, codepoint),
                    setup = deriveAir32AdvancedPixelSetup(nativeGlyph.imp1, { pointSize: size, fittedPenX: maskPenX + 0.5, fittedPenY: 0 });
                cachedScale = [setup.normalizedScaleX, setup.residualX];
            }
            cache.set(cacheKey, cachedScale),
                cache.size > maxZonedLayoutCacheEntries && cache.delete(cache.keys().next().value!),
                (scale = cachedScale[0]!),
                (residual = cachedScale[1]!);
        }
        let advance = glyph.advance;
        if (useKerning && stringIndex + 1 < text.length) {
            let cacheKey = text.charCodeAt(stringIndex + 1);
            advance += font.kerning.get(`${codepoint},${cacheKey}`) ?? 0;
        }
        penX += (advance / 20) * scale + residual;
    }
    let rawTextWidth = penX,
        textWidth = Math.floor(rawTextWidth * 20) / 20;
    return { placements: placements, rawTextWidth: rawTextWidth, textWidth: textWidth, fieldWidth: textWidth + 4 };
}
var zonedLayoutCaches = new WeakMap<NativeFont, Map<string, number[]>>();
export function layoutNormalText(font: NativeFont, text: string, size: number, useKerning = true): NativeTextLayout {
    if (!isSafeInteger(size) || size <= 0) throw new RangeError('the exact native layout currently requires integer size');
    if (typeof useKerning != 'boolean') throw new TypeError('useKerning must be boolean');
    let { emSquare: emSquare } = font.swfFont,
        penTwips = 0,
        scaledWidth = 0,
        placements = [];
    for (let stringIndex = 0; stringIndex < text.length; stringIndex++) {
        let codepoint = text.charCodeAt(stringIndex),
            glyph = font.swfGlyphs.get(codepoint);
        if (!glyph || glyph.advance == null) throw new RangeError(`DefineFont3 has no mapped glyph for U+${codepoint.toString(16).padStart(4, '0')}`);
        placements.push({
            codepoint: codepoint,
            stringIndex: stringIndex,
            penTwips: penTwips,
            penX: penTwips / 20,
            maskPenX: roundToQuarterPixel(penTwips / 20),
            hasInk: swfGlyphHasInk(font, glyph, codepoint)
        });
        let advance = glyph.advance;
        if (useKerning && stringIndex + 1 < text.length) {
            let nextCodepoint = text.charCodeAt(stringIndex + 1);
            advance += font.kerning.get(`${codepoint},${nextCodepoint}`) ?? 0;
        }
        let scaledTwipAdvance = advance * size * 20,
            scaledAdvance = advance * size;
        assertSafeRun(scaledTwipAdvance),
            assertSafeRun(scaledAdvance),
            (penTwips += Math.floor(scaledTwipAdvance / emSquare)),
            (scaledWidth += scaledAdvance),
            assertSafeRun(penTwips),
            assertSafeRun(scaledWidth);
    }
    let textWidth = penTwips / 20;
    return { placements: placements, rawTextWidth: scaledWidth / emSquare, textWidth: textWidth, fieldWidth: textWidth + 4 };
}
export function resolveOptions(options: NativeRenderOptions) {
    let antiAliasType = options.antiAliasType ?? defaultOptions.antiAliasType,
        gridFitType = options.gridFitType ?? defaultOptions.gridFitType;
    if (
        !(antiAliasType === 'normal'
            ? gridFitType === 'none' || gridFitType === 'pixel' || gridFitType === 'subpixel'
            : antiAliasType === 'advanced' && gridFitType === 'pixel')
    )
        throw new RangeError(`unsupported AIR mode ${antiAliasType} + ${gridFitType}; the native path supports advanced + pixel and line-only normal text`);
    if ((options.letterSpacing ?? 0) !== 0) throw new RangeError('native letterSpacing is not implemented yet');
    let size = options.size;
    if (!isFiniteNumber(size)) throw new TypeError('configuration.size is required');
    let renderingPipeline = options.renderingPipeline ?? defaultOptions.renderingPipeline;
    if (renderingPipeline !== 'direct' && renderingPipeline !== 'habbo-retained') throw new RangeError('renderingPipeline must be direct or habbo-retained');
    let stageQuality = options.stageQuality ?? defaultOptions.stageQuality;
    if (stageQuality !== 'high' && stageQuality !== 'low') throw new RangeError('stageQuality must be high or low');
    let fontStyle = options.fontStyle ?? 'normal';
    if (fontStyle !== 'normal' && fontStyle !== 'italic') throw new RangeError('fontStyle must be normal or italic');
    let kerning = options.kerning ?? defaultOptions.kerning;
    if (typeof kerning != 'boolean') throw new TypeError('kerning must be boolean');
    let padding = options.padding ?? defaultOptions.padding;
    if (!isSafeInteger(padding) || padding < 0) throw new RangeError('padding must be a non-negative integer');
    let color = normalizeTextColor(options.color ?? defaultOptions.color, options.alpha),
        colorTransform = options.colorTransform,
        transformedGlyphColor,
        transformedLineColor;
    if (colorTransform) {
        let clamp = (value: number) => Math.max(0, Math.min(255, Math.trunc(value)));
        (transformedLineColor = [
            clamp(color[0]! * colorTransform.redMultiplier + colorTransform.redOffset),
            clamp(color[1]! * colorTransform.greenMultiplier + colorTransform.greenOffset),
            clamp(color[2]! * colorTransform.blueMultiplier + colorTransform.blueOffset),
            clamp(color[3]! * colorTransform.alphaMultiplier + colorTransform.alphaOffset)
        ]),
            (transformedGlyphColor = [...transformedLineColor]),
            (transformedGlyphColor[3]! = quantizeAir32AlphaMultiplier(transformedLineColor[3]! / 255));
    }
    if ((options.backgroundAlpha ?? 1) !== 1) throw new RangeError('native translucent backgrounds require an AIR grayscale alpha-mask plane');
    let background = normalizeOpaqueColor(options.background ?? defaultOptions.background, 'background'),
        decoration = options.textDecoration ?? null;
    if (decoration !== null && decoration !== 'underline') throw new RangeError('textDecoration must be underline or null');
    let underline = decoration === 'underline',
        etching = resolveHabboEtching(options.etchingColor, options.etchingPosition);
    if ((underline || etching) && renderingPipeline !== 'habbo-retained')
        throw new RangeError('textDecoration and etching require renderingPipeline=habbo-retained');
    if ((underline || etching) && antiAliasType !== 'advanced') throw new RangeError('Habbo skin effects are currently exact for ADVANCED text only');
    return {
        antiAliasType: antiAliasType,
        gridFitType: gridFitType,
        thickness: finiteNumber(options.thickness ?? 0, 'thickness'),
        sharpness: finiteNumber(options.sharpness ?? 0, 'sharpness'),
        kerning: kerning,
        stageQuality: stageQuality,
        fontStyle: fontStyle,
        renderingPipeline: renderingPipeline,
        size: size,
        padding: padding,
        color: color,
        background: background,
        transformedGlyphColor: transformedGlyphColor,
        transformedLineColor: transformedLineColor,
        target: options.target,
        rasterCache: options.rasterCache,
        underline: underline,
        etching: etching
    };
}
export function resolveHabboEtching(color: number | string | null | undefined, position: string | null | undefined) {
    if (color == null) {
        if (position != null) throw new RangeError('etchingPosition requires etchingColor');
        return null;
    }
    let argb = normalizeArgbColor(color, 'etchingColor'),
        alpha = argb >>> 24;
    if (alpha === 0) return null;
    let resolvedPosition = position ?? 'bottom',
        offset = etchingOffsets[resolvedPosition]!;
    if (!offset) throw new RangeError(`unsupported etchingPosition ${JSON.stringify(resolvedPosition)}`);
    let red = (argb >>> 16) & 255,
        green = (argb >>> 8) & 255,
        blue = argb & 255;
    return {
        argb: argb,
        position: resolvedPosition,
        offset: offset,
        glyphColor: [red, green, blue, quantizeAir32AlphaMultiplier(alpha / 255)],
        lineColor: [red, green, blue, alpha]
    };
}
export function resolveLineMetrics(font: SwfFont, size: number, normal = false, quality = 'high') {
    let ascent = floorToTwips((font.metrics.ascent * size) / font.emSquare),
        descent = floorToTwips((font.metrics.descent * size) / font.emSquare),
        textHeight = ascent + descent;
    return {
        size: size,
        ascent: ascent,
        descent: descent,
        leading: 0,
        textHeight: textHeight,
        fieldHeight: textHeight + 4,
        baseline: normal ? (quality === 'low' ? roundTiesEven(ascent + 2) : roundToQuarterPixel(ascent + 2)) : roundTiesEven(ascent + 2)
    };
}
export function rasterizeNormalRun(
    font: NativeFont,
    layout: NativeTextLayout,
    metrics: NativeLineMetrics,
    options: ResolvedNativeOptions,
    width: number,
    height: number
) {
    let sampleMasks = new Uint16Array(width * height),
        baselineY = options.padding + metrics.baseline;
    for (let placement of layout.placements) {
        if (!placement.hasInk) continue;
        let glyph = requireNativeGlyph(font, placement.codepoint);
        rasterizeAir32NormalImp1(glyph.imp1, {
            sampleMasks: sampleMasks,
            width: width,
            height: height,
            originX: options.padding + 2 + placement.maskPenX,
            baselineY: baselineY,
            size: metrics.size,
            emSquare: font.swfFont.emSquare
        });
    }
    return sampleMasks;
}
export function rasterizeLowNormalRun(
    font: NativeFont,
    layout: NativeTextLayout,
    metrics: NativeLineMetrics,
    options: ResolvedNativeOptions,
    width: number,
    height: number
) {
    let coverage = new Uint8Array(width * height),
        baselineY = options.padding + metrics.baseline;
    for (let placement of layout.placements) {
        if (!placement.hasInk) continue;
        let glyph = requireNativeGlyph(font, placement.codepoint);
        rasterizeAirLowNormalImp1(glyph.imp1, {
            coverage: coverage,
            width: width,
            height: height,
            originX: options.padding + 2 + roundTiesEven(placement.penX),
            baselineY: baselineY,
            size: metrics.size,
            emSquare: font.swfFont.emSquare
        });
    }
    return coverage;
}
export function compositeNormalCoverage(masks: Uint16Array, pixels: BytePixels, color: ColorChannels) {
    if (color[3]! !== 255) throw new RangeError('exact AIR32 NORMAL compositing currently requires opaque text');
    for (let index = 0; index < masks.length; index++) {
        let mask = masks[index]!;
        if (mask === 0) continue;
        let density = normalSampleCountToDensity(normalSampleMaskCount(mask)),
            offset = index * 4;
        for (let channel = 0; channel < 3; channel++)
            pixels[offset + channel]! = blendNormalOpaqueComponent(pixels[offset + channel]!, color[channel]!, density);
    }
}
export function compositeNormalRetainedCoverage(masks: Uint16Array, pixels: BytePixels, color: ColorChannels) {
    if (color[3]! !== 255) throw new RangeError('exact AIR32 NORMAL retained rendering requires opaque text');
    for (let index = 0; index < masks.length; index++) {
        let mask = masks[index]!;
        if (mask === 0) continue;
        let density = normalSampleCountToDensity(normalSampleMaskCount(mask));
        setAir32NormalRetainedCoverage(pixels, index * 4, color, density);
    }
}
export function compositeLowNormalCoverage(coverage: Uint8Array, pixels: BytePixels, color: ColorChannels) {
    requireOpaqueNormalForeground(color, 'LOW NORMAL');
    for (let index = 0; index < coverage.length; index++) {
        if (coverage[index]! === 0) continue;
        let offset = index * 4;
        (pixels[offset]! = color[0]!), (pixels[offset + 1]! = color[1]!), (pixels[offset + 2]! = color[2]!);
    }
}
export function compositeLowNormalRetainedCoverage(coverage: Uint8Array, pixels: BytePixels, color: ColorChannels) {
    requireOpaqueNormalForeground(color, 'LOW NORMAL retained');
    for (let index = 0; index < coverage.length; index++) coverage[index]! !== 0 && setAir32NormalRetainedCoverage(pixels, index * 4, color, 255);
}
export function requireOpaqueNormalForeground(color: ColorChannels, mode: string) {
    if (color[3]! !== 255) throw new RangeError(`exact AIR ${mode} rendering requires opaque text`);
}
export function lowNormalItalicOverhang(size: number) {
    return Math.floor(size * 0.8) / 2;
}
export function air51AdvancedItalicOverhang(size: number) {
    let overhang = size * Math.fround(0.28) + Math.fround(1.04);
    return Math.floor(overhang * 20) / 20;
}
export function blendNormalOpaqueComponent(destination: number, foreground: number, coverage: number) {
    if (coverage === 255) return foreground;
    let difference = foreground - destination,
        scaledDifference = (Math.abs(difference) * coverage) / 256;
    return destination + Math.sign(difference) * Math.ceil(scaledDifference);
}
export function requireNativeGlyph(font: NativeFont, codepoint: number) {
    let glyph = font.profile.glyphs.get(codepoint);
    if (!glyph) throw new RangeError(`native profile has no rendered IMP1 glyph for U+${codepoint.toString(16).padStart(4, '0')}`);
    return glyph;
}
export function swfGlyphHasInk(font: NativeFont, glyph: SwfGlyph, codepoint: number) {
    return (
        glyph.hasInk ??
        (font.profile.glyphs.has(codepoint) ||
            glyph.shape?.contours?.length! > 0 ||
            glyph.bounds?.xMin !== glyph.bounds?.xMax ||
            glyph.bounds?.yMin !== glyph.bounds?.yMax)
    );
}
export function prepareOccurrence(glyph: NativeGlyph, placement: GlyphPlacement, metrics: NativeLineMetrics, padding: number) {
    let penX = padding + 2 + placement.maskPenX + 0.5,
        penY = -(padding + metrics.baseline);
    return {
        setup: deriveAir32AdvancedPixelSetup(glyph.imp1, { pointSize: metrics.size, fittedPenX: penX, fittedPenY: penY }),
        deviceAnchorX: padding + 2 + placement.anchorX!,
        deviceAnchorY: padding + metrics.baseline
    };
}
export function prepareRetainedOccurrence(glyph: NativeGlyph, placement: GlyphPlacement, metrics: NativeLineMetrics, padding: number) {
    let penX = padding + 2 + placement.maskPenX + 0.5,
        penY = -(padding + metrics.baseline);
    return {
        setup: deriveAir32AdvancedRetainedSetup(glyph.imp1, { pointSize: metrics.size, fittedPenX: penX, fittedPenY: penY }),
        deviceAnchorX: padding + 2 + placement.anchorX!,
        deviceAnchorY: padding + metrics.baseline
    };
}
export function rasterizeOccurrence(glyph: NativeGlyph, setup: AdvancedPixelSetup, cutoffs: CsmCutoffs) {
    let fround = Math.fround;
    return {
        ...rasterizeAir32Imp1(glyph.imp1, {
            width: setup.width,
            height: setup.height,
            rowStride: setup.rowStride,
            matrix: setup.matrix,
            outsideCutoff: fround(cutoffs.outside),
            insideCutoff: fround(cutoffs.inside),
            useColorReduction: !0,
            colorReductionAmount: 0.5
        }),
        originX: setup.originX,
        originY: setup.originY,
        matrix: setup.matrix,
        setup: setup
    };
}
export function rasterizeRetainedOccurrence(glyph: NativeGlyph, setup: AdvancedPixelSetup, cutoffs: CsmCutoffs) {
    let outside = Math.fround(cutoffs.outside),
        inside = Math.fround(cutoffs.inside),
        lines = air32FlattenedPathToLines(air32TransformAndFlattenImp1(glyph.imp1, setup.matrix)),
        distances = rasterizeAir32GrayscaleAdfDistances(lines, { width: setup.width, height: setup.height, outsideCutoff: outside, insideCutoff: inside }),
        coverage = new Uint8Array(distances.values.length);
    for (let index = 0; index < coverage.length; index++) {
        let distance = distances.values[index]!;
        coverage[index]! =
            distance < outside ? 0 : distance >= inside || outside === inside ? 255 : Math.trunc((255 * (distance - outside)) / (inside - outside));
    }
    return { width: setup.width, height: setup.height, coverage: coverage, originX: setup.originX, originY: setup.originY };
}
export function renderAdvancedRetainedPass(
    font: NativeFont,
    layout: NativeTextLayout,
    metrics: NativeLineMetrics,
    options: ResolvedNativeOptions,
    width: number,
    height: number,
    pixels: BytePixels,
    cutoffs: CsmCutoffs,
    color: ColorChannels,
    offsetX: number,
    offsetY: number,
    lineColor: ColorChannels | null
) {
    let premultiplied = premultiplyAir32Color(color);
    lineColor &&
        compositeRetainedUnderline(
            pixels,
            width,
            height,
            options.padding + 2 + offsetX,
            options.padding + metrics.baseline + 1 + offsetY,
            font.swfFont.alignmentZones == null ? Math.floor(layout.rawTextWidth * 4) / 4 : Math.ceil(layout.rawTextWidth),
            lineColor
        );
    for (let placement of layout.placements) {
        if (!placement.hasInk) continue;
        let rasterCache = options.rasterCache,
            occurrenceKey = rasterCache
                ? JSON.stringify([placement.codepoint, metrics.size, metrics.baseline, options.padding, placement.maskPenX, cutoffs.outside, cutoffs.inside])
                : null,
            occurrence = rasterCache?.entries.get(occurrenceKey);
        if (occurrence) rasterCache!.entries.delete(occurrenceKey), rasterCache!.entries.set(occurrenceKey, occurrence);
        else {
            let glyph = requireNativeGlyph(font, placement.codepoint),
                prepared = prepareRetainedOccurrence(glyph, placement, metrics, options.padding),
                fontCache = rasterCache ? fontRasterCaches.get(font) : null;
            rasterCache && !fontCache && ((fontCache = { entries: new Map(), bytes: 0 }), fontRasterCaches.set(font, fontCache));
            let glyphKey = fontCache
                    ? air32GlyphRasterKey(placement.codepoint, prepared.setup, [Math.fround(cutoffs.outside), Math.fround(cutoffs.inside)])
                    : null,
                cachedRaster = fontCache?.entries.get(glyphKey);
            if (cachedRaster) fontCache!.entries.delete(glyphKey), fontCache!.entries.set(glyphKey, cachedRaster);
            else {
                let raster = rasterizeRetainedOccurrence(glyph, prepared.setup, cutoffs);
                if (
                    ((cachedRaster = { width: raster.width, height: raster.height, coverage: raster.coverage }),
                    fontCache && cachedRaster.coverage.byteLength <= 512 * 1024)
                )
                    for (
                        fontCache!.entries.set(glyphKey, cachedRaster), fontCache!.bytes += cachedRaster.coverage.byteLength;
                        fontCache!.entries.size > 4096 || fontCache!.bytes > 512 * 1024;
                    ) {
                        let [oldKey, oldRaster] = fontCache!.entries.entries().next().value!;
                        fontCache!.entries.delete(oldKey), (fontCache!.bytes -= oldRaster.coverage.byteLength);
                    }
            }
            if (
                ((occurrence = { ...cachedRaster, originX: prepared.setup.originX, originY: prepared.setup.originY }),
                rasterCache && occurrence.coverage.byteLength <= maxRasterCacheBytes)
            )
                for (
                    rasterCache!.entries.set(occurrenceKey, occurrence), rasterCache!.bytes += occurrence.coverage.byteLength;
                    rasterCache!.entries.size > maxRasterCacheEntries || rasterCache!.bytes > maxRasterCacheBytes;
                ) {
                    let [oldKey, oldRaster] = rasterCache!.entries.entries().next().value!;
                    rasterCache!.entries.delete(oldKey), (rasterCache!.bytes -= oldRaster.coverage.byteLength);
                }
        }
        compositeRetainedNativeGlyph(occurrence, pixels, width, height, occurrence.originX + offsetX, occurrence.originY + offsetY, premultiplied);
    }
}
export function compositeRetainedUnderline(pixels: BytePixels, width: number, height: number, x: number, y: number, length: number, color: ColorChannels) {
    if (y < 0 || y >= height || length <= 0) return;
    let wholePixels = Math.floor(length);
    for (let index = 0; index < wholePixels; index++) {
        let pixelX = x + index;
        if (pixelX < 0 || pixelX >= width) continue;
        let offset = (y * width + pixelX) * 4;
        color[3]! === 255
            ? ((pixels[offset]! = color[0]!), (pixels[offset + 1]! = color[1]!), (pixels[offset + 2]! = color[2]!), (pixels[offset + 3]! = 255))
            : compositeAir32RetainedCoverage(pixels, offset, color, 255);
    }
    let fraction = length - wholePixels;
    if (fraction <= 0) return;
    let lastX = x + wholePixels;
    if (lastX < 0 || lastX >= width) return;
    let coverage = Math.round(fraction * 256);
    compositeAir32RetainedCoverage(pixels, (y * width + lastX) * 4, color, coverage);
}
export function glyphRunCacheKey(codepoint: number, phase: number | undefined, setup: AdvancedPixelSetup, cutoffs: CsmCutoffs) {
    return [codepoint, phase, ...setup.nativeKeyWords, float32Bits(Math.fround(cutoffs.outside)), float32Bits(Math.fround(cutoffs.inside))].join(':');
}
export function compositeNativeGlyph(glyph: NativeGlyphRaster, pixels: BytePixels, width: number, height: number, x: number, y: number, color: ColorChannels) {
    let premultiplied = premultiplyAir32Color(color),
        alpha = premultiplied[3]!;
    for (let row = 0; row < glyph.height; row++) {
        let targetY = y + row;
        if (targetY < 0 || targetY >= height) continue;
        let sourceRow = glyph.height - 1 - row;
        for (let column = 0; column < glyph.width; column++) {
            let targetX = x + column;
            if (targetX < 0 || targetX >= width) continue;
            let sourceOffset = sourceRow * glyph.rowStride + column * 4,
                coverage = [glyph.pixels[sourceOffset + 2]!, glyph.pixels[sourceOffset + 1]!, glyph.pixels[sourceOffset]!];
            if ((coverage[0]! | coverage[1]! | coverage[2]!) === 0) continue;
            let targetOffset = (targetY * width + targetX) * 4;
            for (let channel = 0; channel < 3; channel++)
                pixels[targetOffset + channel]! = blendAir32Component(pixels[targetOffset + channel]!, premultiplied[channel]!, alpha, coverage[channel]!);
        }
    }
}
export function compositeRetainedNativeGlyph(
    glyph: CoverageRaster,
    pixels: BytePixels,
    width: number,
    height: number,
    x: number,
    y: number,
    premultipliedColor: ColorChannels
) {
    let red = premultipliedColor[0]!,
        green = premultipliedColor[1]!,
        blue = premultipliedColor[2]!,
        alpha = premultipliedColor[3]!,
        firstX = Math.max(0, -x),
        lastX = Math.min(glyph.width, width - x),
        firstY = Math.max(0, -y),
        lastY = Math.min(glyph.height, height - y);
    for (let row = firstY; row < lastY; row++) {
        let targetY = y + row,
            sourceOffset = (glyph.height - 1 - row) * glyph.width + firstX,
            targetOffset = (targetY * width + x + firstX) * 4;
        for (let column = firstX; column < lastX; column++, sourceOffset++, targetOffset += 4) {
            let coverage = glyph.coverage[sourceOffset]!;
            if (coverage === 0) continue;
            let destinationRed = pixels[targetOffset]!,
                destinationGreen = pixels[targetOffset + 1]!,
                destinationBlue = pixels[targetOffset + 2]!,
                destinationAlpha = pixels[targetOffset + 3]!;
            (pixels[targetOffset]! = destinationRed + (((red - ((destinationRed * alpha) >> 8)) * coverage) >> 8)),
                (pixels[targetOffset + 1]! = destinationGreen + (((green - ((destinationGreen * alpha) >> 8)) * coverage) >> 8)),
                (pixels[targetOffset + 2]! = destinationBlue + (((blue - ((destinationBlue * alpha) >> 8)) * coverage) >> 8)),
                (pixels[targetOffset + 3]! = destinationAlpha + (((alpha - ((destinationAlpha * alpha) >> 8)) * coverage) >> 8));
        }
    }
}
export function normalizeTextColor(color: TextColor, alpha: number | undefined) {
    let channels;
    if (isSafeInteger(color) && color >= 0 && color <= 16777215) channels = [color >>> 16, (color >>> 8) & 255, color & 255, 255];
    else if (
        (isArray(color) || ArrayBuffer.isView(color)) &&
        color.length === 4 &&
        [...color].every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255)
    )
        channels = [...color];
    else throw new RangeError('color must be a 24-bit integer or RGBA bytes');
    if (alpha !== void 0) {
        if (!isFiniteNumber(alpha) || alpha < 0 || alpha > 1) throw new RangeError('alpha must be from 0 through 1');
        channels[3]! = quantizeAir32AlphaMultiplier(alpha);
    }
    return channels;
}
export function normalizeArgbColor(color: number | string, name: string) {
    let argb = color;
    if (typeof argb == 'string') {
        let match = /^#?([0-9a-f]{8})$/i.exec(argb);
        if (!match) throw new RangeError(`${name} must be an 8-digit ARGB color`);
        argb = Number.parseInt(match[1]!, 16);
    }
    if (!isSafeInteger(argb) || argb < 0 || argb > 4294967295) throw new RangeError(`${name} must be an unsigned 32-bit ARGB color`);
    return argb >>> 0;
}
export function fillOpaque(pixels: BytePixels, color: ColorChannels) {
    for (let offset = 0; offset < pixels.length; offset += 4)
        (pixels[offset]! = color[0]!), (pixels[offset + 1]! = color[1]!), (pixels[offset + 2]! = color[2]!), (pixels[offset + 3]! = 255);
}
export function normalizeOpaqueColor(color: TextColor, name: string) {
    if (isSafeInteger(color) && color >= 0 && color <= 16777215) return [color >>> 16, (color >>> 8) & 255, color & 255, 255];
    if ((!isArray(color) && !ArrayBuffer.isView(color)) || color.length !== 4 || [...color].some((r) => !Number.isInteger(r) || r < 0 || r > 255))
        throw new RangeError(`${name} must be a 24-bit integer or RGBA bytes`);
    if (color[3]! !== 255) throw new RangeError(`${name} must be opaque in the current native profile`);
    return [...color];
}
export function floorToTwips(value: number) {
    return Math.floor(value * 20) / 20;
}
export function roundToQuarterPixel(value: number) {
    return Math.round(value * 4) / 4;
}
export function finiteNumber(value: number, name: string) {
    if (!isFiniteNumber(value)) throw new TypeError(`${name} must be finite`);
    return value;
}
export function assertSafeRun(value: number) {
    if (!isSafeInteger(value)) throw new RangeError('text run is too long for exact DefineFont3 layout');
}
var nativeBundleFormat = 'air32-native-font-bundle-v1';
export function prepareAir32NativeBundle(bundle: NativeBundle) {
    if (!bundle || bundle.schemaVersion !== 1 || bundle.format !== nativeBundleFormat) throw new TypeError(`native bundle must use ${nativeBundleFormat}`);
    if (typeof bundle.fontKey != 'string' || bundle.fontKey.length === 0) throw new TypeError('native bundle fontKey must be a non-empty string');
    if (!bundle.nativeProfile || !isArray(bundle.nativeProfile.glyphs) || !bundle.swfFont || !isArray(bundle.swfFont.glyphs))
        throw new TypeError('native bundle must contain nativeProfile and swfFont glyphs');
    if (bundle.fontSha256 != null && bundle.nativeProfile.fontSha256 != null && bundle.fontSha256 !== bundle.nativeProfile.fontSha256)
        throw new Error('native bundle font hash does not match its IMP1 profile');
    let codepoints = new Set<number>();
    for (let glyph of bundle.nativeProfile.glyphs) {
        if (!isSafeInteger(glyph.codepoint) || codepoints.has(glyph.codepoint)) throw new Error('native bundle contains an invalid or duplicate codepoint');
        codepoints.add(glyph.codepoint);
    }
    let metricCodepoints = new Set(bundle.swfFont.glyphs.map((glyph) => glyph.code)),
        missing = [...codepoints].filter((glyph) => !metricCodepoints.has(glyph));
    if (missing.length) throw new Error(`DefineFont3 metrics are missing U+${missing[0]!.toString(16).toUpperCase()}`);
    if (bundle.coverage?.codepointCount != null && bundle.coverage.codepointCount !== codepoints.size)
        throw new Error('native bundle coverage count does not match its glyphs');
    if (bundle.coverage?.imp1GlyphCount != null && bundle.coverage.imp1GlyphCount !== codepoints.size)
        throw new Error('native bundle IMP1 count does not match its glyphs');
    if (bundle.coverage?.metricGlyphCount != null && bundle.coverage.metricGlyphCount !== metricCodepoints.size)
        throw new Error('native bundle metric count does not match its glyphs');
    return {
        ...prepareAir32NativeFont(bundle.nativeProfile, bundle.swfFont),
        fontKey: bundle.fontKey,
        bundleMetadata: Object.freeze({
            schemaVersion: bundle.schemaVersion,
            format: bundle.format,
            fontKey: bundle.fontKey,
            fontSha256: bundle.fontSha256 ?? null,
            runtime: bundle.runtime ?? bundle.nativeProfile.runtime ?? null,
            coverage: bundle.coverage == null ? null : { ...bundle.coverage }
        })
    };
}
/** Typed forms of the original numeric predicates; no coercion or added validation. */
function isSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value);
}
function isFiniteNumber(value: unknown): value is number {
    return Number.isFinite(value);
}

/** Boolean check keeps declared element types instead of widening them at Array.isArray. */
function isArray<T>(value: T): value is Extract<T, readonly unknown[]> {
    return Array.isArray(value);
}
