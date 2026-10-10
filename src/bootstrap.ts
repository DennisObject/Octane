import { GetCommunication, GetConfiguration } from '@volt/renderer';
import { captureLaunchCredentials } from './api/auth/launchCredentials';
import { derivePetConfig, DerivedPetConfig, PetDefinition } from './api/volt/PetData';
import { parseJsonDocument, UiJsonMode } from './json/JsonDocumentParser';
import { configFileUrl, getClientMode, installSecureFetch } from './secure-assets';

declare const __VOLT_JSON_MODE__: UiJsonMode | undefined;

const resolveJsonMode = (): UiJsonMode => {
    try {
        if (typeof __VOLT_JSON_MODE__ !== 'undefined' && __VOLT_JSON_MODE__) {
            if (__VOLT_JSON_MODE__ === 'legacy' || __VOLT_JSON_MODE__ === 'jsonc' || __VOLT_JSON_MODE__ === 'auto') return __VOLT_JSON_MODE__;
        }
    } catch {}

    return 'auto';
};

const ensureMobileViewport = () => {
    let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');

    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }

    viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
};

// Before any request: lift sso/remember tokens out of the URL.
const launchCredentials = captureLaunchCredentials();

ensureMobileViewport();

const setBootDebug = (message: string) => {
    try {
        (window as any).__voltBootDebug = message;
        const secureNode = document.getElementById('volt-secure-debug');

        if (secureNode) secureNode.textContent = `${secureNode.textContent}\n${message}`;
    } catch {}
};

const deployBaseUrl = (): string => {
    try {
        const loaderBase = (window as any).__voltLoaderBase;
        if (typeof loaderBase === 'string' && loaderBase.length) return new URL('..', loaderBase).toString();
    } catch {}

    try {
        const moduleUrl = (import.meta as any).url;
        if (typeof moduleUrl === 'string' && moduleUrl.length) return new URL('..', new URL('.', moduleUrl)).toString();
    } catch {}

    try {
        const base = (import.meta as any).env?.BASE_URL;
        if (typeof base === 'string' && base.length) {
            const trimmed = base.replace(/^\/+/, '').replace(/\/+$/, '');
            return trimmed ? `${window.location.origin}/${trimmed}/` : `${window.location.origin}/`;
        }
    } catch {}

    return `${window.location.origin}/`;
};

// The entry HTML can carry the boot configuration (nginx SSI includes it into the
// <script type="application/json" id="volt-boot-*"> blocks of index.html), which saves
// the round trips to fetch it. Without SSI the blocks still hold the include comment.
// A missing file makes nginx include its error page, so only a block that parses counts.
const readBootDocument = (name: string): string | null => {
    const text = document.getElementById(`volt-boot-${name}`)?.textContent?.trim();

    if (!text || text.startsWith('<!--')) return null;

    try {
        parseJsonDocument(text, resolveJsonMode(), `${name}.json`);

        return text;
    } catch {
        setBootDebug(`boot: inline ${name} unusable, fetching it`);

        return null;
    }
};

const loadClientMode = async () => {
    try {
        if ((window as any).__voltClientMode) return;

        const inline = readBootDocument('client-mode');

        if (inline) {
            (window as any).__voltClientMode = parseJsonDocument(inline, resolveJsonMode(), 'client-mode.json');
            setBootDebug('boot: client-mode inline');

            return;
        }

        const url = new URL('configuration/client-mode.json', deployBaseUrl());
        url.searchParams.set('v', Date.now().toString(36));

        const response = await fetch(url.toString());

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const mode = resolveJsonMode();

        (window as any).__voltClientMode = parseJsonDocument(text, mode, url.toString());
        setBootDebug(`boot: client-mode loaded (mode=${mode})`);
    } catch (error) {
        setBootDebug(`boot: client-mode fallback ${error?.message || error}`);
    }
};

// Boot documents are plain files; a secure-assets deploy serves its configuration encrypted instead.
const inlineConfigDocument = (name: string): string | null => (getClientMode().secureAssetsEnabled ? null : readBootDocument(name));

const loadPetConfig = async (): Promise<DerivedPetConfig | null> => {
    try {
        const url = configFileUrl('pets.json', true);
        let text = inlineConfigDocument('pets');

        if (text === null) {
            const response = await fetch(url);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            text = await response.text();
        }
        const parsed = parseJsonDocument(text, resolveJsonMode(), url) as { pets?: unknown } | unknown[];
        const list = Array.isArray(parsed) ? parsed : (parsed as { pets?: unknown })?.pets;
        const derived = derivePetConfig(list as PetDefinition[]);

        setBootDebug(derived ? 'boot: pet config loaded' : 'boot: pets.json empty, using config pet.types');

        return derived;
    } catch (error) {
        setBootDebug(`boot: pets.json fallback ${error?.message || error}`);

        return null;
    }
};

await loadClientMode();

installSecureFetch();
setBootDebug('boot: secure fetch installed');

// Download and evaluate the app bundle while the configuration loads; it only mounts once that is done.
const appModule = import('./index');
// Don't let a failed import surface as an unhandled rejection before it is awaited below.
appModule.catch(() => {});

