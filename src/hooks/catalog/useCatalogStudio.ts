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
    /** Requests waiting for an answer that may come as a bare CatalogAdminResult. */
    requests: CatalogAdminRequestTracker;
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
