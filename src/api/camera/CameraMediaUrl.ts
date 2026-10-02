/** Only opaque PNG names minted by this hotel's camera may be displayed as photographs. */
export const getCameraMediaUrl = (value: unknown): string =>
    typeof value === 'string' && /^\/camera\/(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.png$/i.test(value) ? value : '';
