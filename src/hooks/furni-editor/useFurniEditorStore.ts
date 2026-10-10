import {
    FurniEditorDeleteComposer,
    FurniEditorDetailResultEvent,
    FurniEditorImportTextResultEvent,
    FurniEditorInteractionsResultEvent,
    FurniEditorResultEvent,
    FurniEditorRevertFurnidataComposer,
    FurniEditorSearchResultEvent,
    FurniEditorUpdateComposer,
    FurniEditorUpdateFurnidataComposer,
    GetCommunication,
    IMessageComposer,
    VoltEvent,
    VoltEventType
} from '@volt/renderer';
import { useCallback, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent, useVoltEvent } from '../events';
import {
    DEFAULT_SEARCH_CRITERIA,
    FurniEditorDetail,
    FurniImportResult,
    FurniItem,
    FurniSearchCriteria,
    parseJsonObject,
    toCatalogRef,
    toDiagnostic,
    toFurniDetail,
    toFurniItem
} from './furniEditorData';
import type { EditField, EditForm, StructureKey } from './furniEditorForm';
import { interpretFurniEditorMessage } from './furniEditorServerMessages';
import { lineQueryFor } from './furniEditorSuggestions';
import {
    FurniDetailRequest,
    FurniEditorMutationKind,
    FurniEditorTraffic,
    FurniReplyRoute,
    FurniWireRequest,
    FurniWriteBlock,
    FurniWriteRequest
} from './furniEditorTraffic';
import type { FurniEditorText } from './furniEditorText';
import { useFurniEditorUiStore } from './furniEditorUiStore';

export type { FurniEditorMutationKind } from './furniEditorTraffic';

export interface FurniEditorNotice extends FurniEditorText {
    /** info: an expected refusal (e.g. no furnidata file on this hotel), shown as a calm status line. */
    tone: 'success' | 'error' | 'info';
}

const SUCCESS_TEXT: Record<FurniEditorMutationKind, string> = {
    update: 'furni.editor.status.saved',
    delete: 'furni.editor.status.deleted',
    furnidata: 'furni.editor.status.furnidata_saved',
    structure: 'furni.editor.status.structure_saved',
    revert: 'furni.editor.status.reverted',
    syncName: 'furni.editor.status.name_synced'
};

// The socket came back while a write was unconfirmed: saving is allowed again, its outcome stays unknown.
const WRITE_RELEASED_NOTICE: FurniEditorNotice = { tone: 'info', key: 'furni.editor.status.write_released' };

/** A server sentence as a status line: the furniEditorServerMessages table, or the text itself when unknown. */
const serverNotice = (message: string, success: boolean): FurniEditorNotice => {
    const mapped = interpretFurniEditorMessage(message, success);

    if (!mapped) return success ? { tone: 'success', key: 'furni.editor.status.saved' } : { tone: 'error', key: 'furni.editor.status.failed_generic' };

    return { ...mapped.text, tone: mapped.tone };
};

// The kind's own success line, unless the server says nothing changed.
const successNotice = (kind: FurniEditorMutationKind, message: string): FurniEditorNotice => {
    const mapped = interpretFurniEditorMessage(message, true);

    return mapped?.text.key === 'furni.editor.status.no_changes' ? { ...mapped.text, tone: 'success' } : { tone: 'success', key: SUCCESS_TEXT[kind] };
};

/** A refused update that named a field: shown on that field while it still holds the refused value. */
export interface FurniFieldError {
    itemId: number;
    field: EditField;
    text: FurniEditorText;
}

const answered = (route: FurniReplyRoute): FurniWireRequest | null => (route?.to === 'request' ? route.request : null);

/**
 * Internal shared source of the furni editor: every packet listener, the
 * data they deliver and the actions that request it. Consumers read it
 * through useFurniEditorState / useFurniEditorActions.
 *
 * The wire carries no request ids, so every request goes through
 * FurniEditorTraffic, which keeps at most one request outstanding (plus a
 * blocked write), waits for each one's own answer, and ignores replies that
 * belong to nothing.
 */
