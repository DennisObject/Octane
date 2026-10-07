import { GetConfiguration } from '@octane/renderer';
import { AccessTokenGrant } from './accessToken';

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
    | { kind: 'not-implemented' }
    | { kind: 'unreachable' };

// Both arms declare both fields so callers can read `failure` after an `ok`
// check; the project compiles without strictNullChecks, which would otherwise
// stop the boolean discriminant from narrowing.
export type AuthResult<T> = { ok: true; data: T; failure?: undefined } | { ok: false; data?: undefined; failure: AuthFailure };

const failed = (failure: AuthFailure): { ok: false; failure: AuthFailure } => ({ ok: false, failure });

export interface RememberGrant {
    rememberToken?: string;
    rememberExpiresAt?: number;
}

export interface LoginSession extends AccessTokenGrant, RememberGrant {
    ssoTicket: string;
    username: string;
    userId: number;
}

// What /refresh returns: no ticket, a rotated remember token, and (on servers
// that send it) the Habbo the grant belongs to.
export interface RememberRefresh extends AccessTokenGrant, RememberGrant {
    username: string;
    userId: number;
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

// `available` is null when the hotel has no availability endpoint (or it
// failed): the check is then skipped and /register has the final say.
export interface Availability {
    available: boolean | null;
    message: string;
}

export interface AuthRequestOptions {
    signal?: AbortSignal;
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

// Reading the body can fail (stalled past the timeout, connection lost): that
// is no answer at all (null). A body that arrived but is not a JSON object
// (an HTML error page) reads as {} so its status still counts.
const readJson = async (response: Response): Promise<JsonObject | null> =>
{
    let text: string;

    try
    {
        text = await response.text();
    }
    catch
    {
        return null;
    }

    try
    {
        const payload: unknown = JSON.parse(text);

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

// Accepts the `{ code: 'banned', banReason, banExpiresAt }` contract as well as
// the older nested `{ ban: { reason, expiresAt, permanent } }` shape.
const parseBan = (payload: JsonObject): BanDetails | null =>
{
    if (payload.code === 'banned')
    {
        const expiresAt = asNumber(payload.banExpiresAt);

        return { type: 'account', reason: asString(payload.banReason), permanent: !expiresAt, expiresAt };
    }

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

// Prefers the machine-readable `code`; the status/text checks keep servers
// without codes working.
const toFailure = (response: Response, payload: JsonObject): AuthFailure =>
{
    const message = asString(payload.error);
    const code = asString(payload.code);

    if (response.status === 429 || code === 'rate_limited') return { kind: 'rate-limited', retryAfterSeconds: parseRetryAfter(response, payload) };
    if (payload.maintenance === true || code === 'maintenance') return { kind: 'maintenance', message };

    const ban = parseBan(payload);

    if (ban) return { kind: 'banned', ban };
    if (code === 'invalid_credentials' || code === 'invalid_ticket' || code === 'invalid_remember_token' || response.status === 401) return { kind: 'invalid-credentials' };
    if (code === 'turnstile_failed' || (response.status === 403 && message === 'Security check failed.')) return { kind: 'security-check' };
    if (code === 'name_taken' || code === 'email_taken' || response.status === 409) return { kind: 'conflict', message };
    if (code === 'not_implemented' || response.status === 501) return { kind: 'not-implemented' };
    if (code === 'server_error' || response.status >= 500) return { kind: 'unreachable' };

    return { kind: 'rejected', message };
};

// Null when the request never got an answer (offline, aborted, CORS).
// No auth request may hang: one that gets no complete answer within this time
// is aborted and treated like a network failure.
const REQUEST_TIMEOUT_MS = 10000;

// Null when the request never got a complete answer (offline, timed out,
// aborted, CORS).
const send = async (url: string, init: RequestInit): Promise<{ response: Response; payload: JsonObject } | null> =>
{
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const callerSignal = init.signal;
    const forwardAbort = () => controller.abort();

    if (callerSignal?.aborted) controller.abort();
    callerSignal?.addEventListener('abort', forwardAbort);

    try
    {
        const response = await fetch(url, { credentials: 'include', ...init, signal: controller.signal });
        const payload = await readJson(response);

        return payload ? { response, payload } : null;
    }
    catch
    {
        return null;
    }
    finally
    {
        window.clearTimeout(timer);
        callerSignal?.removeEventListener('abort', forwardAbort);
    }
};

const request = async (url: string, init: RequestInit): Promise<AuthResult<JsonObject>> =>
{
    const answer = await send(url, init);

    if (!answer) return failed({ kind: 'unreachable' });

    return answer.response.ok ? { ok: true, data: answer.payload } : failed(toFailure(answer.response, answer.payload));
};

const jsonPost = (body: JsonObject, options: AuthRequestOptions): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'OctaneLoginView' },
    body: JSON.stringify(body),
    signal: options.signal
});

const postJson = (url: string, body: JsonObject, options: AuthRequestOptions = {}): Promise<AuthResult<JsonObject>> => request(url, jsonPost(body, options));

const nonEmpty = (value: unknown): string => (typeof value === 'string' && value.length ? value : '');
const positive = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

// Fields a session answer must carry. An answer that lacks one is not
// accepted: for remember-me it counts as a lost answer, so the spent token
// stays pending instead of being kept as if it were still valid.
interface SessionRequirements {
    remember: boolean;
}

const toSession = (payload: JsonObject, requirements: SessionRequirements): LoginSession | null =>
{
    const session: LoginSession = {
        ssoTicket: nonEmpty(payload.ssoTicket),
        username: nonEmpty(payload.username),
        userId: positive(payload.userId),
        accessToken: nonEmpty(payload.accessToken),
        accessTokenExpiresAt: asNumber(payload.accessTokenExpiresAt),
        rememberToken: nonEmpty(payload.rememberToken) || undefined,
        rememberExpiresAt: positive(payload.rememberExpiresAt) || undefined
    };

    if (!session.ssoTicket || !session.username || !session.userId || !session.accessToken) return null;
    if (requirements.remember && (!session.rememberToken || !session.rememberExpiresAt)) return null;

    return session;
};

const mapSession = (result: AuthResult<JsonObject>, requirements: SessionRequirements): AuthResult<LoginSession> =>
{
    if (!result.ok) return failed(result.failure);

    const session = toSession(result.data, requirements);

    return session ? { ok: true, data: session } : failed({ kind: 'unreachable' });
};

export const loginWithCredentials = async (body: LoginRequest, options: AuthRequestOptions = {}): Promise<AuthResult<LoginSession>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.endpoint', '/api/auth/login'), { ...body }, options);

