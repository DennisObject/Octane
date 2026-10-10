import { GetLocalizationManager, VoltLogger } from '@volt/renderer';

/**
 * Supplemental marketplace texts (public/configuration/marketplace-texts.json), applied over the loaded localization.
 * They are optional: a hotel whose configuration host does not serve the file keeps the default texts and still boots.
 */
export const loadMarketplaceTexts = async (): Promise<void> =>
{
    const url = new URL('configuration/marketplace-texts.json', document.baseURI).toString();

    try
    {
        const response = await fetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const texts = (await response.json()) as Record<string, unknown>;

        for (const [key, value] of Object.entries(texts))
        {
            if (typeof value === 'string') GetLocalizationManager().setValue(key, value);
        }
    }
    catch (error)
    {
        VoltLogger.warn(`[Localization] Marketplace texts unavailable at ${url}; the default texts stay in use`, error);
    }
};