export const useFurniEditorStore = () => {
    const [items, setItems] = useState<FurniItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [criteria, setCriteria] = useState<FurniSearchCriteria>(DEFAULT_SEARCH_CRITERIA);
    const [isSearching, setIsSearching] = useState(false);
    const [interactions, setInteractions] = useState<string[]>([]);
    const [detail, setDetail] = useState<FurniEditorDetail | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [relatedItems, setRelatedItems] = useState<FurniItem[]>([]);
    const [importResult, setImportResult] = useState<FurniImportResult | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importUnavailable, setImportUnavailable] = useState(false);
    const [pendingMutation, setPendingMutation] = useState<FurniEditorMutationKind | null>(null);
    const [notice, setNotice] = useState<FurniEditorNotice | null>(null);
    // offline: the socket is resetting; stalled: the outstanding read is overdue and nothing else goes out.
    const [channel, setChannel] = useState<'ok' | 'offline' | 'stalled'>('ok');
    const [writeBlock, setWriteBlock] = useState<FurniWriteBlock | null>(null);
    const [fieldError, setFieldError] = useState<FurniFieldError | null>(null);

    const criteriaRef = useRef<FurniSearchCriteria>(DEFAULT_SEARCH_CRITERIA);
    const shownItemRef = useRef<{ id: number; itemName: string } | null>(null);
    // The write dropped at a socket reset, re-read once the new session is authenticated.
    const releasedWriteRef = useRef<FurniWriteRequest | null>(null);
    // Session-wide, never reset: the sheet compares it with the last import it applied.
    const importSequenceRef = useRef(0);

    const [traffic] = useState(
        () =>
            new FurniEditorTraffic((composer) => SendMessageComposer(composer), {
                onStateChange: (state) => setChannel(state.tag === 'offline' || state.tag === 'stalled' ? state.tag : 'ok'),
                onBlockChange: (block) => setWriteBlock(block),
                // However a write leaves the transport, saving is no longer "in progress".
                onWriteReleased: () => setPendingMutation(null)
            })
    );

    const search = useCallback(
        (next: FurniSearchCriteria) => {
            criteriaRef.current = next;
            setCriteria(next);
            setIsSearching(true);
            traffic.request({ kind: 'list', criteria: next });
        },
        [traffic]
    );

    const refreshSearch = useCallback(() => search(criteriaRef.current), [search]);

    // The rows sharing the open furni's line prefix; the sheet derives siblings
    // and duplicates from them.
    const probeRelated = useCallback(
        (classname: string) => {
            setRelatedItems([]);
            traffic.discard('probe');

            const query = lineQueryFor(classname);

            if (query) traffic.request({ kind: 'probe', criteria: { query, type: '', page: 1, sortField: 'itemName', sortDir: 'asc' } });
        },
        [traffic]
    );

    const requestDetail = useCallback(
        (request: FurniDetailRequest) => {
            traffic.request({ kind: 'detail', detail: request });
            setIsLoadingDetail(true);

            if (request.reveal) setNotice(null);
        },
        [traffic]
    );

    const openItem = useCallback((id: number) => requestDetail({ by: 'id', value: id, reveal: true, after: null }), [requestDetail]);

    const openSprite = useCallback((spriteId: number) => requestDetail({ by: 'sprite', value: spriteId, reveal: true, after: null }), [requestDetail]);

    // Re-reads the open sheet, unless the user is already on the way to another furni.
    const refreshItem = useCallback(
        (id: number, after: FurniEditorMutationKind | null = null) => {
            if (shownItemRef.current?.id !== id || traffic.isPending('detail')) return;

            requestDetail({ by: 'id', value: id, reveal: false, after });
        },
        [traffic, requestDetail]
    );

    // Reopening the window re-reads the furni still open on the sheet.
    const reloadOpenItem = useCallback(() => {
        if (shownItemRef.current) refreshItem(shownItemRef.current.id);
    }, [refreshItem]);

    const closeItem = useCallback(() => {
        traffic.discard('detail');
        traffic.discard('probe');
        setIsLoadingDetail(false);
        shownItemRef.current = null;
        setFieldError(null);
        setDetail(null);
        setRelatedItems([]);
        setImportResult(null);
    }, [traffic]);

    const loadInteractions = useCallback(() => {
        traffic.request({ kind: 'interactions' });
    }, [traffic]);

    const clearNotice = useCallback(() => setNotice(null), []);

    const mutate = useCallback(
        (kind: FurniEditorMutationKind, itemId: number, composer: IMessageComposer<unknown[]>): boolean => {
            if (!traffic.request({ kind: 'write', write: { kind, itemId, composer } })) return false;

            setFieldError(null);

            setPendingMutation(kind);
            setNotice(null);

            return true;
        },
        [traffic]
    );

    const updateItem = useCallback(
        (id: number, changes: Partial<EditForm>) => mutate('update', id, new FurniEditorUpdateComposer(id, JSON.stringify(changes))),
        [mutate]
    );

    const deleteItem = useCallback((id: number) => mutate('delete', id, new FurniEditorDeleteComposer(id)), [mutate]);

    const updateFurnidata = useCallback(
        (id: number, name: string, description: string) =>
            mutate('furnidata', id, new FurniEditorUpdateFurnidataComposer(id, JSON.stringify({ name, description }))),
        [mutate]
    );

    // Push items_base structural values into the furnidata entry. The server refuses to create one this way.
    const updateFurnidataStructure = useCallback(
        (id: number, structure: Partial<Record<StructureKey, number | boolean>>) =>
            mutate('structure', id, new FurniEditorUpdateFurnidataComposer(id, JSON.stringify({ structure }))),
        [mutate]
    );

    const revertFurnidata = useCallback((id: number) => mutate('revert', id, new FurniEditorRevertFurnidataComposer(id)), [mutate]);

    // Fill an empty items_base.public_name from the furnidata display name; the
    // generic update accepts a partial { publicName } payload.
    const syncPublicName = useCallback(
        (id: number, name: string) => mutate('syncName', id, new FurniEditorUpdateComposer(id, JSON.stringify({ publicName: name }))),
        [mutate]
    );

    const importText = useCallback(
        (id: number) => {
            if (!traffic.request({ kind: 'import', itemId: id })) return;

            setIsImporting(true);
            setNotice(null);
        },
        [traffic]
    );

    useMessageEvent<FurniEditorSearchResultEvent>(
        FurniEditorSearchResultEvent,
        useCallback(
            (event: FurniEditorSearchResultEvent) => {
                const parser = event.getParser();
                const request = answered(traffic.reply({ type: 'search' }));

                if (!parser || (request?.kind !== 'list' && request?.kind !== 'probe')) return;

                const rows = (parser.items ?? []).map(toFurniItem);

                if (request.kind === 'probe') {
                    setRelatedItems(rows);
                    return;
                }

                setItems(rows);
                setTotal(parser.total);
                setPage(parser.page);
                setIsSearching(false);
            },
            [traffic]
        )
    );

    useMessageEvent<FurniEditorDetailResultEvent>(
        FurniEditorDetailResultEvent,
        useCallback(
            (event: FurniEditorDetailResultEvent) => {
                const parser = event.getParser();
                const reply = answered(traffic.reply({ type: 'detail', id: parser?.item?.id ?? 0, spriteId: parser?.item?.spriteId ?? 0 }));

                if (!parser?.item || reply?.kind !== 'detail') return;

                const request = reply.detail;
                const item = toFurniDetail(parser.item);

                setIsLoadingDetail(false);

                const previous = shownItemRef.current;

                shownItemRef.current = { id: item.id, itemName: item.itemName };
                setDetail({
                    item,
                    catalogItems: (parser.catalogItems ?? []).map(toCatalogRef),
                    furniDataEntry: parseJsonObject(parser.furniDataJson),
                    furniDataDiagnostic: toDiagnostic(parser.furniDataDiagnosticJson),
                    refreshedAfter: request.after
                });

                if (previous?.id !== item.id) {
                    setImportResult(null);
                    setFieldError(null);
                }
                if (previous?.id !== item.id || previous.itemName !== item.itemName) probeRelated(item.itemName);

                if (request.reveal) {
                    const ui = useFurniEditorUiStore.getState();

                    if (ui.activeTab === 'search') ui.setTab('names');
                }
            },
            [traffic, probeRelated]
        )
    );

    useMessageEvent<FurniEditorInteractionsResultEvent>(
        FurniEditorInteractionsResultEvent,
        useCallback(
            (event: FurniEditorInteractionsResultEvent) => {
                if (answered(traffic.reply({ type: 'interactions' }))?.kind !== 'interactions') return;

                setInteractions(event.getParser()?.interactions ?? []);
            },
            [traffic]
        )
    );

    useMessageEvent<FurniEditorImportTextResultEvent>(
        FurniEditorImportTextResultEvent,
        useCallback(
            (event: FurniEditorImportTextResultEvent) => {
                const parser = event.getParser();
                const request = answered(traffic.reply({ type: 'import' }));

                if (!parser || request?.kind !== 'import') return;

                const itemId = request.itemId;

                setIsImporting(false);
                setImportResult({
                    itemId,
                    found: parser.found,
                    name: parser.name ?? '',
                    description: parser.description ?? '',
                    classname: parser.classname ?? '',
                    sequence: ++importSequenceRef.current
                });
            },
            [traffic]
        )
    );

    const settleWrite = useCallback(
        (write: FurniWriteRequest, success: boolean, message: string) => {
            setPendingMutation(null);

            if (!success) {
                const mapped = interpretFurniEditorMessage(message);

                setNotice(serverNotice(message, false));

                // A refusal that names a form field is shown on that field too.
                if (write.kind === 'update' && mapped?.field) setFieldError({ itemId: write.itemId, field: mapped.field, text: mapped.text });

                return;
            }

            setNotice(successNotice(write.kind, message));

            if (write.kind === 'delete') {
                if (shownItemRef.current?.id === write.itemId) {
                    closeItem();
                    useFurniEditorUiStore.getState().setTab('search');
                }
            } else {
                refreshItem(write.itemId, write.kind);
            }

            refreshSearch();
        },
        [closeItem, refreshItem, refreshSearch]
    );

    useMessageEvent<FurniEditorResultEvent>(
        FurniEditorResultEvent,
        useCallback(
            (event: FurniEditorResultEvent) => {
                const parser = event.getParser();

                if (!parser) return;

                // FurniEditorTraffic decides the owner from the entity id: a write
                // (on the wire or blocked) or a read that failed.
                const { success, message = '', id } = parser;
                const route = traffic.reply({ type: 'result', success, id, message });

                if (route?.to === 'blocked') {
                    settleWrite(route.write, success, message);
                    return;
                }

                const request = answered(route);

                if (!request) return;

                if (request.kind === 'write') {
                    settleWrite(request.write, success, message);
                    return;
                }

                if (request.kind === 'detail') setIsLoadingDetail(false);
                if (request.kind === 'import') setIsImporting(false);
                if (request.kind === 'list') setIsSearching(false);
                if (request.kind === 'probe' || request.kind === 'interactions') return;

                if (request.kind === 'import' && interpretFurniEditorMessage(message)?.importUnconfigured) setImportUnavailable(true);

                setNotice(serverNotice(message, false));
            },
            [traffic, settleWrite]
        )
    );

    // Socket boundary: the old socket is gone (closed, or reopened but not
    // authenticated yet), so no reply of it can arrive. The wire is reset and
    // held; PlusEMU drops staff packets sent before authentication.
    useVoltEvent(
        [VoltEventType.SOCKET_CLOSED, VoltEventType.SOCKET_RECONNECTING, VoltEventType.SOCKET_RECONNECTED, VoltEventType.SOCKET_OPENED],
        useCallback(() => {
            const released = traffic.disconnect();

            if (!released) return;

            releasedWriteRef.current = released;
            setNotice(WRITE_RELEASED_NOTICE);
        }, [traffic])
    );

    // The session is authenticated again: SOCKET_REAUTHENTICATED after a
    // reconnect (sent once the connection is authenticated and flushing), or
    // the connection state turning authenticated on a fresh login. Only then
    // does the queue resume and the dropped write's furni get re-read.
    useVoltEvent(
        [VoltEventType.SOCKET_REAUTHENTICATED, VoltEventType.CONNECTION_STATE_CHANGED],
        useCallback(
            (event: VoltEvent) => {
                if (event.type === VoltEventType.CONNECTION_STATE_CHANGED && !GetCommunication().connection.connectionState.authenticated) return;
                if (!traffic.resume()) return;

                const released = releasedWriteRef.current;

                releasedWriteRef.current = null;

                if (released && released.kind !== 'delete') refreshItem(released.itemId);
            },
            [traffic, refreshItem]
        )
    );

    return {
        items,
        total,
        page,
        criteria,
        isSearching,
        interactions,
        detail,
        isLoadingDetail,
        relatedItems,
        importResult,
        isImporting,
        importUnavailable,
        pendingMutation,
        notice,
        channel,
        writeBlock,
        fieldError,
        search,
        refreshSearch,
        openItem,
        openSprite,
        reloadOpenItem,
        closeItem,
        loadInteractions,
        clearNotice,
        updateItem,
        deleteItem,
        updateFurnidata,
        updateFurnidataStructure,
        revertFurnidata,
        syncPublicName,
        importText
    };
};
