// Which Habbo the running client session belongs to. Every new session (and
// every logout) bumps the generation, so work that started for an older
// session can be recognised and dropped. The owner always comes from a server
// response (login, register, remember), never from game packets.
export type AuthSessionSource = 'credentials' | 'remember' | 'handoff' | 'none';

export interface HabboOwner {
    userId: number;
    name: string;
}

export interface AuthSession {
    generation: number;
    ssoTicket: string;
    owner: HabboOwner | null;
    source: AuthSessionSource;
}

let session: AuthSession = { generation: 0, ssoTicket: '', owner: null, source: 'none' };

export const getAuthSession = (): AuthSession => session;

export const beginAuthSession = (ssoTicket: string, source: AuthSessionSource, owner: HabboOwner | null = null): AuthSession =>
{
    session = { generation: session.generation + 1, ssoTicket, owner, source };

    return session;
};

export const endAuthSession = (): void =>
{
    session = { generation: session.generation + 1, ssoTicket: '', owner: null, source: 'none' };
};

// Same Habbo: by id when both sides know it, otherwise by name.
export const isSameOwner = (left: HabboOwner | null, right: HabboOwner | null): boolean =>
{
    if (!left || !right) return false;
    if (left.userId > 0 && right.userId > 0) return left.userId === right.userId;

    return !!left.name && left.name.toLowerCase() === right.name.toLowerCase();
};
