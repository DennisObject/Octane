import { parseWiredInt64, wiredInt64Parts } from '@octane/renderer';

export const readWiredScalarLiteral = (fields: number[], count: number, index: number) =>
    fields.length === count + 2 && fields[count] === 1
        ? ((BigInt(fields[count + 1]) << 32n) | BigInt(fields[index] >>> 0)).toString()
        : String(fields[index] ?? 0);

export const parseWiredScalarLiteral = (text: string) => {
    try { return parseWiredInt64(text.trim()); } catch { return null; }
};

export const writeWiredScalarLiteral = (fields: number[], index: number, value: bigint, preserveExact: boolean) => {
    if (!preserveExact && value >= -2147483648n && value <= 2147483647n) {
        fields[index] = Number(value);
        return fields;
    }
    const [high, low] = wiredInt64Parts(value);
    fields[index] = low;
    return [...fields, 1, high];
};