    return mapSession(result, { remember: body.remember });
};

export const loginWithRememberToken = async (rememberToken: string, options: AuthRequestOptions = {}): Promise<AuthResult<LoginSession>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.remember.endpoint', '/api/auth/remember'), { rememberToken }, options);

    return mapSession(result, { remember: true });
};

// A new game ticket for the running session, e.g. after a dropped connection: the server spends
// the access token and answers with its successor, which expires when it would have.
export const renewSsoTicket = async (accessToken: string, options: AuthRequestOptions = {}): Promise<AuthResult<LoginSession>> =>
{
    const init = jsonPost({}, options);

    init.headers = { ...(init.headers as Record<string, string>), Authorization: `Bearer ${accessToken}` };

    return mapSession(await request(resolveAuthEndpoint('login.ticket.endpoint', '/api/auth/ticket'), init), { remember: false });
};

export const refreshRememberToken = async (rememberToken: string, options: AuthRequestOptions = {}): Promise<AuthResult<RememberRefresh>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.refresh.endpoint', '/api/auth/refresh'), { rememberToken }, options);

    if (!result.ok) return failed(result.failure);

    const refreshed: RememberRefresh = {
        rememberToken: nonEmpty(result.data.rememberToken),
        rememberExpiresAt: positive(result.data.rememberExpiresAt),
        accessToken: nonEmpty(result.data.accessToken),
        accessTokenExpiresAt: asNumber(result.data.accessTokenExpiresAt),
        username: nonEmpty(result.data.username),
        userId: positive(result.data.userId)
    };

    // Incomplete answers count as lost, like a missing session answer.
    if (!refreshed.rememberToken || !refreshed.rememberExpiresAt || !refreshed.accessToken || !refreshed.username || !refreshed.userId) return failed({ kind: 'unreachable' });

    return { ok: true, data: refreshed };
};

