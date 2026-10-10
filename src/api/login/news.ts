import { GetConfiguration } from '@volt/renderer';

/**
 * Accepts a URL (http/https, protocol-relative, or site-relative),
 * a data URL with an image mime type, or a raw base64 image payload.
 * Anything else (including data:text/html, javascript:, etc.) is rejected
 * to keep an admin-set DB value from becoming an XSS / phishing vector.
 */
export const resolveNewsImage = (raw: string | null | undefined): string =>
{
    const value = (raw ?? '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('//')) return window.location.protocol + value;
    if (value.startsWith('/'))
    {
        try
        {
            return new URL(value, window.location.origin).href;
        }
        catch
        {
            return window.location.origin + value;
        }
    }
    if (value.startsWith('data:'))
    {
        return /^data:image\/[a-z0-9.+-]+[,;]/i.test(value) ? value : '';
    }

    const stripped = value.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(stripped)) return '';
    let mime = 'image/png';
    if (stripped.startsWith('/9j/')) mime = 'image/jpeg';
    else if (stripped.startsWith('R0lGOD')) mime = 'image/gif';
    else if (stripped.startsWith('UklGR')) mime = 'image/webp';
    else if (stripped.startsWith('PHN2Zy') || stripped.startsWith('PD94bWw')) mime = 'image/svg+xml';
    else if (stripped.startsWith('iVBORw0KGgo')) mime = 'image/png';
    return `data:${mime};base64,${stripped}`;
};

/**
 * Rejects anything that isn't an http(s) URL or a same-origin path so a
 * malicious DB value can't be a `javascript:` / `data:` / `file:` link.
 */
export const resolveNewsLink = (raw: string | null | undefined): string =>
{
    const value = (raw ?? '').trim();
    if (!value) return '';
    try
    {
        const url = new URL(value, window.location.href);
        const proto = url.protocol.toLowerCase();
        if (proto !== 'http:' && proto !== 'https:') return '';
        return url.href;
    }
    catch
    {
        return '';
    }
};

export interface NewsArticle {
    id: number;
    title: string;
    body: string;
    image: string;
    linkText: string;
    linkUrl: string;
}

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

const interpolate = (value: string): string =>
{
    try
    {
        return value ? GetConfiguration().interpolate(value) : '';
    }
    catch
    {
        return value;
    }
};

const toArticle = (raw: Record<string, unknown>, fallbackId: number): NewsArticle => ({
    id: typeof raw.id === 'number' ? raw.id : fallbackId,
    title: asText(raw.title),
    body: asText(raw.body),
    image: resolveNewsImage(interpolate(asText(raw.image))),
    linkText: asText(raw.linkText),
    linkUrl: resolveNewsLink(interpolate(asText(raw.linkUrl) || asText(raw.link)))
});

// Accepts either a bare array or `{ news: [...] }`; anything else is no news.
export const fetchNewsArticles = async (url: string, signal: AbortSignal): Promise<NewsArticle[]> =>
{
    const response = await fetch(url, { credentials: 'omit', signal });

    if (!response.ok) return [];

    const payload: unknown = await response.json();
    const list = Array.isArray(payload) ? payload : Array.isArray((payload as { news?: unknown })?.news) ? (payload as { news: unknown[] }).news : [];

    return list
        .filter((raw): raw is Record<string, unknown> => !!raw && typeof raw === 'object')
        .map((raw, index) => toArticle(raw, index + 1))
        .filter((article) => article.title.length > 0);
};
