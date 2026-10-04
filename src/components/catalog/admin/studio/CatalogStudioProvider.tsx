import {
    CatalogStudioDocumentApplyComposer,
    CatalogStudioDocumentDryRunComposer,
    CatalogStudioDocumentResultEvent,
    CatalogStudioExportComposer,
    CatalogStudioHistoryComposer,
    CatalogStudioHistoryEvent,
    CatalogStudioOpenSessionComposer,
    CatalogStudioSessionEvent,
    CatalogStudioUndoComposer,
    CatalogStudioUndoEvent,
    CatalogStudioValidateComposer,
    CatalogStudioValidationEvent
} from '@octane/renderer';
import { FC, ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { SendMessageComposer } from '../../../../api';
import { GetConfigurationValue } from '../../../../api/octane/GetConfigurationValue';
import { LocalizeText } from '../../../../api/utils/LocalizeText';
import { useConnectionState, useMessageEvent } from '../../../../hooks';
import { CatalogAdminUnansweredReason, createCatalogAdminRequestTracker } from '../../../../hooks/catalog/catalogAdminRequestTracker';
import { localizeCatalogAdminCode, localizeCatalogAdminPlainMessage } from '../../../../hooks/catalog/catalogAdminServerErrors.helpers';
import { applyCatalogStudioMutation, nextCatalogStudioOperationId } from '../../../../hooks/catalog/catalogStudio.helpers';
import {
    CATALOG_STUDIO_FEATURES,
    CatalogStudioDocumentResult,
    CatalogStudioFeature,
    CatalogStudioHistoryGroup,
    CatalogStudioMutationResult,
    CatalogStudioSession,
    CatalogStudioValidationState
} from '../../../../hooks/catalog/catalogStudio.types';
import { CatalogStudioContext, CatalogStudioContextValue } from '../../../../hooks/catalog/useCatalogStudio';

/** How long a session or history read may stay unanswered before the studio offers a retry. */
const READ_TIMEOUT_MS = 10_000;

// Answer codes of a server that knows the packet but not the feature.
const UNSUPPORTED_CODES = new Set(['UNSUPPORTED', 'NOT_SUPPORTED', 'NOT_IMPLEMENTED']);

/**
 * The session packet carries no capability flags, so the health check and the SQL tools stay off
 * unless the client configuration lists them (`catalog.admin.studio.features`: "validate", "sql"),
 * and turn off again when the server answers them as unsupported (PlusEMU does).
 */
const configuredFeatures = (): ReadonlySet<CatalogStudioFeature> => {
    const configured = GetConfigurationValue<string[]>('catalog.admin.studio.features', []) ?? [];

    return new Set(CATALOG_STUDIO_FEATURES.filter((feature) => configured.includes(feature)));
};

export const CatalogStudioProvider: FC<{ active: boolean; children: ReactNode }> = ({ active, children }) => {
    const connectionState = useConnectionState();
    const authenticated = connectionState.authenticated;
    const [session, setSession] = useState<CatalogStudioSession | null>(null);
    const [history, setHistory] = useState<CatalogStudioHistoryGroup[]>([]);
    const [historyTotalCount, setHistoryTotalCount] = useState(0);
    const [validation, setValidation] = useState<CatalogStudioValidationState | null>(null);
    const [documentResult, setDocumentResult] = useState<CatalogStudioDocumentResult | null>(null);
    const [loading, setLoading] = useState(false);
    // Each reported error gets a new id, so dismissing one does not also hide the same text when it happens again.
    const [{ message: lastError, id: lastErrorId }, setLastError] = useReducer(
        (state: { message: string | null; id: number }, message: string | null) => ({ message, id: message ? state.id + 1 : state.id }),
        { message: null, id: 0 }
    );
    const sessionRef = useRef<CatalogStudioSession | null>(null);
    const historyGroupIdsRef = useRef<Set<number>>(new Set());
    const [enabledFeatures, setEnabledFeatures] = useState(configuredFeatures);
    const [requests] = useState(createCatalogAdminRequestTracker);
    // A refresh asked for while one is on its way is sent once that answer is in, so it reflects every change before it.
    const refreshAgainRef = useRef(false);
    const historyAgainRef = useRef(false);
    // A session or history read went unanswered; the manager offers a retry instead of waiting forever.
    const [unresponsive, setUnresponsive] = useState(false);

    /** The server refused a session or history read with a bare CatalogAdminResult. */
    const onReadRefused = useCallback((_success: boolean, message: string) => {
        refreshAgainRef.current = false;
        historyAgainRef.current = false;
        setLoading(false);
        setLastError(message ? localizeCatalogAdminPlainMessage(message) : LocalizeText('catalog.admin.error.failed'));
    }, []);

    /** A session or history read got no answer: release the slot instead of wedging the studio. */
    const onReadUnanswered = useCallback((reason: CatalogAdminUnansweredReason) => {
        if (reason === 'reset') return;

        refreshAgainRef.current = false;
        historyAgainRef.current = false;
        setLoading(false);
        if (reason === 'timeout') setUnresponsive(true);
    }, []);

    const readHandlers = useMemo(
        () => ({ timeoutMs: READ_TIMEOUT_MS, onBare: onReadRefused, onUnanswered: onReadUnanswered }),
        [onReadRefused, onReadUnanswered]
    );

    /** Turns a feature off when the server says it does not support it; true when that happened. */
    const disableIfUnsupported = useCallback((feature: CatalogStudioFeature, code: string) => {
        if (!UNSUPPORTED_CODES.has(code)) return false;

        setEnabledFeatures((current) => {
            const next = new Set(current);
            next.delete(feature);
            return next;
        });
        setLoading(false);
        setLastError(LocalizeText('catalog.admin.server.code.UNSUPPORTED'));
        return true;
    }, []);

    const replaceSession = useCallback((next: CatalogStudioSession) => {
        sessionRef.current = next;
        setSession(next);
    }, []);

    /** Sends one open-session request; while one is on its way, the next is sent after its answer. */
    const sendOpenSession = useCallback(() => {
        if (requests.isWaiting('session')) {
            refreshAgainRef.current = true;
            return;
        }

        requests.begin('session', readHandlers);
        SendMessageComposer(new CatalogStudioOpenSessionComposer());
    }, [readHandlers, requests]);

    const refresh = useCallback(() => {
        if (!active || !authenticated) return;

        setLoading(true);
        sendOpenSession();
    }, [active, authenticated, sendOpenSession]);

    const loadHistory = useCallback(
        (offset = 0, limit = 50) => {
            const current = sessionRef.current;
            if (!current) return;
            if (requests.isWaiting('history')) {
                historyAgainRef.current = true;
                return;
            }

            setLoading(true);
            requests.begin('history', readHandlers);
            SendMessageComposer(new CatalogStudioHistoryComposer(current.draftVersionId, offset, limit));
        },
        [readHandlers, requests]
    );

    const refreshHistory = loadHistory;

    const retry = useCallback(() => {
        setUnresponsive(false);
        refresh();
        loadHistory();
    }, [loadHistory, refresh]);

    const updateRevision = useCallback((revision: number) => {
        setSession((current) => {
            if (!current || current.revision === revision) return current;
            const next = { ...current, revision };
            sessionRef.current = next;
            return next;
        });
    }, []);

    useMessageEvent<CatalogStudioSessionEvent>(CatalogStudioSessionEvent, (event) => {
        const parser = event.getParser();
        replaceSession({
            activeVersionId: parser.activeVersionId,
            draftVersionId: parser.draftVersionId,
            revision: parser.revision,
            activeUpdatedAt: parser.activeUpdatedAt,
            draftCreatedAt: parser.draftCreatedAt,
            pendingCount: parser.pendingCount,
            actors: parser.actors.map((actor) => ({ ...actor })),
            validationCurrent: parser.validationCurrent,
            validationIssueCount: parser.validationIssueCount,
            publishedVersions: parser.publishedVersions.map((version) => ({ ...version })),
            pages: (parser.pages ?? []).map((page) => ({ ...page })),
            offers: (parser.offers ?? []).map((offer) => ({ ...offer }))
        });
        requests.takeReply('session');
        setUnresponsive(false);
        setLoading(false);
        setLastError(null);
        if (refreshAgainRef.current) {
            refreshAgainRef.current = false;
            refresh();
        }
    });

    // Undo is always offered (on edit and move rows); a refusal is about that row, not the whole feature.
    const handleOperation = useCallback(
        (event: CatalogStudioUndoEvent) => {
            const parser = event.getParser();
            updateRevision(parser.revision);
            setLoading(false);
            if (!parser.success) {
                setLastError(
                    parser.code === 'UNSUPPORTED'
                        ? LocalizeText('catalog.admin.history.undo.unsupported')
                        : localizeCatalogAdminCode(parser.code, parser.message, {})
                );
                // The catalog moved on, or the entity changed again since that row: show the current state.
                if (parser.code === 'STALE_REVISION' || parser.code === 'CONFLICT') refresh();
                return;
            }
            setLastError(null);
            refresh();
        },
        [refresh, updateRevision]
    );

    useMessageEvent<CatalogStudioUndoEvent>(CatalogStudioUndoEvent, (event) => {
        handleOperation(event);
        if (event.getParser().success || event.getParser().code === 'CONFLICT') refreshHistory();
    });

    useMessageEvent<CatalogStudioHistoryEvent>(CatalogStudioHistoryEvent, (event) => {
        const parser = event.getParser();
        updateRevision(parser.revision);
        const nextHistory = parser.groups.map((group) => ({ ...group, entries: group.entries.map((entry) => ({ ...entry })) }));
        historyGroupIdsRef.current = new Set(nextHistory.map((group) => group.id));
        setHistory(nextHistory);
        setHistoryTotalCount(parser.totalCount);
        requests.takeReply('history');
        setUnresponsive(false);
        setLoading(false);
        if (historyAgainRef.current) {
            historyAgainRef.current = false;
            loadHistory();
        }
    });

    useMessageEvent<CatalogStudioValidationEvent>(CatalogStudioValidationEvent, (event) => {
        const parser = event.getParser();
        if (disableIfUnsupported('validate', parser.code)) return;
        const next: CatalogStudioValidationState = {
            operationId: parser.operationId,
            success: parser.success,
            code: parser.code,
            message: parser.message,
            revision: parser.revision,
            current: parser.current,
            issues: parser.issues.map((issue) => ({ ...issue })),
            receivedAt: Date.now()
        };
        setValidation(next);
        updateRevision(parser.revision);
        setLoading(false);
        setLastError(parser.success ? null : parser.message || parser.code);
    });

    useMessageEvent<CatalogStudioDocumentResultEvent>(CatalogStudioDocumentResultEvent, (event) => {
        const parser = event.getParser();
        if (disableIfUnsupported('sql', parser.code)) return;
        const changes = parser.changes ?? [];
        const result: CatalogStudioDocumentResult = {
            operationId: parser.operationId,
            success: parser.success,
            code: parser.code,
            message: parser.message,
            revision: parser.revision,
            format: parser.format,
            document: parser.document,
            fingerprint: parser.fingerprint,
            changedEntities: parser.changedEntities,
            changes: changes.map((change) => ({ ...change, fields: [...change.fields] }))
        };
        setDocumentResult(result);
        setLoading(false);
        setLastError(result.success ? null : result.message || result.code);
        if (result.code === 'APPLIED' || result.code === 'ALREADY_APPLIED') {
            refresh();
            refreshHistory();
        }
    });

    // Closing the catalog (or losing the connection) drops the session; opening it fetches a fresh one.
    const isOpen = active && authenticated;
    const [wasOpen, setWasOpen] = useState(isOpen);
    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);
        if (!isOpen) setSession(null);
        setLoading(isOpen);
        setUnresponsive(false);
    }

    useEffect(() => {
        // Answers to requests from before a close or reconnect never arrive, or belong to nothing now.
        refreshAgainRef.current = false;
        historyAgainRef.current = false;
        requests.reset();

        if (!isOpen) {
            sessionRef.current = null;
            return;
        }
        sendOpenSession();
    }, [isOpen, requests, sendOpenSession]);

    useEffect(() => () => requests.reset(), [requests]);

    const validate = useCallback(() => {
        const current = sessionRef.current;
        if (!current || !enabledFeatures.has('validate')) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioValidateComposer(nextCatalogStudioOperationId('validate'), current.draftVersionId, current.revision));
    }, [enabledFeatures]);

    const undo = useCallback((groupId: number) => {
        const current = sessionRef.current;
        if (!current) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioUndoComposer(nextCatalogStudioOperationId('undo'), current.draftVersionId, current.revision, groupId));
    }, []);

    const exportDocument = useCallback(
        (format: 'SQL') => {
            const current = sessionRef.current;
            if (!current || !enabledFeatures.has('sql')) return;
            setLoading(true);
            SendMessageComposer(new CatalogStudioExportComposer(nextCatalogStudioOperationId('export'), current.draftVersionId, current.revision, format));
        },
        [enabledFeatures]
    );

    const dryRunDocument = useCallback(
        (format: 'SQL', document: string) => {
            const current = sessionRef.current;
            if (!current || !enabledFeatures.has('sql')) return;
            setLoading(true);
            SendMessageComposer(
                new CatalogStudioDocumentDryRunComposer(nextCatalogStudioOperationId('dry-run'), current.draftVersionId, current.revision, format, document)
            );
        },
        [enabledFeatures]
    );

    const applyDocument = useCallback(
        (format: 'SQL', document: string, fingerprint: string, summary: string) => {
            const current = sessionRef.current;
            if (!current || !enabledFeatures.has('sql')) return;
            setLoading(true);
            SendMessageComposer(
                new CatalogStudioDocumentApplyComposer(
                    nextCatalogStudioOperationId('apply'),
                    current.draftVersionId,
                    current.revision,
                    '',
                    format,
                    document,
                    fingerprint,
                    summary
                )
            );
        },
        [enabledFeatures]
    );

    const applyMutation = useCallback((mutation: CatalogStudioMutationResult) => {
        setSession((current) => {
            if (!current) return current;
            const next = applyCatalogStudioMutation(current, mutation);
            sessionRef.current = next;
            return next;
        });
        if (!historyGroupIdsRef.current.has(mutation.historyGroup.id)) {
            historyGroupIdsRef.current.add(mutation.historyGroup.id);
            setHistory((current) => [mutation.historyGroup, ...current].slice(0, 50));
            setHistoryTotalCount((current) => current + 1);
        }
    }, []);

    const features = useMemo(() => ({ validate: enabledFeatures.has('validate'), sql: enabledFeatures.has('sql') }), [enabledFeatures]);

    const value = useMemo<CatalogStudioContextValue>(
        () => ({
            session,
            features,
            requests,
            unresponsive,
            retry,
            revision: session?.revision ?? 0,
            pendingCount: session?.pendingCount ?? 0,
            history,
            historyTotalCount,
            validation,
            documentResult,
            loading,
            lastError,
            lastErrorId,
            refresh,
            loadHistory,
            undo,
            validate,
            exportDocument,
            dryRunDocument,
            applyDocument,
            applyMutation
        }),
        [
            session,
            features,
            requests,
            unresponsive,
            retry,
            history,
            historyTotalCount,
            validation,
            documentResult,
            loading,
            lastError,
            lastErrorId,
            refresh,
            loadHistory,
            undo,
            validate,
            exportDocument,
            dryRunDocument,
            applyDocument,
            applyMutation
        ]
    );

    return <CatalogStudioContext value={value}>{children}</CatalogStudioContext>;
};
