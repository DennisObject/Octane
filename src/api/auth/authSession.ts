// Which Habbo the running client session belongs to. Every new session (and
// every logout) bumps the generation, so an answer that arrives for an older
// session can be recognised and dropped.
export type AuthSessionSource = 'credentials' | 'remember' | 'handoff' | 'none';

export interface AuthSession {
    generation: number;
    ssoTicket: string;
    owner: string;
    source: AuthSessionSource;
}

let session: AuthSession = { generation: 0, ssoTicket: '', owner: '', source: 'none' };

export const getAuthSession = (): AuthSession => session;

export const beginAuthSession = (ssoTicket: string, source: AuthSessionSource, owner = ''): AuthSession =>
{
    session = { generation: session.generation + 1, ssoTicket, owner, source };

    return session;
};

export const endAuthSession = (): void =>
{
    session = { generation: session.generation + 1, ssoTicket: '', owner: '', source: 'none' };
};

// A hand-off session learns its owner once the game server sends the user.
export const setAuthSessionOwner = (owner: string): void =>
{
    if (!session.owner) session = { ...session, owner };
};

export const isSameHabbo = (left: string, right: string): boolean => !!left && !!right && left.toLowerCase() === right.toLowerCase();
