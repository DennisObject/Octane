import { GetConfiguration } from '@octane/renderer';

// The artwork behind the hotel view. The login screen draws the same backdrop,
// so landing and entering the hotel show one continuous scene.
export interface LandingBackdrop {
    colour: string;
    backgroundUrl: string;
    sunUrl: string;
    drapeUrl: string;
    leftUrl: string;
    rightUrl: string;
    rightRepeatUrl: string;
}

export interface LandingSceneArtwork {
    backgroundUrl: string;
    leftUrl: string;
    rightUrl: string;
    drapeUrl: string;
}

const CACHE_KEY = 'octane.landing.backdrop';
const DEFAULT_COLOUR = '#6eadc8';
const HOTEL_VIEW_COLOUR = '#27afcf';

const interpolate = (value: unknown): string =>
{
    if (typeof value !== 'string' || !value.length) return '';

    try
    {
        return GetConfiguration().interpolate(value);
    }
    catch
    {
        return value;
    }
};

export const resolveLandingImageUrl = (url: string): string =>
{
    const configuration = GetConfiguration();

    return url
        .replaceAll('${image.library.url}', configuration.getValue<string>('image.library.url', ''))
        .replaceAll('${asset.url}', configuration.getValue<string>('asset.url', ''));
};

// `loginview.images` is the hotel's configured landing artwork.
export const getConfiguredLandingBackdrop = (): LandingBackdrop =>
{
    const images = (GetConfiguration().getValue<Record<string, unknown>>('loginview', {})?.images ?? {}) as Record<string, unknown>;

    return {
        colour: typeof images['background.colour'] === 'string' ? images['background.colour'] : DEFAULT_COLOUR,
        backgroundUrl: interpolate(images.background),
        sunUrl: interpolate(images.sun),
        drapeUrl: interpolate(images.drape),
        leftUrl: interpolate(images.left),
        rightUrl: interpolate(images.right),
        rightRepeatUrl: interpolate(images['right.repeat'])
    };
};

export const hasLandingArtwork = (scene: LandingSceneArtwork): boolean => !!(scene.backgroundUrl || scene.leftUrl || scene.rightUrl || scene.drapeUrl);

// Remembers the scene the server last showed so the next landing page matches
// the hotel view it leads into. Only public image URLs are stored.
export const rememberLandingScene = (scene: LandingSceneArtwork): void =>
{
    try
    {
        if (!hasLandingArtwork(scene))
        {
            window.localStorage.removeItem(CACHE_KEY);
            return;
        }

        const { backgroundUrl, leftUrl, rightUrl, drapeUrl } = scene;

        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ backgroundUrl, leftUrl, rightUrl, drapeUrl }));
    }
    catch
    {}
};

export const getRememberedLandingScene = (): LandingSceneArtwork | null =>
{
    try
    {
        const scene = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null') as Partial<LandingSceneArtwork> | null;

        if (!scene) return null;

        const text = (value: unknown) => (typeof value === 'string' ? value : '');

        return { backgroundUrl: text(scene.backgroundUrl), leftUrl: text(scene.leftUrl), rightUrl: text(scene.rightUrl), drapeUrl: text(scene.drapeUrl) };
    }
    catch
    {
        return null;
    }
};

export const sceneToBackdrop = (scene: LandingSceneArtwork, colour = HOTEL_VIEW_COLOUR): LandingBackdrop => ({
    colour,
    backgroundUrl: resolveLandingImageUrl(scene.backgroundUrl),
    sunUrl: '',
    drapeUrl: resolveLandingImageUrl(scene.drapeUrl),
    leftUrl: resolveLandingImageUrl(scene.leftUrl),
    rightUrl: resolveLandingImageUrl(scene.rightUrl),
    rightRepeatUrl: ''
});

export const getLandingBackdrop = (): LandingBackdrop =>
{
    const configured = getConfiguredLandingBackdrop();
    const remembered = getRememberedLandingScene();

    return remembered && hasLandingArtwork(remembered) ? sceneToBackdrop(remembered) : configured;
};
