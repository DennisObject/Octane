import { AuthFailure, AuthResult, loginWithRememberToken, LoginSession, refreshRememberToken, RememberGrant } from './authApi';
import { getAuthSession, HabboOwner, isSameOwner } from './authSession';
import { adoptAccessToken } from './ssoTokenExchange';

// "Remember me": the one credential kept on the device, a rotating server token.
// The server replaces it on every use and revokes the whole family when a
// replaced token is spent again (after a short grace window). So every change
// to the grant goes through this module, under one Web Lock shared by all
// tabs, and every write is a compare-and-set on the version read inside that
// same lock hold. Without the Web Locks API remember-me is off (fail closed).
const STORAGE_KEY = 'nitro.auth.remember';
const LEGACY_KEY = 'nitro.remember.token';
const LOCK_NAME = 'octane-remember';
const DEFAULT_REMEMBER_SECONDS = 30 * 24 * 60 * 60;

// A token marked as being spent may be sent again only this soon after the
// first attempt, inside the server's reuse grace window; later it is dropped.
const PENDING_RETRY_MS = 25000;

interface PendingSpend {
    token: string;
    at: number;
}

interface RememberRecord {
    token: string;
    expiresAt: number;
    ownerUserId: number;
    ownerName: string;
    version: number;
    pending?: PendingSpend;
}

const now = (): number => Date.now();

const readRecord = (): RememberRecord | null =>
{
    try
    {
        const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as Partial<RememberRecord> & { username?: string } | null;

        if (!raw || typeof raw.token !== 'string' || !raw.token.length) return null;

        const pending = raw.pending && typeof raw.pending.token === 'string' && typeof raw.pending.at === 'number' ? { token: raw.pending.token, at: raw.pending.at } : undefined;

        return {
            token: raw.token,
            expiresAt: typeof raw.expiresAt === 'number' ? raw.expiresAt : 0,
            ownerUserId: typeof raw.ownerUserId === 'number' ? raw.ownerUserId : 0,
            // Grants written by earlier client versions kept the name the login response returned.
            ownerName: typeof raw.ownerName === 'string' ? raw.ownerName : typeof raw.username === 'string' ? raw.username : '',
            version: typeof raw.version === 'number' ? raw.version : 0,
            pending
        };
    }
    catch
    {
        return null;
    }
};

// False when the browser refused the write.
const writeRecord = (record: RememberRecord | null): boolean =>
{
    try
    {
        if (record) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        else
        {
            window.localStorage.removeItem(STORAGE_KEY);
            window.localStorage.removeItem(LEGACY_KEY);
        }

        return true;
    }
    catch
    {
        return false;
    }
};

const ownerOf = (record: RememberRecord): HabboOwner => ({ userId: record.ownerUserId, name: record.ownerName });

const isExpired = (record: RememberRecord): boolean => !!record.expiresAt && record.expiresAt * 1000 <= now();

export const isRememberSupported = (): boolean => typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';

// Read-only views for the UI (pre-filled name, ticked checkbox, splash state).
export const hasRememberGrant = (): boolean => isRememberSupported() && !!readRecord();

export const getRememberedName = (): string => readRecord()?.ownerName ?? '';

const withRememberLock = <T>(work: () => Promise<T>): Promise<T | null> =>
    isRememberSupported() ? navigator.locks.request(LOCK_NAME, work) : Promise.resolve(null);

// Compare-and-set inside the lock: write only while the stored version is the
// one the caller read in this hold and, when given, the client session is still
// the one the work started for. A write the browser refuses forgets the grant
// instead of pretending it was kept.
const commit = (expectedVersion: number | null, next: Omit<RememberRecord, 'version'> | null, generation?: number): boolean =>
{
    if ((readRecord()?.version ?? null) !== expectedVersion) return false;
    if (generation !== undefined && getAuthSession().generation !== generation) return false;

    if (writeRecord(next ? { ...next, version: (expectedVersion ?? 0) + 1 } : null)) return true;

    writeRecord(null);

    return false;
};

const grantFields = (grant: RememberGrant, owner: HabboOwner): Omit<RememberRecord, 'version'> => ({
    token: grant.rememberToken,
    expiresAt: grant.rememberExpiresAt && grant.rememberExpiresAt > 0 ? grant.rememberExpiresAt : Math.floor(now() / 1000) + DEFAULT_REMEMBER_SECONDS,
    ownerUserId: owner.userId,
    ownerName: owner.name
});

// Only a definite "this token is no good" forgets the grant; maintenance,
// rate limits and network trouble leave it pending for a retry.
const isFatalForToken = (failure: AuthFailure): boolean => failure.kind === 'invalid-credentials' || failure.kind === 'banned' || failure.kind === 'rejected';

interface Spend<T> {
    record: RememberRecord;
    sent: string;
    result: AuthResult<T>;
}

