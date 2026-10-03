import { GetConfiguration } from '@octane/renderer';
import { AccessTokenGrant } from './accessToken';
import { RememberGrant } from '../utils/RememberLogin';

// Typed client for the hotel's /api/auth/* endpoints. Every call resolves to an
// AuthResult instead of throwing, and failures are reduced to a small set of
// kinds so the UI shows its own generic copy rather than raw server text.

export interface BanDetails {
    type: string;
    reason: string;
    permanent: boolean;
    expiresAt?: number;
}

export type AuthFailure =
    | { kind: 'invalid-credentials' }
    | { kind: 'banned'; ban: BanDetails }
    | { kind: 'maintenance'; message: string }
    | { kind: 'rate-limited'; retryAfterSeconds: number }
    | { kind: 'security-check' }
    | { kind: 'conflict'; message: string }
    | { kind: 'rejected'; message: string }
    | { kind: 'unreachable' };

// Both arms declare both fields so callers can read `failure` after an `ok`
// check; the project compiles without strictNullChecks, which would otherwise
// stop the boolean discriminant from narrowing.
export type AuthResult<T> = { ok: true; data: T; failure?: undefined } | { ok: false; data?: undefined; failure: AuthFailure };

const failed = (failure: AuthFailure): { ok: false; failure: AuthFailure } => ({ ok: false, failure });

export interface LoginSession extends AccessTokenGrant, RememberGrant {
    ssoTicket: string;
    username: string;
}

export interface LoginRequest {
    username: string;
    password: string;
    remember: boolean;
    turnstileToken?: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    figure: string;
    gender: 'M' | 'F';
    templateId?: number;
    turnstileToken?: string;
}

export interface Availability {
    available: boolean;
    message: string;
}

export interface RoomTemplate {
    templateId: number;
    title: string;
    description: string;
    thumbnail: string;
}

export interface MaintenanceStatus {
    enabled: boolean;
    message: string;
}

type JsonObject = Record<string, unknown>;

const DEFAULT_RETRY_AFTER_SECONDS = 60;
const HEALTH_TIMEOUT_MS = 5000;

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

export const resolveAuthEndpoint = (configKey: string, fallbackPath: string): string =>
{
    const configuration = GetConfiguration();
    const raw = configuration.getValue<string>(configKey, '') || `\${api.url}${fallbackPath}`;

    return configuration.interpolate(raw) || fallbackPath;
};

const readJson = async (response: Response): Promise<JsonObject> =>
{
    try
    {
        const payload: unknown = await response.json();

        return payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as JsonObject) : {};
    }
    catch
    {
        return {};
    }
};

const parseRetryAfter = (response: Response, payload: JsonObject): number =>
{
    const header = Number(response.headers.get('Retry-After'));

    if (Number.isFinite(header) && header > 0) return Math.ceil(header);

    return asNumber(payload.retryAfter) ?? DEFAULT_RETRY_AFTER_SECONDS;
};

const parseBan = (payload: JsonObject): BanDetails | null =>
{
    const ban = payload.ban;

    if (!ban || typeof ban !== 'object') return null;

    const details = ban as JsonObject;

    return {
        type: asString(details.type) || 'account',
        reason: asString(details.reason),
        permanent: details.permanent === true,
        expiresAt: asNumber(details.expiresAt)
    };
};

const toFailure = (response: Response, payload: JsonObject): AuthFailure =>
{
    const message = asString(payload.error);

    if (response.status === 429) return { kind: 'rate-limited', retryAfterSeconds: parseRetryAfter(response, payload) };
    if (payload.maintenance === true || payload.code === 'maintenance') return { kind: 'maintenance', message };

    const ban = parseBan(payload);

    if (ban) return { kind: 'banned', ban };
    if (response.status === 401) return { kind: 'invalid-credentials' };
    if (response.status === 403 && message === 'Security check failed.') return { kind: 'security-check' };
    if (response.status === 409) return { kind: 'conflict', message };
    if (response.status >= 500) return { kind: 'unreachable' };

    return { kind: 'rejected', message };
};

const request = async (url: string, init: RequestInit): Promise<AuthResult<JsonObject>> =>
{
    try
    {
        const response = await fetch(url, { credentials: 'include', ...init });
        const payload = await readJson(response);

        return response.ok ? { ok: true, data: payload } : failed(toFailure(response, payload));
    }
    catch
    {
        return failed({ kind: 'unreachable' });
    }
};

const postJson = (url: string, body: JsonObject): Promise<AuthResult<JsonObject>> =>
    request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'OctaneLoginView' },
        body: JSON.stringify(body)
    });

const toSession = (payload: JsonObject, fallbackUsername: string): LoginSession | null =>
{
    const ssoTicket = asString(payload.ssoTicket) || asString(payload.sso);

    if (!ssoTicket) return null;

    return {
        ssoTicket,
        username: asString(payload.username) || fallbackUsername,
        accessToken: asString(payload.accessToken) || undefined,
        accessTokenExpiresAt: asNumber(payload.accessTokenExpiresAt),
        rememberToken: asString(payload.rememberToken) || undefined,
        rememberExpiresAt: asNumber(payload.rememberExpiresAt) ?? asNumber(payload.expiresAt)
    };
};

