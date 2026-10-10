/** Reads an exact signed 64-bit decimal literal, without converting it through Number. */
export const parseWiredLiteral = (value: string | number | bigint): bigint | null => {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) return null;
    if (!/^-?\d+$/.test(String(value))) return null;

    const literal = BigInt(value);
    return literal >= -(1n << 63n) && literal < (1n << 63n) ? literal : null;
};

/** The signed high and low words of an exact 64-bit literal. */
export const splitWiredLiteral = (value: string | number | bigint): [number, number] => {
    const literal = parseWiredLiteral(value);
    if (literal === null) throw new RangeError('Invalid signed 64-bit Wired literal.');

    return [Number(BigInt.asIntN(32, literal >> 32n)), Number(BigInt.asIntN(32, literal))];
};

/** Decimal text preserves every bit while a stored literal is displayed and edited. */
export const joinWiredLiteral = (high: number, low: number): string => ((BigInt(high) << 32n) + BigInt(low >>> 0)).toString();