const search = new URLSearchParams(window.location.search);
const clientMode = getClientMode();
const petConfigLoad = loadPetConfig();

(window as any).VoltSecureApiUrl = clientMode.apiBaseUrl || window.location.origin;
(window as any).VoltClientMode = clientMode;
const rendererConfigUrl = configFileUrl('renderer-config.json', true);
const uiConfigUrl = configFileUrl('ui-config.json', true);

for (const [name, url] of [['renderer-config', rendererConfigUrl], ['ui-config', uiConfigUrl]]) {
    const inline = inlineConfigDocument(name);

    if (inline !== null) GetConfiguration().preloadDocument(url, inline);
}

// The furnidata version (when the entry page carries it) lets the boot load ask for exactly that
// furnidata, which browsers and the edge then cache for good.
const furnidataVersion = (() => {
    const text = inlineConfigDocument('furnidata-version');

    if (text === null) return null;

    const version = (parseJsonDocument(text, resolveJsonMode(), 'furnidata-version.json') as { version?: unknown })?.version;

    return typeof version === 'string' && /^[0-9a-f]{8,64}$/i.test(version) ? version : null;
})();

// Gamedata versions (file name -> version) from the entry page: those files are requested by version instead
// of with a new timestamp per load (see the renderer's configuration interpolation).
const gamedataVersions = (() => {
    const text = inlineConfigDocument('gamedata-versions');

    if (text === null) return null;

    const files = (parseJsonDocument(text, resolveJsonMode(), 'gamedata-versions.json') as { files?: unknown })?.files;

    if (!files || typeof files !== 'object') return null;

    const versions = Object.fromEntries(Object.entries(files).filter(([file, version]) => file && typeof version === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(version)));

    return Object.keys(versions).length ? versions : null;
})();

(window as any).VoltConfig = {
    'config.urls': [rendererConfigUrl, uiConfigUrl],
    ...(furnidataVersion ? { 'furnidata.version': furnidataVersion } : {}),
    ...(gamedataVersions ? { 'gamedata.versions': gamedataVersions } : {}),
    'sso.ticket': launchCredentials.ssoTicket || null,
    'forward.type': search.get('room') ? 2 : -1,
    'forward.id': search.get('room') || 0,
    'friend.id': search.get('friend') || 0
};

// Legacy aliases so external scripts written against the old Nitro globals keep working
(window as any).NitroConfig = (window as any).VoltConfig;
(window as any).NitroClientMode = clientMode;
(window as any).NitroSecureApiUrl = (window as any).VoltSecureApiUrl;

setBootDebug('boot: VoltConfig assigned');

// Load renderer-config.json + ui-config.json BEFORE rendering React. Otherwise
// the first paint triggers a flood of "Missing configuration key" warnings for
// every key components read synchronously (asset.url, login.endpoint, …) until
// prepare()'s deferred init() finally lands. Doing it here makes the config
// already populated by the time index.tsx mounts <App/>.
const configurationLoad = GetConfiguration().init().then(
    () => setBootDebug('boot: configuration init done'),
    (error) => setBootDebug(`boot: configuration init failed ${error?.message || error}`)
);

const [petConfig] = await Promise.all([petConfigLoad, configurationLoad]);

// Open the connections to the asset and gamedata hosts now, so the first gamedata requests
// don't each wait for DNS + TLS once the app starts loading.
const preconnectOrigins = () => {
    const origins = new Set<string>();

    for (const key of ['asset.url', 'gamedata.url', 'image.library.url', 'images.url', 'furnidata.url', 'api.url']) {
        try {
            const value = GetConfiguration().getValue<string>(key, '');
            const origin = value ? new URL(GetConfiguration().interpolate(value), window.location.href).origin : '';

            if (origin && origin !== window.location.origin && origin.startsWith('http')) origins.add(origin);
        } catch {}
    }

    for (const origin of origins) {
        const link = document.createElement('link');

        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    }
};

preconnectOrigins();

// With a hand-off ticket, log in now: the socket opens and authenticates while the app bundle
// evaluates. The connection holds incoming messages until MainView calls ready(), and App takes
// over this init (see takeEarlyCommunicationInit) instead of starting its own.
if (launchCredentials.ssoTicket) {
    const communicationInit = GetCommunication().init();

    communicationInit.catch(() => {});
    (window as any).__voltEarlyCommunicationInit = communicationInit;
    setBootDebug('boot: socket started');
}

// pets.json loads alongside the configuration. Its keys override the config files, as the
// VoltConfig defaults do, and stay on VoltConfig for any later configuration reload.
if (petConfig) {
    Object.assign((window as any).VoltConfig, petConfig);
    GetConfiguration().parseConfiguration(petConfig, true);
}

appModule
    .then(({ mountApp }) => {
        mountApp();
        setBootDebug('boot: app mounted');
    })
    .catch((error) => {
        setBootDebug(`boot: import failed ${error?.message || error}`);
        throw error;
    });