const mapSession = (result: AuthResult<JsonObject>, fallbackUsername: string): AuthResult<LoginSession> =>
{
    if (!result.ok) return failed(result.failure);

    const session = toSession(result.data, fallbackUsername);

    return session ? { ok: true, data: session } : failed({ kind: 'unreachable' });
};

export const loginWithCredentials = async (body: LoginRequest): Promise<AuthResult<LoginSession>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.endpoint', '/api/auth/login'), { ...body });

    return mapSession(result, body.username);
};

export const loginWithRememberToken = async (rememberToken: string, username = ''): Promise<AuthResult<LoginSession>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.remember.endpoint', '/api/auth/remember'), { rememberToken });

    return mapSession(result, username);
};

export const refreshRememberToken = async (rememberToken: string): Promise<AuthResult<RememberGrant & AccessTokenGrant>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.refresh.endpoint', '/api/auth/refresh'), { rememberToken });

    if (!result.ok) return failed(result.failure);

    return {
        ok: true,
        data: {
            rememberToken: asString(result.data.rememberToken) || undefined,
            rememberExpiresAt: asNumber(result.data.rememberExpiresAt) ?? asNumber(result.data.expiresAt),
            accessToken: asString(result.data.accessToken) || undefined,
            accessTokenExpiresAt: asNumber(result.data.accessTokenExpiresAt)
        }
    };
};

export const exchangeSsoTicket = async (ssoTicket: string): Promise<AuthResult<AccessTokenGrant>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.sso-token.endpoint', '/api/auth/sso-token'), { ssoTicket });

    if (!result.ok) return failed(result.failure);

    return { ok: true, data: { accessToken: asString(result.data.accessToken) || undefined, accessTokenExpiresAt: asNumber(result.data.accessTokenExpiresAt) } };
};

export const registerAccount = async (body: RegisterRequest): Promise<AuthResult<{ session: LoginSession | null }>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.register.endpoint', '/api/auth/register'), { ...body });

    if (!result.ok) return failed(result.failure);

    return { ok: true, data: { session: toSession(result.data, body.username) } };
};

export const requestPasswordReset = async (email: string, turnstileToken?: string): Promise<AuthResult<void>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.forgot.endpoint', '/api/auth/forgot-password'), { email, turnstileToken });

    return result.ok ? { ok: true, data: undefined } : failed(result.failure);
};

const checkAvailability = async (configKey: string, path: string, body: JsonObject): Promise<AuthResult<Availability>> =>
{
    const result = await postJson(resolveAuthEndpoint(configKey, path), body);

    if (!result.ok) return failed(result.failure);

    return { ok: true, data: { available: result.data.available !== false, message: asString(result.data.error) } };
};

export const checkUsernameAvailable = (username: string): Promise<AuthResult<Availability>> =>
    checkAvailability('login.check-username.endpoint', '/api/auth/check-username', { username });

export const checkEmailAvailable = (email: string): Promise<AuthResult<Availability>> =>
    checkAvailability('login.check-email.endpoint', '/api/auth/check-email', { email });

export const fetchRoomTemplates = async (): Promise<AuthResult<RoomTemplate[]>> =>
{
    const result = await request(resolveAuthEndpoint('login.room_templates.endpoint', '/api/auth/room-templates'), { method: 'GET' });

    if (!result.ok) return failed(result.failure);

    const templates = Array.isArray(result.data.templates) ? (result.data.templates as JsonObject[]) : [];

    return {
        ok: true,
        data: templates
            .map((template) => ({
                templateId: asNumber(template.templateId) ?? 0,
                title: asString(template.title),
                description: asString(template.description),
                thumbnail: asString(template.thumbnail)
            }))
            .filter((template) => template.templateId > 0)
    };
};

export const fetchMaintenanceStatus = async (): Promise<MaintenanceStatus | null> =>
{
    const result = await request(resolveAuthEndpoint('login.maintenance.endpoint', '/api/maintenance'), { method: 'GET', credentials: 'omit' });

    if (!result.ok) return null;

    return { enabled: result.data.enabled === true, message: asString(result.data.message) };
};

// True when the game server answers. Without a configured health endpoint the
// server is assumed reachable and the login call itself reports problems.
export const checkServerReachable = async (): Promise<boolean> =>
{
    const url = GetConfiguration().interpolate(GetConfiguration().getValue<string>('login.health.endpoint', ''));

    if (!url) return true;

    const method = (GetConfiguration().getValue<string>('login.health.method', 'GET') || 'GET').toUpperCase();

    try
    {
        const response = await fetch(url, { method, credentials: 'omit', signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });

        return response.status !== 403 && response.status < 500;
    }
    catch
    {
        return false;
    }
};
