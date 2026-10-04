// "Remember me" has to survive a closed browser, so its rotating server token is
// the one credential kept on the device. Passwords and SSO tickets never are.
//
// localStorage holds the copy the UI reads synchronously. IndexedDB holds the
// copy that decides which token gets spent: other tabs see localStorage writes
// with a delay, IndexedDB writes as soon as they commit, and the server revokes
// the whole family when a rotated token is spent twice.
export interface RememberLoginData {
    token: string;
    expiresAt: number;
    username?: string;
}

export interface RememberGrant {
    rememberToken?: string;
    rememberExpiresAt?: number;
}

const REMEMBER_LOGIN_KEY = 'nitro.auth.remember';
const LEGACY_REMEMBER_LOGIN_KEY = 'nitro.remember.token';
const DEFAULT_REMEMBER_SECONDS = 30 * 24 * 60 * 60;
const MIRROR_DB = 'octane-auth';
const MIRROR_STORE = 'kv';
const MIRROR_KEY = 'remember';

const sanitize = (data: Partial<RememberLoginData> | null): RememberLoginData | null =>
{
    if (!data || typeof data.token !== 'string' || !data.token.length) return null;

    const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : 0;

    if (expiresAt && expiresAt * 1000 <= Date.now()) return null;

    return { token: data.token, expiresAt, username: typeof data.username === 'string' ? data.username : undefined };
};

const openMirror = (): Promise<IDBDatabase | null> => new Promise((resolve) =>
{
    try
    {
        if (typeof indexedDB === 'undefined') return resolve(null);

        const request = indexedDB.open(MIRROR_DB, 1);

        request.onupgradeneeded = () => request.result.createObjectStore(MIRROR_STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
    }
    catch
    {
        resolve(null);
    }
});

// Resolves once the write has committed. `null` records a cleared grant.
const writeMirror = async (data: RememberLoginData | null): Promise<void> =>
{
    const db = await openMirror();

    if (!db) return;

    await new Promise<void>((resolve) =>
    {
        const transaction = db.transaction(MIRROR_STORE, 'readwrite');

        transaction.objectStore(MIRROR_STORE).put({ data }, MIRROR_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
        transaction.onabort = () => resolve();
    });

    db.close();
};

// The grant every tab agrees on. Falls back to localStorage when IndexedDB is
// unavailable or has never seen a grant (one stored by an older client).
export const ReadRememberAuthority = async (): Promise<RememberLoginData | null> =>
{
    const db = await openMirror();

    if (!db) return GetRememberLogin();

    const record = await new Promise<{ data: Partial<RememberLoginData> | null } | undefined>((resolve) =>
    {
        const request = db.transaction(MIRROR_STORE, 'readonly').objectStore(MIRROR_STORE).get(MIRROR_KEY);

        request.onsuccess = () => resolve(request.result as { data: Partial<RememberLoginData> | null } | undefined);
        request.onerror = () => resolve(undefined);
    });

    db.close();

    return record ? sanitize(record.data) : GetRememberLogin();
};

export const GetRememberLogin = (): RememberLoginData | null =>
{
    try
    {
        const raw = JSON.parse(window.localStorage.getItem(REMEMBER_LOGIN_KEY) || 'null') as Partial<RememberLoginData> | null;
        const data = sanitize(raw);

        if (raw && !data) window.localStorage.removeItem(REMEMBER_LOGIN_KEY);

        return data;
    }
    catch
    {
        return null;
    }
};

// Both writers resolve once the IndexedDB copy has committed; callers inside the
// remember lock await that before releasing it.
export const SetRememberLogin = (data: RememberLoginData): Promise<void> =>
{
    if (!data.token.length) return Promise.resolve();

    const stored = { token: data.token, expiresAt: data.expiresAt, username: data.username };

    try
    {
        window.localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify(stored));
    }
    catch
    {}

    return writeMirror(stored);
};

export const ClearRememberLogin = (): Promise<void> =>
{
    try
    {
        window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
        window.localStorage.removeItem(LEGACY_REMEMBER_LOGIN_KEY);
    }
    catch
    {}

    return writeMirror(null);
};

export const StoreRememberGrant = (grant: RememberGrant, username?: string): Promise<void> =>
{
    if (!grant.rememberToken) return Promise.resolve();

    const expiresAt = grant.rememberExpiresAt && grant.rememberExpiresAt > 0 ? grant.rememberExpiresAt : Math.floor(Date.now() / 1000) + DEFAULT_REMEMBER_SECONDS;

    return SetRememberLogin({ token: grant.rememberToken, expiresAt, username });
};

// Forgets the stored grant only if it is still the token the caller used, so
// a rejection of an old token never wipes a newer one written meanwhile.
export const ClearRememberLoginIfToken = async (token: string): Promise<void> =>
{
    if ((await ReadRememberAuthority())?.token === token) await ClearRememberLogin();
};

// A grant that arrived without its owner (a website hand-off) takes the
// session's Habbo once the game server names it.
export const ClaimRememberLogin = (username: string): void =>
{
    const remembered = GetRememberLogin();

    if (remembered && !remembered.username) void SetRememberLogin({ ...remembered, username });
};
