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
import { useCallback, useRef, useState } from 'react';
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
import { FurniDetailRequest, FurniEditorMutationKind, FurniEditorTraffic, FurniWriteRequest } from './furniEditorTraffic';
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
 * The wire carries no request ids, so FurniEditorTraffic decides who an
 * answer belongs to: detail answers by item or sprite id, searches one at a
 * time, and never a write on the wire together with a read.
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

    const criteriaRef = useRef<FurniSearchCriteria>(DEFAULT_SEARCH_CRITERIA);
    const shownItemRef = useRef<{ id: number; itemName: string } | null>(null);
    // Session-wide, never reset: the sheet compares it with the last import it applied.
    const importSequenceRef = useRef(0);

    const [traffic] = useState(
        () =>
            new FurniEditorTraffic(
                (composer) => SendMessageComposer(composer),
                (kind) => {
                    if (kind === 'list') setIsSearching(false);
                    if (kind === 'detail') setIsLoadingDetail(false);
                    if (kind === 'import') setIsImporting(false);
                    if (kind === 'write') setPendingMutation(null);

                    setNotice(TIMEOUT_NOTICE);
                }
            )
    );

    const search = useCallback(
        (next: FurniSearchCriteria) => {
            criteriaRef.current = next;
            setCriteria(next);
            setIsSearching(true);
            traffic.requestSearch({ ...next, kind: 'list' });
        },
        [traffic]
    );

    const refreshSearch = useCallback(() => search(criteriaRef.current), [search]);

    // The rows sharing the open furni's line prefix; the sheet derives siblings
    // and duplicates from them.
    const probeRelated = useCallback(
        (classname: string) => {
            setRelatedItems([]);
            traffic.cancelSearch('probe');

            const query = lineQueryFor(classname);

            if (query) traffic.requestSearch({ query, type: '', page: 1, sortField: 'itemName', sortDir: 'asc', kind: 'probe' });
        },
        [traffic]
    );

    const requestDetail = useCallback(
        (request: FurniDetailRequest) => {
            traffic.requestDetail(request);
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
            if (shownItemRef.current?.id !== id || traffic.isDetailPending) return;

            requestDetail({ by: 'id', value: id, reveal: false, after });
        },
        [traffic, requestDetail]
    );

    // Reopening the window re-reads the furni still open on the sheet.
    const reloadOpenItem = useCallback(() => {
        if (shownItemRef.current) refreshItem(shownItemRef.current.id);
    }, [refreshItem]);

    const closeItem = useCallback(() => {
        if (traffic.cancelDetail()) setIsLoadingDetail(false);

        traffic.cancelSearch('probe');
        shownItemRef.current = null;
        setDetail(null);
        setRelatedItems([]);
        setImportResult(null);
    }, [traffic]);

    const loadInteractions = useCallback(() => traffic.requestInteractions(), [traffic]);

    const clearNotice = useCallback(() => setNotice(null), []);

    const mutate = useCallback(
        (kind: FurniEditorMutationKind, itemId: number, composer: IMessageComposer<unknown[]>): boolean => {
            if (!traffic.requestWrite({ kind, itemId, composer })) return false;

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
            if (!traffic.requestImport(id)) return;

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
                const request = traffic.answerSearch();

                if (!parser || !request) return;

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

                if (!parser?.item) return;

                const item = toFurniDetail(parser.item);
                const request = traffic.answerDetail(item);

                if (!request) return;

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
                traffic.answerInteractions();
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
                const itemId = traffic.answerImport();

                if (!parser || itemId === null) return;

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

                const { success, message = '', id } = parser;
                const route = traffic.routeResult(success, id);

                if (route.to === 'write') {
                    settleWrite(route.write, success, message);
                    return;
                }

                // A late success (after a timeout) still refreshes the sheet it belongs to.
                if (route.to === 'late-success') {
                    if (route.itemId > 0) refreshItem(route.itemId);
                    return;
                }

                if (route.read === 'detail') setIsLoadingDetail(false);
                if (route.read === 'import') setIsImporting(false);
                if (route.read === 'list') setIsSearching(false);

                if (route.read === 'import' && IMPORT_UNCONFIGURED.test(message)) {
                    setImportUnavailable(true);
                    setNotice({ tone: 'info', key: 'furni.editor.status.import_unconfigured' });
                    return;
                }

                setNotice(failureNotice(message));
            },
            [traffic, settleWrite, refreshItem]
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
