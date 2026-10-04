/**
 * Requests that the server may answer with a bare CatalogAdminResult (success + message, no id):
 * structural changes always, and reads when it refuses them. Saves are not here; they are matched
 * by the operation id of their Smart Save answer.
 */
export type CatalogAdminBareAnswerKind = 'session' | 'history' | 'pageDetails' | 'offerDetails' | 'structural';

/** Called with the bare answer's message when the server refused the read. */
export type CatalogAdminReadRefused = (message: string) => void;

export interface CatalogAdminRequestTracker {
    isWaiting: (kind: CatalogAdminBareAnswerKind) => boolean;
    /** One request per kind is tracked; starting the same kind again replaces the older one. */
    begin: (kind: CatalogAdminBareAnswerKind, onRefused?: CatalogAdminReadRefused) => void;
    /** The request got its own answer (or gave up waiting). */
    settle: (kind: CatalogAdminBareAnswerKind) => void;
    /**
     * Hands a bare answer to the oldest request still waiting, which is the one the server answered:
     * it replies in the order it received them, and a settled request has left the queue.
     */
    takeOldest: () => { kind: CatalogAdminBareAnswerKind; onRefused: CatalogAdminReadRefused | null } | null;
}

export const createCatalogAdminRequestTracker = (): CatalogAdminRequestTracker => {
    const waiting = new Map<CatalogAdminBareAnswerKind, CatalogAdminReadRefused | null>();

    return {
        isWaiting: (kind) => waiting.has(kind),
        begin: (kind, onRefused = null) => {
            waiting.delete(kind);
            waiting.set(kind, onRefused);
        },
        settle: (kind) => {
            waiting.delete(kind);
        },
        takeOldest: () => {
            const oldest = waiting.entries().next();
            if (oldest.done) return null;

            const [kind, onRefused] = oldest.value;
            waiting.delete(kind);
            return { kind, onRefused };
        }
    };
};