export const exchangeSsoTicket = async (ssoTicket: string, options: AuthRequestOptions = {}): Promise<AuthResult<AccessTokenGrant>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.sso-token.endpoint', '/api/auth/sso-token'), { ssoTicket }, options);

    if (!result.ok) return failed(result.failure);

    return { ok: true, data: { accessToken: asString(result.data.accessToken) || undefined, accessTokenExpiresAt: asNumber(result.data.accessTokenExpiresAt) } };
};

export const registerAccount = async (body: RegisterRequest, options: AuthRequestOptions = {}): Promise<AuthResult<{ session: LoginSession | null }>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.register.endpoint', '/api/auth/register'), { ...body }, options);

    if (!result.ok) return failed(result.failure);

    // No ticket at all: the account exists but this server hands out no
    // session, so the player signs in. A ticket with missing fields is invalid.
    if (!nonEmpty(result.data.ssoTicket)) return { ok: true, data: { session: null } };

    const session = toSession(result.data, { remember: false });

    return session ? { ok: true, data: { session } } : failed({ kind: 'unreachable' });
};

export const requestPasswordReset = async (email: string, turnstileToken?: string, options: AuthRequestOptions = {}): Promise<AuthResult<void>> =>
{
    const result = await postJson(resolveAuthEndpoint('login.forgot.endpoint', '/api/auth/forgot-password'), { email, turnstileToken }, options);

    return result.ok ? { ok: true, data: undefined } : failed(result.failure);
};

const isTrue = (value: unknown): boolean => value === true || value === 'true' || value === 1 || value === '1';
const isFalse = (value: unknown): boolean => value === false || value === 'false' || value === 0 || value === '0';
const TAKEN_FLAGS = ['exists', 'taken', 'inUse', 'in_use'];

// Reads `{ available }` as well as the older `{ exists | taken | inUse | in_use }` shapes.
const readAvailability = (payload: JsonObject): boolean | null =>
{
    if (isTrue(payload.available) || TAKEN_FLAGS.some((flag) => isFalse(payload[flag]))) return true;
    if (isFalse(payload.available) || TAKEN_FLAGS.some((flag) => isTrue(payload[flag]))) return false;

    return null;
};

// Availability checks are optional: a hotel without them (404/405/501), a
// failing one or no answer at all leaves the result unknown so sign-up can
// continue. Only "taken" (409 or a taken flag) and rate limits stop it.
const checkAvailability = async (configKey: string, path: string, body: JsonObject, options: AuthRequestOptions): Promise<AuthResult<Availability>> =>
{
    const answer = await send(resolveAuthEndpoint(configKey, path), jsonPost(body, options));

    if (!answer) return { ok: true, data: { available: null, message: '' } };

    const { response, payload } = answer;
    const message = asString(payload.error);

    if (response.status === 429) return failed(toFailure(response, payload));
    if (response.status === 409) return { ok: true, data: { available: false, message } };
    if (!response.ok) return { ok: true, data: { available: null, message: '' } };

    return { ok: true, data: { available: readAvailability(payload), message } };
};

export const checkUsernameAvailable = (username: string, options: AuthRequestOptions = {}): Promise<AuthResult<Availability>> =>
    checkAvailability('login.check-username.endpoint', '/api/auth/check-username', { username }, options);

export const checkEmailAvailable = (email: string, options: AuthRequestOptions = {}): Promise<AuthResult<Availability>> =>
    checkAvailability('login.check-email.endpoint', '/api/auth/check-email', { email }, options);

export const fetchRoomTemplates = async (options: AuthRequestOptions = {}): Promise<AuthResult<RoomTemplate[]>> =>
{
    const result = await request(resolveAuthEndpoint('login.room_templates.endpoint', '/api/auth/room-templates'), { method: 'GET', signal: options.signal });

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

// Ends the session on the server: revokes the access token (Bearer) and, for
// servers that still read them, the SSO ticket and remember token.
export const logoutSession = async (credentials: { accessToken: string; ssoTicket: string; rememberToken: string }): Promise<void> =>
{
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'OctaneLogout' };

    if (credentials.accessToken) headers.Authorization = `Bearer ${credentials.accessToken}`;

    await send(resolveAuthEndpoint('login.logout.endpoint', '/api/auth/logout'), {
        method: 'POST',
        keepalive: true,
        headers,
        body: JSON.stringify({ ssoTicket: credentials.ssoTicket, rememberToken: credentials.rememberToken })
    });
};
