import { ClearRememberLoginIfToken, GetRememberLogin, ReadRememberAuthority, StoreRememberGrant } from '../utils/RememberLogin';
import { AuthFailure, loginWithRememberToken, LoginSession, refreshRememberToken } from './authApi';
import { getAuthSession, isSameHabbo } from './authSession';

// The server rotates the remember token on every use and revokes the whole
// family when an old one is used again. Every request that spends the token
// therefore runs one at a time: queued within this tab, and under a lock
// shared by all tabs. Inside the lock the token is read again from the copy
// every tab agrees on (IndexedDB), and the replacement is committed there
// before the lock is released.
const LOCK_NAME = 'octane-remember';
const LEASE_KEY = 'octane.remember.lease';
const LEASE_MS = 10000;
const LEASE_RENEW_MS = 2000;
const LEASE_POLL_MS = 100;
const LEASE_WAIT_MS = 15000;
const TAB_ID = Math.random().toString(36).slice(2);

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

// What runs under the lock. The signal aborts when the lock is lost, and work
// must not store anything once it has.
type ExclusiveWork<T> = (signal: AbortSignal) => Promise<T>;

const readLease = (): { owner: string; expiresAt: number } | null =>
{
    try
    {
        return JSON.parse(window.localStorage.getItem(LEASE_KEY) || 'null') as { owner: string; expiresAt: number } | null;
    }
    catch
    {
        return null;
    }
};

const writeLease = (): void => window.localStorage.setItem(LEASE_KEY, JSON.stringify({ owner: TAB_ID, expiresAt: Date.now() + LEASE_MS }));

const acquireLease = async (): Promise<boolean> =>
{
    const deadline = Date.now() + LEASE_WAIT_MS;

    while (Date.now() < deadline)
    {
        const lease = readLease();

        if (!lease || lease.expiresAt < Date.now() || lease.owner === TAB_ID)
        {
            writeLease();
            await sleep(20);

            if (readLease()?.owner === TAB_ID) return true;
        }

        await sleep(LEASE_POLL_MS);
    }

    return false;
};

// Fallback for browsers without the Web Locks API: a localStorage lease,
// renewed while the work runs and expiring on its own if the tab dies. Without
// the lease nothing is sent (null); losing it aborts the work.
const withLease = async <T>(work: ExclusiveWork<T>): Promise<T | null> =>
{
    if (!(await acquireLease())) return null;

    const controller = new AbortController();
    const renewal = window.setInterval(() =>
    {
        if (readLease()?.owner !== TAB_ID)
        {
            controller.abort();
            window.clearInterval(renewal);
            return;
        }

        writeLease();
    }, LEASE_RENEW_MS);

    try
    {
        return await work(controller.signal);
    }
    finally
    {
        window.clearInterval(renewal);

        if (readLease()?.owner === TAB_ID) window.localStorage.removeItem(LEASE_KEY);
    }
};

const withCrossTabLock = <T>(work: ExclusiveWork<T>): Promise<T | null> =>
{
    if (typeof navigator !== 'undefined' && navigator.locks?.request) return navigator.locks.request(LOCK_NAME, () => work(new AbortController().signal));

    return withLease(work);
};

let tabQueue: Promise<unknown> = Promise.resolve();

const runExclusive = <T>(work: ExclusiveWork<T>): Promise<T | null> =>
{
    const run = tabQueue.then(() => withCrossTabLock(work));

    tabQueue = run.catch(() => undefined);

    return run;
};

// Only a definite "this token is no good" forgets the grant; maintenance,
// rate limits and network trouble keep it for the next try.
const isFatalForToken = (failure: AuthFailure): boolean => failure.kind === 'invalid-credentials' || failure.kind === 'banned' || failure.kind === 'rejected';

export type RememberRedeemResult = { session: LoginSession } | { session: null; failure?: AuthFailure };

// Page start without an SSO ticket: trade the stored remember token for a
// session. Inside the lock the newest token (another tab may have rotated it)
// is the one that is spent.
export const redeemRememberGrant = async (): Promise<RememberRedeemResult> => (await runExclusive<RememberRedeemResult>(async (signal) =>
{
    const remembered = await ReadRememberAuthority();

    if (!remembered) return { session: null };

    const result = await loginWithRememberToken(remembered.token, remembered.username, { signal });

    if (signal.aborted) return { session: null };

    if (!result.ok)
    {
        if (isFatalForToken(result.failure)) await ClearRememberLoginIfToken(remembered.token);

        return { session: null, failure: result.failure };
    }

    // Cleared or replaced while the request ran (logout, another login): keep that.
    if ((await ReadRememberAuthority())?.token === remembered.token) await StoreRememberGrant(result.data, result.data.username || remembered.username);

    return { session: result.data };
})) ?? { session: null };

let rotationInFlight = false;

// Periodic rotation while playing. Skipped when another rotation is running in
// this tab, when the grant belongs to a different Habbo than this session, or
// when another tab already rotated the token planned here. The new token is
// always kept. The access token that comes with it is not used: it was not
// issued with this session's SSO ticket, and the session keeps its own.
export const rotateRememberGrant = async (): Promise<void> =>
{
    if (rotationInFlight) return;

    const planned = GetRememberLogin();
    const session = getAuthSession();

    if (!planned || !isSameHabbo(planned.username, session.owner)) return;

    rotationInFlight = true;

    try
    {
        await runExclusive(async (signal) =>
        {
            const current = await ReadRememberAuthority();

            if (!current || current.token !== planned.token) return;

            const result = await refreshRememberToken(current.token, { signal });

            if (signal.aborted) return;

            if (!result.ok)
            {
                if (isFatalForToken(result.failure)) await ClearRememberLoginIfToken(current.token);

                return;
            }

            if ((await ReadRememberAuthority())?.token === current.token) await StoreRememberGrant(result.data, current.username);
        });
    }
    finally
    {
        rotationInFlight = false;
    }
};