// Spends the stored token once. It is first marked pending; a pending mark
// left by an attempt whose answer never arrived is retried while it is young
// enough for the server's grace window, and otherwise the grant is dropped.
const spendToken = async <T>(send: (token: string) => Promise<AuthResult<T>>): Promise<Spend<T> | null> =>
{
    const stored = readRecord();

    if (!stored) return null;

    if (stored.pending)
    {
        if (now() - stored.pending.at >= PENDING_RETRY_MS)
        {
            commit(stored.version, null);
            return null;
        }

        return { record: stored, sent: stored.pending.token, result: await send(stored.pending.token) };
    }

    if (isExpired(stored))
    {
        commit(stored.version, null);
        return null;
    }

    if (!commit(stored.version, { ...stored, pending: { token: stored.token, at: now() } })) return null;

    const record = readRecord();

    return { record, sent: stored.token, result: await send(stored.token) };
};

const settleFailure = (record: RememberRecord, failure: AuthFailure): void =>
{
    if (isFatalForToken(failure)) commit(record.version, null);
};

// Login with "Remember me" stores the new grant; without it, any grant goes.
export const storeLoginGrant = async (session: LoginSession, remember: boolean): Promise<void> =>
{
    if (!isRememberSupported())
    {
        if (!remember) writeRecord(null);
        return;
    }

    await withRememberLock(async () =>
    {
        const stored = readRecord();

        commit(stored?.version ?? null, remember && session.rememberToken ? grantFields(session, { userId: session.userId, name: session.username }) : null);
    });
};

// A website hand-off that carries only a remember token (no SSO ticket). Its
// owner is unknown until the server answers /remember.
export const adoptLaunchRememberToken = async (token: string, expiresAt: number): Promise<void> =>
{
    await withRememberLock(async () =>
    {
        if (readRecord()) return;

        commit(null, { token, expiresAt: expiresAt || Math.floor(now() / 1000) + DEFAULT_REMEMBER_SECONDS, ownerUserId: 0, ownerName: '' });
    });
};

// Logout, a cleared session or a website hand-off: drop the grant and return
// the tokens it held so the server can revoke their family.
export const forgetRememberGrant = async (): Promise<string[]> =>
{
    const drop = (): string[] =>
    {
        const stored = readRecord();

        if (!stored) return [];

        writeRecord(null);

        return [stored.token, stored.pending?.token].filter((token): token is string => !!token);
    };

    if (!isRememberSupported()) return drop();

    return (await withRememberLock(async () => drop())) ?? [];
};

// The server keeps one SSO ticket per Habbo, so a second tab redeeming while
// the first still connects would replace the first tab's ticket. The lock is
// therefore held until the caller has connected with its ticket (release), at
// most this long.
const REDEEM_HOLD_MS = 30000;

export interface RedeemedSession {
    session: LoginSession;
    release: () => void;
}

const redeemInsideLock = async (generation: number): Promise<LoginSession | null> =>
{
    const spend = await spendToken((token) => loginWithRememberToken(token));

    if (!spend) return null;

    const { record, result } = spend;

    if (!result.ok)
    {
        settleFailure(record, result.failure);
        return null;
    }

    const session = result.data;
    const next = session.rememberToken ? grantFields(session, { userId: session.userId, name: session.username }) : { ...record, pending: undefined };

    commit(record.version, next, generation);

    return session;
};

// Page start without an SSO ticket: trade the grant for a session. The owner
// comes from the server's answer.
export const redeemRememberGrant = (): Promise<RedeemedSession | null> => new Promise((resolve) =>
{
    const generation = getAuthSession().generation;
    let release: () => void = () => undefined;
    const released = new Promise<void>((done) => (release = done));

    void withRememberLock(async () =>
    {
        const session = await redeemInsideLock(generation);

        resolve(session ? { session, release } : null);

        if (session) await Promise.race([released, new Promise<void>((done) => window.setTimeout(done, REDEEM_HOLD_MS))]);
    }).then(() => resolve(null), () => resolve(null));
});

// Periodic rotation while playing, only for the grant's own Habbo. The access
// token that comes back is taken only by a session that was itself started
// from this grant, is still running, and whose owner the server confirmed.
export const rotateRememberGrant = async (): Promise<void> =>
{
    const session = getAuthSession();

    await withRememberLock(async () =>
    {
        const stored = readRecord();

        if (!stored || !isSameOwner(ownerOf(stored), session.owner)) return;

        const spend = await spendToken((token) => refreshRememberToken(token));

        if (!spend) return;

        const { record, result } = spend;

        if (!result.ok)
        {
            settleFailure(record, result.failure);
            return;
        }

        const refreshed = result.data;
        const confirmedOwner = { userId: refreshed.userId, name: refreshed.username };
        const next = refreshed.rememberToken ? grantFields(refreshed, ownerOf(record)) : { ...record, pending: undefined };

        if (!commit(record.version, next, session.generation)) return;

        if (session.source === 'remember' && isSameOwner(confirmedOwner, ownerOf(record))) adoptAccessToken(refreshed, session.ssoTicket);
    });
};
