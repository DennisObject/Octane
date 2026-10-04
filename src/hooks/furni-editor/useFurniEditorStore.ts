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
    IMessageComposer
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
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
import type { EditForm, StructureKey } from './furniEditorForm';
import { lineQueryFor } from './furniEditorSuggestions';
import { FurniDetailRequest, FurniEditorMutationKind, FurniEditorTraffic, FurniWireRequest, FurniWriteRequest } from './furniEditorTraffic';
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

const TIMEOUT_NOTICE: FurniEditorNotice = { tone: 'error', key: 'furni.editor.status.timeout' };

// A write that got no answer may or may not have been applied; it is never resent.
const WRITE_UNCONFIRMED_NOTICE: FurniEditorNotice = { tone: 'error', key: 'furni.editor.status.write_unconfirmed' };

// The server answers every failure (permission, validation, not found, rate
// limit) with the generic result packet and an English message of its own.
// The messages PlusEMU (E3) uses for expected refusals get a localised line;
// anything else is shown as the server worded it.
const KNOWN_REFUSALS: Record<string, FurniEditorNotice> = {
    'furnidata source not configured': { tone: 'info', key: 'furni.editor.status.furnidata_unconfigured' },
    'no furnidata entry for this classname': { tone: 'info', key: 'furni.editor.status.furnidata_no_entry' },
    'nothing to revert': { tone: 'info', key: 'furni.editor.status.nothing_to_revert' },
    'too many requests': { tone: 'error', key: 'furni.editor.status.too_many' },
    'no permission': { tone: 'error', key: 'furni.editor.status.no_permission' }
};

// E3 names what still uses a furni ("Cannot delete: still used by 1 unopened gifts, catalog deals #5"): shown as it is.
const DELETE_REFUSAL = /^cannot delete:/i;

/**
 * E3 does not tell yet: with no ImportUrl it answers "not found", like a real
 * miss. A refusal such as "Import from Habbo is not configured" turns the
 * button off for the session.
 */
const IMPORT_UNCONFIGURED = /\bimport\b.*\bnot configured\b/i;

const failureNotice = (message: string): FurniEditorNotice => {
    const text = message.trim();
    const known = KNOWN_REFUSALS[text.toLowerCase()];

    if (known) return known;
    if (DELETE_REFUSAL.test(text)) return { tone: 'error', key: 'furni.editor.status.message', values: { message: text } };

    return message ? { tone: 'error', key: 'furni.editor.status.failed', values: { message } } : { tone: 'error', key: 'furni.editor.status.failed_generic' };
};

// E3 answers a write that changes nothing with success and "No changes".
const successNotice = (kind: FurniEditorMutationKind, message: string): FurniEditorNotice =>
    message.trim().toLowerCase() === 'no changes' ? { tone: 'success', key: 'furni.editor.status.no_changes' } : { tone: 'success', key: SUCCESS_TEXT[kind] };

/**
 * Internal shared source of the furni editor: every packet listener, the
 * data they deliver and the actions that request it. Consumers read it
 * through useFurniEditorState / useFurniEditorActions.
 *
 * The wire carries no request ids, so every request goes through
 * FurniEditorTraffic, which keeps exactly one request on the wire and hands
 * each reply to that request (or discards it while resyncing).
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
    const [isResyncing, setIsResyncing] = useState(false);

    const criteriaRef = useRef<FurniSearchCriteria>(DEFAULT_SEARCH_CRITERIA);
    const shownItemRef = useRef<{ id: number; itemName: string } | null>(null);
    // Session-wide, never reset: the sheet compares it with the last import it applied.
    const importSequenceRef = useRef(0);

    const [traffic] = useState(
        () =>
            new FurniEditorTraffic(
                (composer) => SendMessageComposer(composer),
                (state) => setIsResyncing(state.tag === 'resyncing')
            )
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
    // What a request that went unanswered leaves behind. A read that is sent
    // again keeps its loading state; the status line says the channel retries.
    const handleLost = useCallback(
        (request: FurniWireRequest, retrying: boolean) => {
            if (retrying) return;

            switch (request.kind) {
                case 'list':
                    setIsSearching(false);
                    break;
                case 'detail':
                    setIsLoadingDetail(false);
                    break;
                case 'import':
                    setIsImporting(false);
                    break;
                case 'write':
                    setPendingMutation(null);
                    setNotice(WRITE_UNCONFIRMED_NOTICE);

                    // Show what the server holds now, whether or not the write landed.
                    if (request.write.kind !== 'delete') refreshItem(request.write.itemId);

                    return;
                default:
                    return;
            }

            setNotice(TIMEOUT_NOTICE);
        },
        [refreshItem]
    );

    useEffect(() => traffic.setLostHandler(handleLost), [traffic, handleLost]);

    const reloadOpenItem = useCallback(() => {
        if (shownItemRef.current) refreshItem(shownItemRef.current.id);
    }, [refreshItem]);

    const closeItem = useCallback(() => {
        traffic.discard('detail');
        traffic.discard('probe');
        setIsLoadingDetail(false);
        shownItemRef.current = null;
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
                const request = traffic.reply({ type: 'search' });

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
                const answered = traffic.reply({ type: 'detail' });

                if (!parser?.item || answered?.kind !== 'detail') return;

                const request = answered.detail;
                const item = toFurniDetail(parser.item);

                setIsLoadingDetail(false);

                // Only one request is on the wire, so this cannot happen unless the server answers another furni.
                if ((request.by === 'id' ? item.id : item.spriteId) !== request.value) return;

                const previous = shownItemRef.current;

                shownItemRef.current = { id: item.id, itemName: item.itemName };
                setDetail({
                    item,
                    catalogItems: (parser.catalogItems ?? []).map(toCatalogRef),
                    furniDataEntry: parseJsonObject(parser.furniDataJson),
                    furniDataDiagnostic: toDiagnostic(parser.furniDataDiagnosticJson),
                    refreshedAfter: request.after
                });

                if (previous?.id !== item.id) setImportResult(null);
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
                if (traffic.reply({ type: 'interactions' })?.kind !== 'interactions') return;

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
                const request = traffic.reply({ type: 'import' });

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
                setNotice(failureNotice(message));
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

                // The generic result answers whatever is on the wire: a write, or a read that failed.
                const { success, message = '' } = parser;
                const request = traffic.reply({ type: 'result', success });

                if (!request) return;

                if (request.kind === 'write') {
                    settleWrite(request.write, success, message);
                    return;
                }

                if (request.kind === 'detail') setIsLoadingDetail(false);
                if (request.kind === 'import') setIsImporting(false);
                if (request.kind === 'list') setIsSearching(false);
                if (request.kind === 'probe' || request.kind === 'interactions') return;

                if (request.kind === 'import' && IMPORT_UNCONFIGURED.test(message)) {
                    setImportUnavailable(true);
                    setNotice({ tone: 'info', key: 'furni.editor.status.import_unconfigured' });
                    return;
                }

                setNotice(failureNotice(message));
            },
            [traffic, settleWrite]
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
        isResyncing,
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
