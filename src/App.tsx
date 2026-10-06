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
    OctaneEventType,
    OctaneLogger,
    OctaneVersion,
    PrepareRenderer
} from '@octane/renderer';
import { FC, useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { adoptAccessToken, adoptLaunchRememberToken, beginAuthSession, claimResumeReload, endAuthSession, exchangeSsoTicketForAccessToken, fetchReconnectTicket, forgetAccessToken, forgetRememberGrant, getAccessToken, getAuthSession, GetUIVersion, HabboOwner, hasRememberGrant, isOctaneAuthEnabled, logoutSession, redeemRememberGrant, resetResumeReload, rotateRememberGrant, takeLaunchRememberToken } from './api';
import { Base } from './common';
import { LoadingView } from './components/loading/LoadingView';
import { LoginView } from './components/login/LoginView';
import { MainView } from './components/MainView';
import { ReconnectView } from './components/reconnect/ReconnectView';
import { clearRoomToolsHistory } from './components/room/widgets/room-tools/roomToolsHistoryStore';
import { ClearStoredChatHistory, getConnectionFailureAction, shouldClearLoginAfterDisconnect, useConnectionState, useDevicePixelRatio, useMessageEvent, useOctaneEvent } from './hooks';
import { clearPerkAllowances, listenForPerkAllowances } from './state/perkAllowancesStore';
import { SharedHookRegistry } from './state/useSharedHook';

OctaneVersion.UI_VERSION = GetUIVersion();

const getViewportDimensions = () => {
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.floor(viewport?.width ?? window.innerWidth));
    const height = Math.max(1, Math.floor(viewport?.height ?? window.innerHeight));

    return { width, height };
};

const syncViewportCssVars = () => {
    const { width, height } = getViewportDimensions();

    document.documentElement.style.setProperty('--octane-app-width', `${width}px`);
    document.documentElement.style.setProperty('--octane-app-height', `${height}px`);
};

// bootstrap.ts starts the socket itself when the page was opened with a hand-off ticket.
const takeEarlyCommunicationInit = (): Promise<void> | null => {
    const early = (window as any).__octaneEarlyCommunicationInit as Promise<void> | undefined;

    delete (window as any).__octaneEarlyCommunicationInit;

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

const preloadImage = (url: string): void => {
    if (!url) return;

    try {
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
    } catch {}
};

// Revokes what the server handed out for a session: the access token, its SSO
// ticket and the remember grant's token family. The grant is forgotten first.
const revokeSession = async (accessToken: string, ssoTicket: string): Promise<void> =>
{
    const rememberTokens = await forgetRememberGrant();

    if (!accessToken && !ssoTicket && !rememberTokens.length) return;

    await logoutSession({ accessToken, ssoTicket, rememberToken: rememberTokens[0] ?? '' });
};

const asStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
    if (typeof value === 'string' && value.length) return [value];

    return [];
};


