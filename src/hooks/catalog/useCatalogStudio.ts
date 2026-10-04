import { createContext, useContext } from 'react';
import type { CatalogAdminRequestTracker } from './catalogAdminRequestTracker';
import {
    CatalogStudioDocumentResult,
    CatalogStudioFeature,
    CatalogStudioHistoryGroup,
    CatalogStudioMutationResult,
    CatalogStudioSession,
    CatalogStudioValidationState
} from './catalogStudio.types';

export interface CatalogStudioContextValue {
    session: CatalogStudioSession | null;
    /** Which optional tools this hotel supports; their controls are hidden otherwise. */
    features: Readonly<Record<CatalogStudioFeature, boolean>>;
    /** Non-save requests go out one at a time through this queue. */
    requests: CatalogAdminRequestTracker;
    /** A request waits for its turn or the queue is resyncing after a timeout. */
    requestsWaiting: boolean;
    /** The session as of now, also between an answer and the render that shows it. */
    getSession: () => CatalogStudioSession | null;
    /** A session or history read went unanswered; `retry` asks again. */
    unresponsive: boolean;
    retry: () => void;
    revision: number;
    pendingCount: number;
    history: CatalogStudioHistoryGroup[];
    historyTotalCount: number;
    validation: CatalogStudioValidationState | null;
    documentResult: CatalogStudioDocumentResult | null;
    loading: boolean;
    lastError: string | null;
    /** Increases with every reported error, so a dismissal applies to one occurrence only. */
    lastErrorId: number;
    refresh: () => void;
    loadHistory: (offset?: number, limit?: number) => void;
    undo: (groupId: number) => void;
    validate: () => void;
    exportDocument: (format: 'SQL') => void;
    dryRunDocument: (format: 'SQL', document: string) => void;
    applyDocument: (format: 'SQL', document: string, fingerprint: string, summary: string) => void;
    applyMutation: (mutation: CatalogStudioMutationResult) => void;
}

export const CatalogStudioContext = createContext<CatalogStudioContextValue>(null);
export const useCatalogStudio = () => useContext(CatalogStudioContext);
