import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import sirv from 'sirv';
import stripJsonComments from 'strip-json-comments';
import { isValidJsonMode } from './scripts/json-mode.mjs';

const legacyRendererRoot = resolve(import.meta.dirname, '..', 'renderer');
// Checkouts cloned before a repository rename keep their old folder name, which
// tsconfig.json also points at. Linux is case sensitive, so every earlier name
// (lowercase, and Octane from before the Volt rename) stays in the lookup chain
// or those checkouts resolve to the legacy path and the config throws.
const rendererRoot = ['Volt-Renderer', 'volt-renderer', 'Octane-Renderer', 'octane-renderer']
    .map(folder => resolve(import.meta.dirname, '..', folder))
    .find(existsSync) ?? legacyRendererRoot;

// Game assets live outside the repo, in a sibling directory next to Volt.
// They are NOT placed under public/ on purpose: with ~177k files a symlink
// under public/ makes chokidar try to install a watcher on each one and the
// dev server takes minutes to start on Windows. Serving them with a
// dedicated sirv middleware (below) bypasses chokidar entirely.
const voltFilesRoot = resolve(import.meta.dirname, '..', 'Nitro-Files');
const voltAssetsRoot = resolve(voltFilesRoot, 'nitro-assets');
const swfRoot = resolve(voltFilesRoot, 'swf');

const voltAssetsServer = () => ({
    name: 'nitro-assets-serve',
    configureServer(server)
    {
        if(existsSync(voltAssetsRoot))
        {
            server.middlewares.use('/nitro-assets', sirv(voltAssetsRoot, { dev: true, etag: true, maxAge: 0 }));
        }
        else
        {
            server.config.logger.warn(`[nitro-assets-serve] ${ voltAssetsRoot } not found — /nitro-assets/* requests will 404.`);
        }

        if(existsSync(swfRoot))
        {
            server.middlewares.use('/swf', sirv(swfRoot, { dev: true, etag: true, maxAge: 0 }));
        }
        else
        {
            server.config.logger.warn(`[nitro-assets-serve] ${ swfRoot } not found — /swf/* requests will 404.`);
        }
    },
    configurePreviewServer(server)
    {
        if(existsSync(voltAssetsRoot))
        {
            server.middlewares.use('/nitro-assets', sirv(voltAssetsRoot, { dev: false, etag: true }));
        }
        if(existsSync(swfRoot))
        {
            server.middlewares.use('/swf', sirv(swfRoot, { dev: false, etag: true }));
        }
    }
});

// The app bundle (src/index.tsx) is a dynamic import of bootstrap.ts, so the browser would only
// request it once bootstrap has run. Preload it, its chunks and its CSS from the entry HTML so it
// downloads alongside the bootstrap chunk instead.
const preloadAppBundle = () =>
{
    let base = './';

    return {
        name: 'volt-preload-app-bundle',
        apply: 'build',
        configResolved(config)
        {
            base = config.base;
        },
        transformIndexHtml: {
            order: 'post',
            handler(html, ctx)
            {
                const bundle = ctx.bundle;
                const app = bundle && Object.values(bundle).find(chunk => (chunk.type === 'chunk') && chunk.facadeModuleId?.replace(/\\/g, '/').endsWith('/src/index.tsx'));

                if(!app) return html;

                const scripts = new Set();
                const styles = new Set();
                const visit = fileName =>
                {
                    const chunk = bundle[fileName];

                    if(!chunk || (chunk.type !== 'chunk') || scripts.has(fileName)) return;

                    scripts.add(fileName);
                    chunk.viteMetadata?.importedCss?.forEach(file => styles.add(file));
                    chunk.imports.forEach(visit);
                };

                visit(app.fileName);

                const tags = [
                    ...[ ...scripts ].filter(file => !html.includes(file)).map(file => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: base + file }, injectTo: 'head' })),
                    ...[ ...styles ].map(file => ({ tag: 'link', attrs: { rel: 'preload', as: 'style', href: base + file }, injectTo: 'head' }))
                ];

                return { html, tags };
            }
        }
    };
};

