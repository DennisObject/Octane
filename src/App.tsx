import {
    GetAssetManager,
    GetAvatarRenderManager,
    GetCommunication,
    GetConfiguration,
    GetFurnitureDataUrl,
    GetDesiredResolution,
    GetLocalizationManager,
    GetRoomEngine,
    GetRoomSessionManager,
    GetSessionDataManager,
    GetSoundManager,
    GetStage,
    GetTexturePool,
    GetTicker,
    HabboWebTools,
    LegacyExternalInterface,
    LoadGameUrlEvent,
    VoltEventType,
    VoltLogger,
    VoltVersion,
    PrepareRenderer
} from '@volt/renderer';
import { FC, useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { GetUIVersion } from './api';
import { loadMarketplaceTexts } from './api/catalog/loadMarketplaceTexts';
import { Base } from './common';
import { LoadingView } from './components/loading/LoadingView';
import { MainView } from './components/MainView';
import { ReconnectView } from './components/reconnect/ReconnectView';
import { clearRoomToolsHistory } from './components/room/widgets/room-tools/roomToolsHistoryStore';
import { ClearStoredChatHistory, getConnectionFailureAction, shouldClearLoginAfterDisconnect, useConnectionState, useDevicePixelRatio, useMessageEvent, useVoltEvent } from './hooks';
import { clearPerkAllowances, listenForPerkAllowances } from './state/perkAllowancesStore';
import { SharedHookRegistry } from './state/useSharedHook';

VoltVersion.UI_VERSION = GetUIVersion();

const getViewportDimensions = () => {
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.floor(viewport?.width ?? window.innerWidth));
    const height = Math.max(1, Math.floor(viewport?.height ?? window.innerHeight));

    return { width, height };
};

const syncViewportCssVars = () => {
    const { width, height } = getViewportDimensions();

    document.documentElement.style.setProperty('--volt-app-width', `${width}px`);
    document.documentElement.style.setProperty('--volt-app-height', `${height}px`);
};

// bootstrap.ts starts the socket itself when the page was opened with a hand-off ticket.
const takeEarlyCommunicationInit = (): Promise<void> | null => {
    const early = (window as any).__voltEarlyCommunicationInit as Promise<void> | undefined;

    delete (window as any).__voltEarlyCommunicationInit;

    return early ?? null;
};

const preloadUrl = async (url: string): Promise<void> => {
    if (!url) return;

    // Split gamedata URLs are directories (end with '/'); fetching them as a
    // file just 404s and wastes a connection at startup. The real split loader
    // handles those — only warm up actual file URLs here.
    if (url.split('?')[0].split('#')[0].endsWith('/')) return;

    try {
        const response = await fetch(url, { cache: 'force-cache' });
        await response.arrayBuffer();
    } catch {}
};

const asStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
    if (typeof value === 'string' && value.length) return [value];

    return [];
};


