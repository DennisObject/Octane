import {
    CatalogStudioHistoryComposer,
    CatalogStudioHistoryEvent,
    CatalogStudioOpenSessionComposer,
    CatalogStudioSessionEvent,
    CatalogStudioUndoComposer,
    CatalogStudioUndoEvent
} from '@volt/renderer';
import { FC, ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { SendMessageComposer } from '../../../../api';
import { LocalizeText } from '../../../../api/utils/LocalizeText';
import { useConnectionState, useMessageEvent } from '../../../../hooks';
import { CatalogAdminUnansweredReason, createCatalogAdminRequestTracker } from '../../../../hooks/catalog/catalogAdminRequestTracker';
import { localizeCatalogAdminCode, localizeCatalogAdminPlainMessage } from '../../../../hooks/catalog/catalogAdminServerErrors.helpers';
import { applyCatalogStudioMutation, nextCatalogStudioOperationId } from '../../../../hooks/catalog/catalogStudio.helpers';
import { isNormalCatalogRow } from '../../../../hooks/catalog/catalogAdminTree.helpers';
import { CatalogStudioHistoryGroup, CatalogStudioMutationResult, CatalogStudioSession } from '../../../../hooks/catalog/catalogStudio.types';
import { CatalogStudioContext, CatalogStudioContextValue } from '../../../../hooks/catalog/useCatalogStudio';

/** How long a session or history read may stay unanswered before the request queue goes into resync. */
const READ_TIMEOUT_MS = 10_000;

export const CatalogStudioProvider: FC<{ active: boolean; children: ReactNode }> = ({ active, children }) => {
    const connectionState = useConnectionState();
    const authenticated = connectionState.authenticated;
    const [session, setSession] = useState<CatalogStudioSession | null>(null);
    const [history, setHistory] = useState<CatalogStudioHistoryGroup[]>([]);
    const [historyTotalCount, setHistoryTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    // Each reported error gets a new id, so dismissing one does not also hide the same text when it happens again.
    const [{ message: lastError, id: lastErrorId }, setLastError] = useReducer(
        (state: { message: string | null; id: number }, message: string | null) => ({ message, id: message ? state.id + 1 : state.id }),
        { message: null, id: 0 }
    );
    const sessionRef = useRef<CatalogStudioSession | null>(null);
    const historyGroupIdsRef = useRef<Set<number>>(new Set());
    const [requests] = useState(createCatalogAdminRequestTracker);
    const requestState = useSyncExternalStore(requests.subscribe, requests.getState);

    /** The server refused a session or history read with a bare CatalogAdminResult. */
    const onReadRefused = useCallback((_success: boolean, message: string) => {
        setLoading(false);
        setLastError(message ? localizeCatalogAdminPlainMessage(message) : LocalizeText('catalog.admin.error.failed'));
    }, []);

    /** A session or history read got no answer (or could not be sent): stop waiting for it. */
    const onReadUnanswered = useCallback((reason: CatalogAdminUnansweredReason) => {
        if (reason === 'reset') return;

        setLoading(false);
    }, []);

    /** The session as of now, also between an answer and the render that shows it. */
    const getSession = useCallback(() => sessionRef.current, []);

    const replaceSession = useCallback((next: CatalogStudioSession) => {
        sessionRef.current = next;
        setSession(next);
    }, []);

    /** Queues an open-session read, unless one already waits for its turn (that one brings the newest state). */
    const sendOpenSession = useCallback(() => {
        if (requests.isQueued('session')) return;

        requests.enqueue({
            kind: 'session',
            timeoutMs: READ_TIMEOUT_MS,
            send: () => {
                SendMessageComposer(new CatalogStudioOpenSessionComposer());
                return true;
            },
            onBare: onReadRefused,
            onUnanswered: onReadUnanswered
        });
    }, [onReadRefused, onReadUnanswered, requests]);

    const refresh = useCallback(() => {
        if (!active || !authenticated) return;

        setLoading(true);
        sendOpenSession();
    }, [active, authenticated, sendOpenSession]);

    const loadHistory = useCallback(
        (offset = 0, limit = 50) => {
            if (!sessionRef.current || requests.isQueued('history')) return;

            setLoading(true);
            requests.enqueue({
                kind: 'history',
                timeoutMs: READ_TIMEOUT_MS,
                send: () => {
                    const current = sessionRef.current;
                    if (!current) return false;

                    SendMessageComposer(new CatalogStudioHistoryComposer(current.draftVersionId, offset, limit));
                    return true;
                },
                onBare: onReadRefused,
                onUnanswered: onReadUnanswered
            });
        },
        [onReadRefused, onReadUnanswered, requests]
    );

    const refreshHistory = loadHistory;

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
            pages: (parser.pages ?? []).filter(isNormalCatalogRow).map((page) => ({ ...page })),
            offers: (parser.offers ?? []).filter(isNormalCatalogRow).map((offer) => ({ ...offer }))
        });
        setLoading(false);
        setLastError(null);
        // After the session is stored: the next queued request may be sent right away and read it.
        requests.takeReply('session');
    });

    // Undo is always offered (on edit and move rows); a refusal is about that row, not the whole feature.
    const handleOperation = useCallback(
        (event: CatalogStudioUndoEvent) => {
            const parser = event.getParser();
            updateRevision(parser.revision);
            setLoading(false);
            if (!parser.success) {
                // The server's sentence says which: a create/delete/reorder row, a newer change, a stale revision.
                setLastError(localizeCatalogAdminCode(parser.code, parser.message, {}));
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
        setLoading(false);
        requests.takeReply('history');
    });

    // Closing the catalog (or losing the connection) drops the session; opening it fetches a fresh one.
    const isOpen = active && authenticated;
    const [wasOpen, setWasOpen] = useState(isOpen);
    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);
        if (!isOpen) setSession(null);
        setLoading(isOpen);
    }

    // Only a real connection change resets the transport state: answers to requests sent before it never come.
    useEffect(() => {
        requests.reset();
    }, [authenticated, requests]);

    // Closing the studio only drops what was not sent yet. Requests go out while it is open on an
    // authenticated connection.
    useEffect(() => {
        requests.setCanSend(isOpen);

        if (!isOpen) {
            requests.clearQueue();
            sessionRef.current = null;
            return;
        }
        sendOpenSession();
    }, [isOpen, requests, sendOpenSession]);

    useEffect(() => () => requests.reset(), [requests]);

    const undo = useCallback((groupId: number) => {
        const current = sessionRef.current;
        if (!current) return;
        setLoading(true);
        SendMessageComposer(new CatalogStudioUndoComposer(nextCatalogStudioOperationId('undo'), current.draftVersionId, current.revision, groupId));
    }, []);

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

    const value = useMemo<CatalogStudioContextValue>(
        () => ({
            session,
            requests,
            requestState,
            getSession,
            revision: session?.revision ?? 0,
            pendingCount: session?.pendingCount ?? 0,
            history,
            historyTotalCount,
            loading,
            lastError,
            lastErrorId,
            refresh,
            loadHistory,
            undo,
            applyMutation
        }),
        [session, requests, requestState, getSession, history, historyTotalCount, loading, lastError, lastErrorId, refresh, loadHistory, undo, applyMutation]
    );

    return <CatalogStudioContext value={value}>{children}</CatalogStudioContext>;
};
