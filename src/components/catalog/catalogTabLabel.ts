export const parseCatalogTabLabel = (label: string) => {
    const trimmed = (label || '').trim();
    const match = trimmed.match(/^(.*?)(?:\s*\((\d+)\))\s*$/);

    if (!match) {
        return { name: trimmed, count: null as number | null };
    }

    const name = match[1].trim();
    const count = Number.parseInt(match[2], 10);

    return {
        name: name || trimmed,
        count: Number.isFinite(count) ? count : null
    };
};
