import {
    FurniEditorBySpriteComposer,
    FurniEditorDeleteComposer,
    FurniEditorDetailComposer,
    FurniEditorDetailResultEvent,
    FurniEditorImportTextComposer,
    FurniEditorImportTextResultEvent,
    FurniEditorInteractionsComposer,
    FurniEditorInteractionsResultEvent,
    FurniEditorResultEvent,
    FurniEditorRevertFurnidataComposer,
    FurniEditorSearchComposer,
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
import { FurniSearchChannel, PendingRequest } from './furniEditorRequests';
import { lineQueryFor } from './furniEditorSuggestions';
import type { FurniEditorText } from './furniEditorText';
import { useFurniEditorUiStore } from './furniEditorUiStore';

export type FurniEditorMutationKind = 'update' | 'delete' | 'furnidata' | 'structure' | 'revert' | 'syncName';

export interface FurniEditorNotice extends FurniEditorText {
    tone: 'success' | 'error';
}

interface DetailRequest {
    by: 'id' | 'sprite';
    value: number;
    /** A request the user made (open a furni) as opposed to a refresh after a save. */
    reveal: boolean;
}

interface PendingMutation {
    kind: FurniEditorMutationKind;
    itemId: number;
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
const failureNotice = (message: string): FurniEditorNotice =>
    message ? { tone: 'error', key: 'furni.editor.status.failed', values: { message } } : { tone: 'error', key: 'furni.editor.status.failed_generic' };

/**
 * Internal shared source of the furni editor: every packet listener, the
 * data they deliver and the actions that request it. Consumers read it
 * through useFurniEditorState / useFurniEditorActions.
 *
 * Correlation, since the wire carries no request ids:
 * - detail answers are matched to the latest detail request by item id or
 *   sprite id, so a slow answer for furni A never replaces furni B;
 * - searches go out one at a time (FurniSearchChannel), so the list and the
 *   line probe can share the result packet;
 * - one mutation at a time; its result is matched by the item id the server
 *   echoes (or -1 for deletes and failures).
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
    const [pendingMutation, setPendingMutation] = useState<FurniEditorMutationKind | null>(null);
    const [notice, setNotice] = useState<FurniEditorNotice | null>(null);

    const criteriaRef = useRef<FurniSearchCriteria>(DEFAULT_SEARCH_CRITERIA);
    const shownItemRef = useRef<{ id: number; itemName: string } | null>(null);

    const [requests] = useState(() => ({
        search: new FurniSearchChannel(
            (request) => SendMessageComposer(new FurniEditorSearchComposer(request.query, request.type, request.page, request.sortField, request.sortDir)),
            (request) => {
                if (request.kind !== 'list') return;

                setIsSearching(false);
                setNotice(TIMEOUT_NOTICE);
            }
        ),
        detail: new PendingRequest<DetailRequest>(() => {
            setIsLoadingDetail(false);
            setNotice(TIMEOUT_NOTICE);
        }),
        mutation: new PendingRequest<PendingMutation>(() => {
            setPendingMutation(null);
            setNotice(TIMEOUT_NOTICE);
        }),
        importText: new PendingRequest<number>(() => {
            setIsImporting(false);
            setNotice(TIMEOUT_NOTICE);
        })
    }));

    const search = useCallback(
        (next: FurniSearchCriteria) => {
            criteriaRef.current = next;
            setCriteria(next);
            setIsSearching(true);
            requests.search.request({ ...next, kind: 'list' });
        },
        [requests]
    );

    const refreshSearch = useCallback(() => search(criteriaRef.current), [search]);

    // The rows sharing the open furni's line prefix; the sheet derives siblings
    // and duplicates from them.
    const probeRelated = useCallback(
        (classname: string) => {
            setRelatedItems([]);
            requests.search.cancel('probe');

            const query = lineQueryFor(classname);

            if (query) requests.search.request({ query, type: '', page: 1, sortField: 'itemName', sortDir: 'asc', kind: 'probe' });
        },
        [requests]
    );

    const requestDetail = useCallback(
        (request: DetailRequest) => {
            requests.detail.start(request);
            setIsLoadingDetail(true);

            if (request.reveal) setNotice(null);

            SendMessageComposer(request.by === 'id' ? new FurniEditorDetailComposer(request.value) : new FurniEditorBySpriteComposer(request.value));
        },
        [requests]
    );

    const openItem = useCallback((id: number) => requestDetail({ by: 'id', value: id, reveal: true }), [requestDetail]);

    const openSprite = useCallback((spriteId: number) => requestDetail({ by: 'sprite', value: spriteId, reveal: true }), [requestDetail]);

    // After a save the open sheet re-reads the item, unless the user is
    // already on the way to another furni.
    const refreshItem = useCallback(
        (id: number) => {
            if (shownItemRef.current?.id !== id || requests.detail.pending) return;

            requestDetail({ by: 'id', value: id, reveal: false });
        },
        [requests, requestDetail]
    );

    // Reopening the window re-reads the furni still open on the sheet.
    const reloadOpenItem = useCallback(() => {
        if (shownItemRef.current) refreshItem(shownItemRef.current.id);
    }, [refreshItem]);

    const closeItem = useCallback(() => {
        if (requests.detail.finish()) setIsLoadingDetail(false);

        requests.search.cancel('probe');
        shownItemRef.current = null;
        setDetail(null);
        setRelatedItems([]);
        setImportResult(null);
    }, [requests]);

    const loadInteractions = useCallback(() => SendMessageComposer(new FurniEditorInteractionsComposer()), []);

    const clearNotice = useCallback(() => setNotice(null), []);

    const mutate = useCallback(
        (kind: FurniEditorMutationKind, itemId: number, composer: IMessageComposer<unknown[]>): boolean => {
            if (requests.mutation.pending) return false;

            requests.mutation.start({ kind, itemId });
            setPendingMutation(kind);
            setNotice(null);
            SendMessageComposer(composer);

            return true;
        },
        [requests]
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
            if (requests.importText.pending !== null) return;

            requests.importText.start(id);
            setIsImporting(true);
            setNotice(null);
            SendMessageComposer(new FurniEditorImportTextComposer(id));
        },
        [requests]
    );

    useMessageEvent<FurniEditorSearchResultEvent>(
        FurniEditorSearchResultEvent,
        useCallback(
            (event: FurniEditorSearchResultEvent) => {
                const parser = event.getParser();
                const request = requests.search.settle();

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
            [requests]
        )
    );

    useMessageEvent<FurniEditorDetailResultEvent>(
        FurniEditorDetailResultEvent,
        useCallback(
            (event: FurniEditorDetailResultEvent) => {
                const parser = event.getParser();
                const request = requests.detail.pending;

                if (!parser?.item || !request) return;

                const item = toFurniDetail(parser.item);

                if ((request.by === 'id' ? item.id : item.spriteId) !== request.value) return;

                requests.detail.finish();
                setIsLoadingDetail(false);

                const previous = shownItemRef.current;

                shownItemRef.current = { id: item.id, itemName: item.itemName };
                setDetail({
                    item,
                    catalogItems: (parser.catalogItems ?? []).map(toCatalogRef),
                    furniDataEntry: parseJsonObject(parser.furniDataJson),
                    furniDataDiagnostic: toDiagnostic(parser.furniDataDiagnosticJson)
                });

                if (previous?.id !== item.id) setImportResult(null);
                if (previous?.id !== item.id || previous.itemName !== item.itemName) probeRelated(item.itemName);

                if (request.reveal) {
                    const ui = useFurniEditorUiStore.getState();

                    if (ui.activeTab === 'search') ui.setTab('names');
                }
            },
            [requests, probeRelated]
        )
    );

    useMessageEvent<FurniEditorInteractionsResultEvent>(
        FurniEditorInteractionsResultEvent,
        useCallback((event: FurniEditorInteractionsResultEvent) => setInteractions(event.getParser()?.interactions ?? []), [])
    );

    useMessageEvent<FurniEditorImportTextResultEvent>(
        FurniEditorImportTextResultEvent,
        useCallback(
            (event: FurniEditorImportTextResultEvent) => {
                const parser = event.getParser();
                const itemId = requests.importText.finish();

                if (!parser || itemId === null) return;

                setIsImporting(false);
                setImportResult((previous) => ({
                    itemId,
                    found: parser.found,
                    name: parser.name ?? '',
                    description: parser.description ?? '',
                    classname: parser.classname ?? '',
                    sequence: (previous?.sequence ?? 0) + 1
                }));
            },
            [requests]
        )
    );

    const settleMutation = useCallback(
        (mutation: PendingMutation, success: boolean, message: string) => {
            setPendingMutation(null);

            if (!success) {
                setNotice(failureNotice(message));
                return;
            }

            setNotice({ tone: 'success', key: SUCCESS_TEXT[mutation.kind] });

            if (mutation.kind === 'delete') {
                if (shownItemRef.current?.id === mutation.itemId) {
                    closeItem();
                    useFurniEditorUiStore.getState().setTab('search');
                }
            } else {
                refreshItem(mutation.itemId);
            }

            refreshSearch();
        },
        [closeItem, refreshItem, refreshSearch]
    );

    // A failed read: detail, by-sprite, search and import errors all arrive on the result packet.
    const settleFailedRead = useCallback(
        (message: string) => {
            if (requests.detail.finish()) setIsLoadingDetail(false);
            else if (requests.importText.finish() !== null) setIsImporting(false);
            else if (requests.search.settle()?.kind === 'list') setIsSearching(false);

            setNotice(failureNotice(message));
        },
        [requests]
    );

    useMessageEvent<FurniEditorResultEvent>(
        FurniEditorResultEvent,
        useCallback(
            (event: FurniEditorResultEvent) => {
                const parser = event.getParser();

                if (!parser) return;

                const { success, message = '', id } = parser;
                const mutation = requests.mutation.pending;

                if (mutation && (id <= 0 || id === mutation.itemId)) {
                    requests.mutation.finish();
                    settleMutation(mutation, success, message);
                    return;
                }

                // A late success (after a timeout) still refreshes the sheet it belongs to.
                if (success) {
                    if (id > 0) refreshItem(id);
                    return;
                }

                settleFailedRead(message);
            },
            [requests, settleMutation, settleFailedRead, refreshItem]
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