// Where the dev server forwards /api/* (login, maintenance, auth). The
// emulator serves that HTTP API on its WebSocket port. Resolution order:
//   1. AUTH_PROXY_TARGET (cmd: set AUTH_PROXY_TARGET=...; PowerShell:
//      $env:AUTH_PROXY_TARGET='...'; the `VAR=value yarn start` form is
//      Unix-only),
//   2. "api.url" in public/configuration/renderer-config.json(c) — the same
//      address the client itself is configured with,
//   3. http://127.0.0.1:2096 (127.0.0.1 rather than localhost: Node may
//      resolve localhost to ::1 while the emulator listens on IPv4 only).
const readConfiguredApiUrl = () =>
{
    const configurationRoot = resolve(import.meta.dirname, 'public', 'configuration');

    for(const fileName of [ 'renderer-config.json', 'renderer-config.jsonc' ])
    {
        const filePath = resolve(configurationRoot, fileName);

        if(!existsSync(filePath)) continue;

        try
        {
            const parsed = JSON.parse(stripJsonComments(readFileSync(filePath, 'utf8'), { trailingCommas: true }));
            const apiUrl = (typeof parsed['api.url'] === 'string') ? parsed['api.url'].trim() : '';

            if(/^https?:\/\//i.test(apiUrl)) return apiUrl.replace(/\/+$/, '');
        }
        catch
        {
            // Unparseable local config: the client reports that itself.
        }
    }

    return '';
};

const authProxyTarget = process.env.AUTH_PROXY_TARGET || readConfiguredApiUrl() || 'http://127.0.0.1:2096';

if(!existsSync(rendererRoot))
{
    // Fail fast with a useful message instead of waiting for Rolldown to
    // report "Failed to resolve import @volt/renderer" deep
    // inside the bundle pass.
    throw new Error(
        '\n  Volt Renderer SDK not found.\n\n' +
        '  vite.config.mjs expects ../Volt-Renderer (or an older name: ../volt-renderer,\n' +
        '  ../Octane-Renderer, ../octane-renderer, ../renderer) next to this repo.\n\n' +
        '  Clone Volt Renderer next to Volt and rerun:\n' +
        '    git clone https://github.com/plus-emulator/Volt-Renderer ../Volt-Renderer\n' +
        '    cd ../Volt-Renderer && yarn install\n\n' +
        '  (See CLAUDE.md "Commands" section for the full setup walkthrough.)\n'
    );
}

// `pixi.js` is aliased to the renderer's own node_modules below, so the copy
// installed there must be the version the renderer pins. A stale install
// otherwise fails at runtime (or worse, renders subtly wrong) instead of here.
const readPackageVersion = (packageJsonPath) =>
{
    try
    {
        return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version ?? '';
    }
    catch
    {
        return '';
    }
};

const rendererPackage = JSON.parse(readFileSync(resolve(rendererRoot, 'package.json'), 'utf8'));
const pinnedPixiVersion = (rendererPackage.dependencies?.['pixi.js'] ?? '').replace(/^[\^~=v]+/, '');
const installedPixiVersion = readPackageVersion(resolve(rendererRoot, 'node_modules', 'pixi.js', 'package.json'));

if(pinnedPixiVersion && (installedPixiVersion !== pinnedPixiVersion))
{
    throw new Error(
        '\n  Volt Renderer node_modules are out of date.\n\n' +
        `  ${ rendererRoot }/package.json pins pixi.js ${ pinnedPixiVersion }, but ` +
        (installedPixiVersion ? `${ installedPixiVersion } is installed.` : 'it is not installed.') + '\n\n' +
        '  Run yarn install in the renderer and retry:\n' +
        `    cd ${ rendererRoot } && yarn install\n`
    );
}

const ReactCompilerConfig = {
    target: '19'
};

const resolveJsonMode = () =>
{
    // VOLT_* is the current name; NITRO_* stays as a fallback for existing setups
    const envOverride = process.env.VOLT_JSON_MODE ?? process.env.NITRO_JSON_MODE;
    if(isValidJsonMode(envOverride)) return envOverride;

    // .nitro-build.json is the legacy name kept for existing local setups
    for(const name of ['.volt-build.json', '.nitro-build.json'])
    {
        const configFile = resolve(import.meta.dirname, name);
        if(!existsSync(configFile)) continue;

        try
        {
            const parsed = JSON.parse(readFileSync(configFile, 'utf8'));
            if(isValidJsonMode(parsed?.jsonMode)) return parsed.jsonMode;
        }
        catch {}
    }

    return 'auto';
};

const voltJsonMode = resolveJsonMode();
const voltSingleBundle = (process.env.VOLT_SINGLE_BUNDLE ?? process.env.NITRO_SINGLE_BUNDLE) === '1';
process.stdout.write(`[vite] __VOLT_JSON_MODE__ = ${ voltJsonMode }\n`);
process.stdout.write(`[vite] VOLT_SINGLE_BUNDLE = ${ voltSingleBundle ? '1' : '0' }\n`);

export default defineConfig({
    base: process.env.VITE_BASE || './',
    plugins: [
        react({
            babel: {
                plugins: [
                    [ 'babel-plugin-react-compiler', ReactCompilerConfig ]
                ]
            }
        }),
        voltAssetsServer(),
        preloadAppBundle()
    ],
    define: {
        __VOLT_JSON_MODE__: JSON.stringify(voltJsonMode)
    },
    server: {
        fs: {
            allow: [
                resolve(import.meta.dirname),
                rendererRoot,
            ]
        },
        proxy: {
            // Dev-only. Every failure to reach the emulator (not running, bound
            // to another host, TLS on the port) surfaces in the browser as a
            // 502 on /api/..., so the real cause is printed here instead.
            '/api': {
                target: authProxyTarget,
                changeOrigin: true,
                // Allow an https:// target with the emulator's self-signed
                // ssl/cert.pem.
                secure: false,
                configure(proxy)
                {
                    proxy.on('error', (error, req) =>
                    {
                        const code = error?.code || error?.message || 'error';
                        const hint = (code === 'ECONNREFUSED')
                            ? 'nothing is listening there: start the emulator, or check ws.host / ws.port in its config.ini'
                            : (/EPROTO|wrong version|ssl|tls/i.test(String(error?.message)))
                                ? 'the port speaks TLS (emulator log says "SSL: true"): use an https:// target'
                                : 'see the stack above';

                        console.error(
                            `[volt] /api proxy: ${ req?.url || '' } -> ${ authProxyTarget } failed (${ code }); ${ hint }. ` +
                            'Override the target with AUTH_PROXY_TARGET or "api.url" in public/configuration/renderer-config.json.');
                    });
                }
            }
        }
    },
    resolve: {
        tsconfigPaths: true,
        alias: {
            '@': resolve(import.meta.dirname, 'src'),
            '~': resolve(import.meta.dirname, 'node_modules'),
            // Force the umbrella to the source index.ts. Without this,
            // node-module resolution (via the symlink at
            // node_modules/@volt/renderer -> ../volt-renderer)
            // can land on the stale `dist/index.js` when one exists in
            // the renderer working tree — leaving the bundle with
            // pre-snapshot-pattern stubs and producing runtime errors
            // like "TypeError: (intermediate value)() is undefined"
            // when newer code calls getUserDataSnapshot() / .subscribe()
            // / VoltEventType.SESSION_DATA_UPDATED etc.
            '@volt/renderer': resolve(rendererRoot, 'index.ts'),
            '@volt/api': resolve(rendererRoot, 'packages/api/src/index.ts'),
            '@volt/assets': resolve(rendererRoot, 'packages/assets/src/index.ts'),
            '@volt/avatar': resolve(rendererRoot, 'packages/avatar/src/index.ts'),
            '@volt/camera': resolve(rendererRoot, 'packages/camera/src/index.ts'),
            '@volt/communication': resolve(rendererRoot, 'packages/communication/src/index.ts'),
            '@volt/configuration': resolve(rendererRoot, 'packages/configuration/src/index.ts'),
            '@volt/events': resolve(rendererRoot, 'packages/events/src/index.ts'),
            '@volt/localization': resolve(rendererRoot, 'packages/localization/src/index.ts'),
            '@volt/room': resolve(rendererRoot, 'packages/room/src/index.ts'),
            '@volt/session': resolve(rendererRoot, 'packages/session/src/index.ts'),
            '@volt/sound': resolve(rendererRoot, 'packages/sound/src/index.ts'),
            '@volt/utils/src': resolve(rendererRoot, 'packages/utils/src'),
            '@volt/utils': resolve(rendererRoot, 'packages/utils/src/index.ts'),
            // Keep Pixi's exported registration entry ahead of the broad
            // package-directory alias, which would otherwise swallow this
            // subpath and resolve it to a directory that does not exist.
            'pixi.js/advanced-blend-modes': resolve(rendererRoot, 'node_modules/pixi.js/lib/advanced-blend-modes/init.mjs'),
            'pixi.js': resolve(rendererRoot, 'node_modules/pixi.js'),
            'pixi-filters': resolve(rendererRoot, 'node_modules/pixi-filters'),
            'howler': resolve(rendererRoot, 'node_modules/howler'),
        }
    },
    build: {
        assetsInlineLimit: 102400,
        chunkSizeWarningLimit: 200000,
        manifest: true,
        rollupOptions: {
            checks: {
                pluginTimings: false
            },
            output: voltSingleBundle ? {
                assetFileNames: 'src/assets/[name]-[hash].[ext]',
                entryFileNames: 'assets/app.js',
                inlineDynamicImports: true
            } : {
                assetFileNames: 'src/assets/[name]-[hash].[ext]',
                // Granular chunking: split the monolithic vendor / volt-renderer
                // bundles into smaller chunks so the browser can fetch them in
                // parallel and CF can cache each independently. Splits chosen
                // by size impact (pixi ~600KB, react ~150KB, framer-motion ~100KB,
                // jodit ~250KB lazy-loaded only by admin news, etc.).
                manualChunks: id =>
                {
                    // Vendor checks first — pixi.js/howler are aliased to
                    // ../volt-renderer/node_modules so they match
                    // `volt-renderer` too. Without this priority, they end
                    // up bundled into volt-renderer instead of getting their
                    // own chunks (pixi alone is ~600KB). Use `/pixi.js/` to
                    // avoid matching path fragments like `assets/pixi.js/`.
                    const norm = id.replace(/\\/g, '/');
                    if(norm.includes('pixi.js') || norm.includes('pixi-filters')) return 'vendor-pixi';
                    if(norm.includes('howler')) return 'vendor-audio';
                    if(norm.includes('@emoji-mart')) return 'vendor-emoji';
                    if(norm.includes('jodit') || norm.includes('@react-page')) return 'vendor-editor';

                    if(id.includes('Volt-Renderer') || id.includes(`${ rendererRoot }`))
                    {
                        // Heaviest renderer packages get their own chunks so
                        // pages that don't touch them (login flow, very early
                        // boot) don't have to pay for them upfront.
                        if(id.includes('/packages/avatar/')) return 'volt-renderer-avatar';
                        if(id.includes('/packages/communication/')) return 'volt-renderer-comm';
                        if(id.includes('/packages/room/')) return 'volt-renderer-room';
                        if(id.includes('/packages/assets/')) return 'volt-renderer-assets';
                        return 'volt-renderer';
                    }

                    if(id.includes('node_modules'))
                    {
                        if(id.includes('@volt/renderer') || id.includes('renderer3')) return 'volt-renderer';
                        if(id.match(/\/react(-dom)?\/|\/scheduler\//) || id.includes('react-error-boundary')) return 'vendor-react';
                        if(id.includes('framer-motion')) return 'vendor-motion';
                        if(id.includes('@tanstack')) return 'vendor-query';
                        if(id.includes('zustand')) return 'vendor-state';
                        if(id.includes('react-icons')) return 'vendor-icons';
                        if(id.includes('strip-json-comments')) return 'vendor-jsonc';
                        return 'vendor';
                    }
                }
            }
        }
    }
});
