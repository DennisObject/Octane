import { createContext, useContext } from 'react';
import type { CatalogAdminRequestState, CatalogAdminRequestTracker } from './catalogAdminRequestTracker';
import { CatalogStudioHistoryGroup, CatalogStudioMutationResult, CatalogStudioSession } from './catalogStudio.types';

export interface CatalogStudioContextValue {
    session: CatalogStudioSession | null;
    /** Non-save requests go out one at a time through this queue. */
    requests: CatalogAdminRequestTracker;
    /** A request waits for its turn, or the queue is resyncing after a request timed out. */
    requestState: CatalogAdminRequestState;
    /** The session as of now, also between an answer and the render that shows it. */
    getSession: () => CatalogStudioSession | null;
    revision: number;
    pendingCount: number;
    history: CatalogStudioHistoryGroup[];
    historyTotalCount: number;
    loading: boolean;
    lastError: string | null;
    /** Increases with every reported error, so a dismissal applies to one occurrence only. */
    lastErrorId: number;
    refresh: () => void;
    loadHistory: (offset?: number, limit?: number) => void;
    undo: (groupId: number) => void;
    applyMutation: (mutation: CatalogStudioMutationResult) => void;
}

export const CatalogStudioContext = createContext<CatalogStudioContextValue>(null);
export const useCatalogStudio = () => useContext(CatalogStudioContext);