export const App: FC<{}> = (props) => {
    const authEnabled = isOctaneAuthEnabled();
    const connectionState = useConnectionState();
    const devicePixelRatio = useDevicePixelRatio();
    const [isReady, setIsReady] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showLogin, setShowLogin] = useState(false);
    const [isEnteringHotel, setIsEnteringHotel] = useState(() => !!window.OctaneConfig?.['sso.ticket'] || (authEnabled && hasRememberGrant()));
    const [prepareTrigger, setPrepareTrigger] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const bumpProgress = useCallback((value: number) => {
        setLoadingProgress((prev) => (value > prev ? value : prev));
    }, []);
    const warmupPromiseRef = useRef<Promise<void>>(null);
    const rendererPromiseRef = useRef<Promise<any>>(null);
    const gameInitPromiseRef = useRef<Promise<void> | null>(null);
    const communicationInitRef = useRef<Promise<void> | null>(null);
    const bootstrapDoneRef = useRef(false);
    const lastPrepareTriggerRef = useRef<number | null>(null);
    const tickersStartedRef = useRef(false);
    const heartbeatIntervalRef = useRef<number>(null);
    const rememberRotateIntervalRef = useRef<number>(null);
    const releaseRememberLockRef = useRef<() => void>(null);
    const previousConnectionPhaseRef = useRef(connectionState.phase);
    const externalDisconnectNotifiedRef = useRef(false);

    const clearStoredCredentials = useCallback(() => {
        // Forget everything locally, then let the server revoke it (best effort).
        const accessToken = getAccessToken();
        const ssoTicket = getAuthSession().ssoTicket;

        endAuthSession();
        forgetAccessToken();
        ClearStoredChatHistory();
        clearPerkAllowances();
        clearRoomToolsHistory();
        if (authEnabled) void revokeSession(accessToken, ssoTicket);
        try {
            delete (window as any).OctaneConfig?.['sso.ticket'];
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
    }, [authEnabled]);

    const showSessionExpired = useCallback(() => {
        console.warn('[App] showSessionExpired — diagnostic shown (mid-game close)');
        clearStoredCredentials();

        if (!authEnabled && !externalDisconnectNotifiedRef.current)
        {
            externalDisconnectNotifiedRef.current = true;
            HabboWebTools.send(0, 'session_expired');
        }

        setErrorMessage(authEnabled
            ? 'Your session has expired.\nPlease log in again to enter the hotel.'
            : 'Your game session could not be resumed.\nReconnect through the hotel website.');
        setIsReady(false);
        setShowLogin(false);
        setIsEnteringHotel(false);
    }, [authEnabled, clearStoredCredentials]);

    const fallbackToLogin = useCallback(() => {
        if (!authEnabled)
        {
            showSessionExpired();
            return;
        }

        const rawLoginEnabled = GetConfiguration().getValue<unknown>('login.screen.enabled', false);
        const loginScreenEnabled = rawLoginEnabled === true || rawLoginEnabled === 'true' || rawLoginEnabled === 1;

        if (!loginScreenEnabled) {
            console.warn('[App] fallbackToLogin — login.screen.enabled=false, redirecting to home instead');
            showSessionExpired();
            return;
        }
        const showSignIn = () =>
        {
            setErrorMessage('');
            setIsReady(false);
            setShowLogin(true);
            setIsEnteringHotel(false);
        };

        // A remembered session whose ticket was replaced (the server keeps one ticket
        // per Habbo, e.g. a second tab redeemed meanwhile) resumes with a fresh one: one
        // reload per grant until it authenticates again. After that, Sign In, keeping
        // the grant.
        if (getAuthSession().source === 'remember' && hasRememberGrant())
        {
            void claimResumeReload().then((claimed) =>
            {
                if (claimed)
                {
                    window.location.reload();
                    return;
                }

                endAuthSession();
                forgetAccessToken();
                showSignIn();
            });

            return;
        }

        console.warn('[App] fallbackToLogin — surfacing login form, credentials cleared');
        clearStoredCredentials();
        showSignIn();
    }, [authEnabled, clearStoredCredentials, showSessionExpired]);

    const applySsoTicket = useCallback((ssoTicket: string) => {
        if (!ssoTicket) return;
        ClearStoredChatHistory();
        clearPerkAllowances();
        clearRoomToolsHistory();
        window.OctaneConfig['sso.ticket'] = ssoTicket;
        GetConfiguration().setValue('sso.ticket', ssoTicket);
        if (authEnabled) void exchangeSsoTicketForAccessToken(ssoTicket);
    }, [authEnabled]);

    useEffect(() => {
        const ssoTicket = window.OctaneConfig?.['sso.ticket'];

        if (authEnabled && typeof ssoTicket === 'string' && ssoTicket.length) void exchangeSsoTicketForAccessToken(ssoTicket);
    }, [authEnabled]);

    const handleAuthenticated = useCallback(
        (ssoTicket: string, owner: HabboOwner) =>
        {
            if (!ssoTicket) return;
            beginAuthSession(ssoTicket, 'credentials', owner);
            applySsoTicket(ssoTicket);
            setIsEnteringHotel(true);
            setErrorMessage('');
            setPrepareTrigger((prev) => prev + 1);
        },
        [applySsoTicket]
    );

    const tryRememberLogin = useCallback(async (): Promise<string> => {
        const generation = getAuthSession().generation;
        const redeemed = await redeemRememberGrant();

        if (!redeemed) return '';

        // Holds the remember lock until this tab has connected with its ticket.
        releaseRememberLockRef.current = redeemed.release;

        const { session } = redeemed;

        // Another session started while the request ran: it wins.
        if (getAuthSession().generation !== generation)
        {
            redeemed.release();
            return '';
        }

        beginAuthSession(session.ssoTicket, 'remember', { userId: session.userId, name: session.username });
        adoptAccessToken(session, session.ssoTicket);

        return session.ssoTicket;
    }, []);

    useEffect(() => {
        const previousPhase = previousConnectionPhaseRef.current;
        const currentPhase = connectionState.phase;
        previousConnectionPhaseRef.current = currentPhase;

        const action = getConnectionFailureAction(previousPhase, currentPhase, isReady, connectionState.disconnectReason);

        if (action === 'kicked') {
            // ReconnectView shows the reason over the hotel; only a ban forgets the stored login.
            if (shouldClearLoginAfterDisconnect(connectionState.disconnectReason)) clearStoredCredentials();
        } else if (action === 'login') {
            console.warn('[App] Connection failed before authentication completed — falling back to login');
            fallbackToLogin();
        } else if (action === 'expired') {
            showSessionExpired();
        }
    }, [connectionState.phase, connectionState.disconnectReason, clearStoredCredentials, fallbackToLogin, isReady, showSessionExpired]);

    useMessageEvent<LoadGameUrlEvent>(LoadGameUrlEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        LegacyExternalInterface.callGame('showGame', parser.url);
    });

    const startRenderer = useCallback((width: number, height: number) => {
        if (rendererPromiseRef.current) return rendererPromiseRef.current;

        const rawUseBackBuffer = window.OctaneConfig?.['renderer.useBackBuffer'];
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
                const externalTextUrls = asStringArray(GetConfiguration().getValue<unknown>('external.texts.url'));
                const marketplaceTextsUrl = new URL('configuration/marketplace-texts.json', document.baseURI).toString();
                GetConfiguration().setValue('external.texts.url', [...externalTextUrls, marketplaceTextsUrl]);
                bumpProgress(25);

                // 0 = the display's refresh rate. A cap (the old 24 default) makes
                // Pixi skip whole animation frames: on a 60 Hz display it ticks at an
                // alternating 33/50 ms, so walking judders and the 24 Hz visual
                // clock (system.fps.animation) is sampled unevenly. Animation cadence
                // is time based, so a higher tick rate does not speed anything up.
                GetTicker().maxFPS = GetConfiguration().getValue<number>('system.fps.max', 0);
                OctaneLogger.LOG_DEBUG = GetConfiguration().getValue<boolean>('system.log.debug', true);
                OctaneLogger.LOG_WARN = GetConfiguration().getValue<boolean>('system.log.warn', false);
                OctaneLogger.LOG_ERROR = GetConfiguration().getValue<boolean>('system.log.error', false);
                OctaneLogger.LOG_EVENTS = GetConfiguration().getValue<boolean>('system.log.events', false);
                OctaneLogger.LOG_PACKETS = GetConfiguration().getValue<boolean>('system.log.packets', false);

                startRenderer(width, height).catch((error) => OctaneLogger.error('[LoginScreen] Renderer warmup failed', error));

                const interpolate = (value: string) => GetConfiguration().interpolate(value);
                const assetUrls = asStringArray(GetConfiguration().getValue<unknown>('preload.assets.urls')).map(interpolate);
                // LocalizationManager downloads external.texts.url itself, all at once, below.
                // Furnidata is warmed at the exact URL the session loads it from (its boot version, if known).
                const gamedataUrls = [
                    interpolate(GetFurnitureDataUrl(true)),
                    ...['productdata.url', 'avatar.actions.url', 'avatar.figuredata.url', 'avatar.figuremap.url', 'avatar.effectmap.url']
                        .map((key) => interpolate(GetConfiguration().getValue<string>(key, '')))
                ].filter(Boolean);
                const loginImages = (GetConfiguration().getValue<Record<string, unknown>>('loginview', {})?.images as Record<string, string>) ?? {};
                const loginImageUrls = [
                    loginImages.background,
                    loginImages.sun,
                    loginImages.drape,
                    loginImages.left,
                    loginImages['right.repeat'],
                    loginImages.right
                ]
                    .filter(Boolean)
                    .map(interpolate);

                loginImageUrls.forEach(preloadImage);
                gamedataUrls.forEach((url) => preloadUrl(url));

                const warmupTasks: Promise<any>[] = [
                    GetAssetManager().downloadAssets(assetUrls),
                    GetLocalizationManager().init(),
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
    const onInitFailure = useEffectEvent(() => fallbackToLogin());

    useEffect(() => {
        const prepare = async (width: number, height: number) => {
            console.warn('[App] prepare() start', {
                hasOctaneConfig: !!window.OctaneConfig,
                ssoTicketInConfig: !!window.OctaneConfig?.['sso.ticket'],
                hasRememberLocal: hasRememberGrant()
            });

            setLoadingProgress(0);
            bumpProgress(5);

            try {
                if (!window.OctaneConfig) throw new Error('OctaneConfig is not defined!');

                let ssoTicket = window.OctaneConfig['sso.ticket'];
                if (ssoTicket) GetConfiguration().setValue('sso.ticket', ssoTicket);
                // Website hand-offs (bootstrap already took them out of the URL). A remember
                // token is used once, and only when it comes alone: next to an SSO ticket it is
                // ignored. An SSO hand-off is a new session for a Habbo this client cannot
                // verify, so a remember grant stored earlier is revoked and forgotten.
                const launchRemember = authEnabled ? takeLaunchRememberToken() : null;

                if (typeof ssoTicket === 'string' && ssoTicket && getAuthSession().ssoTicket !== ssoTicket)
                {
                    beginAuthSession(ssoTicket, 'handoff');

                    if (authEnabled)
                    {
                        const tokens = await forgetRememberGrant();

                        if (tokens.length) void Promise.all(tokens.map((rememberToken) => logoutSession({ accessToken: '', ssoTicket: '', rememberToken })));
                    }
                }
                else if (launchRemember)
                {
                    await adoptLaunchRememberToken(launchRemember.token, launchRemember.expiresAt);
                }

                bumpProgress(10);

                if (!ssoTicket || ssoTicket === '')
                {
                    if (!authEnabled)
                    {
                        onSessionExpired();
                        return;
                    }

                    let configInitError: unknown = null;
                    try {
                        await GetConfiguration().init();
                    } catch (e) {
                        configInitError = e;
                    }

                    const rawLoginEnabled = GetConfiguration().getValue<unknown>('login.screen.enabled', false);
                    const loginScreenEnabled = rawLoginEnabled === true || rawLoginEnabled === 'true' || rawLoginEnabled === 1;

                    console.warn('[App] no SSO path — login gate', {
                        configInitError: configInitError ? String((configInitError as Error)?.message ?? configInitError) : null,
                        rawLoginEnabled,
                        rawLoginEnabledType: typeof rawLoginEnabled,
                        loginScreenEnabled
                    });

                    if (configInitError) {
                        OctaneLogger.error('[LoginScreen] Failed to load renderer-config.json — cannot resolve login.screen.enabled', configInitError);
                    }

                    if (loginScreenEnabled) {
                        const rememberedSsoTicket = await tryRememberLogin();

                        if (rememberedSsoTicket) {
                            ssoTicket = rememberedSsoTicket;
                            applySsoTicket(rememberedSsoTicket);
                            setShowLogin(false);
                        } else {
                            setIsReady(false);
                            setShowLogin(true);
                            // No remembered session after all: Sign In must be usable.
                            setIsEnteringHotel(false);
                            startWarmup(width, height).catch((error) => OctaneLogger.error('[LoginScreen] Warmup failed', error));
                            return;
                        }
                    } else {
                        if (configInitError) {
                            setErrorMessage(`Unable to load renderer-config.json.\n${String((configInitError as Error)?.message ?? configInitError)}`);
                            setIsReady(false);
                            setShowLogin(false);
                            setIsEnteringHotel(false);
                            return;
                        }

                        onSessionExpired();
                        return;
                    }
                }

                // Connect and log in while the gamedata loads, as the official client does. The
                // connection holds incoming messages until MainView calls ready(), so the managers
                // below still register their handlers first.
                if (!communicationInitRef.current) {
                    listenForPerkAllowances();
                    // Without the auth API a dropped session cannot get a new ticket; it ends instead.
                    GetCommunication().setReconnectTicketProvider(authEnabled ? fetchReconnectTicket : async () => '');
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

                releaseRememberLockRef.current?.();
                releaseRememberLockRef.current = null;

                // Authenticated: a later ticket loss may resume with a reload again.
                if (getAuthSession().source === 'remember') void resetResumeReload();

                if (!bootstrapDoneRef.current) {
                    bootstrapDoneRef.current = true;
                    if (LegacyExternalInterface.available) LegacyExternalInterface.call('legacyTrack', 'authentication', 'authok', []);
                    HabboWebTools.sendHeartBeat();
                }

                if (heartbeatIntervalRef.current !== null) window.clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = window.setInterval(() => HabboWebTools.sendHeartBeat(), 10000);

                if (rememberRotateIntervalRef.current !== null) window.clearInterval(rememberRotateIntervalRef.current);

                const rotateMinutes = Math.max(1, Number(GetConfiguration().getValue<unknown>('login.remember.rotate.interval.minutes', 15)) || 15);
                if (authEnabled && hasRememberGrant())
                    rememberRotateIntervalRef.current = window.setInterval(() => void rotateRememberGrant(), rotateMinutes * 60 * 1000);

                if (!tickersStartedRef.current) {
                    tickersStartedRef.current = true;
                    GetTicker().add((ticker) => GetRoomEngine().update(ticker));
                    GetTicker().add((ticker) => renderer.render(GetStage()));
                    GetTicker().add((ticker) => GetTexturePool().run());
                }

                bumpProgress(100);
                setIsReady(true);
                setShowLogin(false);
                setIsEnteringHotel(false);
            } catch (err) {
                releaseRememberLockRef.current?.();
                releaseRememberLockRef.current = null;
                OctaneLogger.error('[App] Initialization failed — falling back to login', err);
                onInitFailure();
            }
        };

        if (lastPrepareTriggerRef.current === prepareTrigger) return;
        lastPrepareTriggerRef.current = prepareTrigger;

        const { width, height } = getViewportDimensions();

        prepare(width, height);

        return () => {
            if (heartbeatIntervalRef.current !== null) window.clearInterval(heartbeatIntervalRef.current);
            if (rememberRotateIntervalRef.current !== null) window.clearInterval(rememberRotateIntervalRef.current);
        };
    }, [authEnabled, prepareTrigger, startWarmup, startRenderer, tryRememberLogin, applySsoTicket, bumpProgress]);

    return (
        <Base fit overflow="hidden" className={`octane-app-root ${!(devicePixelRatio % 1) ? 'image-rendering-pixelated' : ''}`}>
            {!isReady && !showLogin && (
                <LoadingView
                    isError={errorMessage.length > 0}
                    message={errorMessage}
                    progress={loadingProgress}
                    backToHotelUrl={!authEnabled && errorMessage.length > 0 ? `${window.location.origin}/` : undefined}
                />
            )}
            {authEnabled && !isReady && showLogin && <LoginView onAuthenticated={handleAuthenticated} isEntering={isEnteringHotel} />}
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