export const App: FC<{}> = (props) => {
    const connectionState = useConnectionState();
    const devicePixelRatio = useDevicePixelRatio();
    const [isReady, setIsReady] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const bumpProgress = useCallback((value: number) => {
        setLoadingProgress((prev) => (value > prev ? value : prev));
    }, []);
    const warmupPromiseRef = useRef<Promise<void>>(null);
    const rendererPromiseRef = useRef<Promise<any>>(null);
    const gameInitPromiseRef = useRef<Promise<void> | null>(null);
    const communicationInitRef = useRef<Promise<void> | null>(null);
    const bootstrapDoneRef = useRef(false);
    const prepareStartedRef = useRef(false);
    const tickersStartedRef = useRef(false);
    const heartbeatIntervalRef = useRef<number>(null);
    const previousConnectionPhaseRef = useRef(connectionState.phase);
    const externalDisconnectNotifiedRef = useRef(false);

    const clearStoredCredentials = useCallback(() => {
        ClearStoredChatHistory();
        clearPerkAllowances();
        clearRoomToolsHistory();
        try {
            delete (window as any).VoltConfig?.['sso.ticket'];
        } catch {}
        try {
            GetConfiguration().setValue('sso.ticket', '');
        } catch {}
        try {
            const url = new URL(window.location.href);

            if (url.searchParams.has('sso')) {
                url.searchParams.delete('sso');
                window.history.replaceState({}, '', url.toString());
            }
        } catch {}
    }, []);

    const showSessionExpired = useCallback(() => {
        console.warn('[App] showSessionExpired — diagnostic shown (mid-game close)');
        clearStoredCredentials();

        if (!externalDisconnectNotifiedRef.current)
        {
            externalDisconnectNotifiedRef.current = true;
            HabboWebTools.send(0, 'session_expired');
        }

        setErrorMessage('Your game session could not be resumed.\nReconnect through the hotel website.');
        setIsReady(false);
    }, [clearStoredCredentials]);

    useEffect(() => {
        const previousPhase = previousConnectionPhaseRef.current;
        const currentPhase = connectionState.phase;
        previousConnectionPhaseRef.current = currentPhase;

        const action = getConnectionFailureAction(previousPhase, currentPhase, isReady, connectionState.disconnectReason);

        if (action === 'kicked') {
            // ReconnectView shows the reason over the hotel; only a ban forgets the stored login.
            if (shouldClearLoginAfterDisconnect(connectionState.disconnectReason)) clearStoredCredentials();
        } else if (action === 'login' || action === 'expired') {
            showSessionExpired();
        }
    }, [connectionState.phase, connectionState.disconnectReason, clearStoredCredentials, isReady, showSessionExpired]);

    useMessageEvent<LoadGameUrlEvent>(LoadGameUrlEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        LegacyExternalInterface.callGame('showGame', parser.url);
    });

    const startRenderer = useCallback((width: number, height: number) => {
        if (rendererPromiseRef.current) return rendererPromiseRef.current;

        const rawUseBackBuffer = window.VoltConfig?.['renderer.useBackBuffer'];
        const useBackBuffer = rawUseBackBuffer === undefined ? true : rawUseBackBuffer === true || rawUseBackBuffer === 'true';

        rendererPromiseRef.current = PrepareRenderer({
            width: Math.floor(width),
            height: Math.floor(height),
            resolution: GetDesiredResolution(),
            autoDensity: true,
            backgroundAlpha: 0,
            preference: 'webgl',
            eventMode: 'none',
            failIfMajorPerformanceCaveat: false,
            roundPixels: true,
            useBackBuffer
        });

        return rendererPromiseRef.current;
    }, []);

    const startWarmup = useCallback(
        (width: number, height: number) => {
            if (warmupPromiseRef.current) return warmupPromiseRef.current;

            warmupPromiseRef.current = (async () => {
                await GetConfiguration().init();
                bumpProgress(25);

                // 0 = the display's refresh rate. A cap (the old 24 default) makes
                // Pixi skip whole animation frames: on a 60 Hz display it ticks at an
                // alternating 33/50 ms, so walking judders and the 24 Hz visual
                // clock (system.fps.animation) is sampled unevenly. Animation cadence
                // is time based, so a higher tick rate does not speed anything up.
                GetTicker().maxFPS = GetConfiguration().getValue<number>('system.fps.max', 0);
                VoltLogger.LOG_DEBUG = GetConfiguration().getValue<boolean>('system.log.debug', true);
                VoltLogger.LOG_WARN = GetConfiguration().getValue<boolean>('system.log.warn', false);
                VoltLogger.LOG_ERROR = GetConfiguration().getValue<boolean>('system.log.error', false);
                VoltLogger.LOG_EVENTS = GetConfiguration().getValue<boolean>('system.log.events', false);
                VoltLogger.LOG_PACKETS = GetConfiguration().getValue<boolean>('system.log.packets', false);

                startRenderer(width, height).catch((error) => VoltLogger.error('[App] Renderer warmup failed', error));

                const interpolate = (value: string) => GetConfiguration().interpolate(value);
                const assetUrls = asStringArray(GetConfiguration().getValue<unknown>('preload.assets.urls')).map(interpolate);
                // LocalizationManager downloads external.texts.url itself, all at once, below.
                // Furnidata is warmed at the exact URL the session loads it from (its boot version, if known).
                const gamedataUrls = [
                    interpolate(GetFurnitureDataUrl(true)),
                    ...['productdata.url', 'avatar.actions.url', 'avatar.figuredata.url', 'avatar.figuremap.url', 'avatar.effectmap.url']
                        .map((key) => interpolate(GetConfiguration().getValue<string>(key, '')))
                ].filter(Boolean);
                gamedataUrls.forEach((url) => preloadUrl(url));

                const warmupTasks: Promise<any>[] = [
                    GetAssetManager().downloadAssets(assetUrls),
                    GetLocalizationManager().init().then(loadMarketplaceTexts),
                    GetAvatarRenderManager().init(),
                    GetSoundManager().init()
                ];
                let warmupDone = 0;
                const warmupStart = 25;
                const warmupSpan = 45;
                await Promise.all(
                    warmupTasks.map((task) =>
                        task.then((value) => {
                            warmupDone++;
                            bumpProgress(warmupStart + Math.round((warmupSpan * warmupDone) / warmupTasks.length));
                            return value;
                        })
                    )
                );
            })();

            return warmupPromiseRef.current;
        },
        [startRenderer, bumpProgress]
    );

    useEffect(() => {
        syncViewportCssVars();

        const handleViewportResize = () => syncViewportCssVars();
        const viewport = window.visualViewport;

        window.addEventListener('resize', handleViewportResize);
        viewport?.addEventListener('resize', handleViewportResize);
        viewport?.addEventListener('scroll', handleViewportResize);

        return () => {
            window.removeEventListener('resize', handleViewportResize);
            viewport?.removeEventListener('resize', handleViewportResize);
            viewport?.removeEventListener('scroll', handleViewportResize);
        };
    }, []);

    const onSessionExpired = useEffectEvent(() => showSessionExpired());

    useEffect(() => {
        const prepare = async (width: number, height: number) => {
            console.warn('[App] prepare() start', {
                hasVoltConfig: !!window.VoltConfig,
                ssoTicketInConfig: !!window.VoltConfig?.['sso.ticket']
            });

            setLoadingProgress(0);
            bumpProgress(5);

            try {
                if (!window.VoltConfig) throw new Error('VoltConfig is not defined!');

                const ssoTicket = window.VoltConfig['sso.ticket'];

                if (typeof ssoTicket !== 'string' || !ssoTicket) {
                    onSessionExpired();
                    return;
                }

                GetConfiguration().setValue('sso.ticket', ssoTicket);
                bumpProgress(10);

                // Connect and log in while the gamedata loads, as the official client does. The
                // connection holds incoming messages until MainView calls ready(), so the managers
                // below still register their handlers first.
                if (!communicationInitRef.current) {
                    listenForPerkAllowances();
                    communicationInitRef.current = takeEarlyCommunicationInit() ?? GetCommunication().init();
                    communicationInitRef.current.catch(() => {});
                }

                const renderer = await startRenderer(width, height);
                bumpProgress(20);

                await startWarmup(width, height);
                bumpProgress(70);

                if (!gameInitPromiseRef.current) {
                    gameInitPromiseRef.current = (async () => {
                        await GetSessionDataManager().init();
                        bumpProgress(78);
                        await GetRoomSessionManager().init();
                        bumpProgress(85);
                        await GetRoomEngine().init();
                        bumpProgress(92);
                        await communicationInitRef.current;
                        bumpProgress(98);
                    })();
                }

                await gameInitPromiseRef.current;

                if (!bootstrapDoneRef.current) {
                    bootstrapDoneRef.current = true;
                    if (LegacyExternalInterface.available) LegacyExternalInterface.call('legacyTrack', 'authentication', 'authok', []);
                    HabboWebTools.sendHeartBeat();
                }

                if (heartbeatIntervalRef.current !== null) window.clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = window.setInterval(() => HabboWebTools.sendHeartBeat(), 10000);

                if (!tickersStartedRef.current) {
                    tickersStartedRef.current = true;
                    GetTicker().add((ticker) => GetRoomEngine().update(ticker));
                    GetTicker().add((ticker) => renderer.render(GetStage()));
                    GetTicker().add((ticker) => GetTexturePool().run());
                }

                bumpProgress(100);
                setIsReady(true);
            } catch (err) {
                VoltLogger.error('[App] Initialization failed', err);
                onSessionExpired();
            }
        };

        if (prepareStartedRef.current) return;
        prepareStartedRef.current = true;

        const { width, height } = getViewportDimensions();

        prepare(width, height);

        return () => {
            if (heartbeatIntervalRef.current !== null) window.clearInterval(heartbeatIntervalRef.current);
        };
    }, [startWarmup, startRenderer, bumpProgress]);

    return (
        <Base fit overflow="hidden" className={`volt-app-root ${!(devicePixelRatio % 1) ? 'image-rendering-pixelated' : ''}`}>
            {!isReady && (
                <LoadingView
                    isError={errorMessage.length > 0}
                    message={errorMessage}
                    progress={loadingProgress}
                    backToHotelUrl={errorMessage.length > 0 ? `${window.location.origin}/` : undefined}
                />
            )}
            {isReady && (
                <SharedHookRegistry fallback={<LoadingView progress={100} />}>
                    <MainView />
                    <ReconnectView />
                </SharedHookRegistry>
            )}
            <Base id="draggable-windows-container" />
        </Base>
    );
};
