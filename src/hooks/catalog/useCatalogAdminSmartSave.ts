import { KeyboardEvent, useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import type { CatalogAdminMutationResult } from './catalogAdmin.types';
import {
    catalogAdminSmartSaveReducer,
    createCatalogAdminSmartSaveState,
    isCatalogAdminFormDirty,
    mergeCatalogAdminCommittedForm
} from './catalogAdminSmartSave.reducer';

interface UseCatalogAdminSmartSaveOptions<T extends object> {
    initial: T;
    /** Acknowledged saves by operation id; the hook only reads the one it is waiting for. */
    acknowledgements: ReadonlyMap<string, CatalogAdminMutationResult>;
    submit: (draft: T) => string | null;
    canSubmit: (draft: T) => boolean;
    toCommitted: (acknowledgement: CatalogAdminMutationResult) => T | null;
    onClose: () => void;
    /** Asks before discarding unsaved changes; calls `discard` when the user agrees. */
    confirmDiscard: (discard: () => void) => void;
    incompleteMessage: string;
}

/**
 * Draft/baseline form state for a catalog admin editor. A save is answered by the
 * CatalogAdminResult with the same operation id; edits made while it is in flight are kept.
 */
export const useCatalogAdminSmartSave = <T extends object>(options: UseCatalogAdminSmartSaveOptions<T>) => {
    const { initial, acknowledgements, incompleteMessage } = options;
    const [state, dispatch] = useReducer(catalogAdminSmartSaveReducer<T>, initial, createCatalogAdminSmartSaveState<T>);
    const stateRef = useRef(state);
    const optionsRef = useRef(options);

    useLayoutEffect(() => {
        stateRef.current = state;
        optionsRef.current = options;
    });

    const patch = useCallback((value: Partial<T>) => dispatch({ type: 'patch', patch: value }), []);
    const hydrate = useCallback((value: T) => dispatch({ type: 'hydrate', value }), []);
    const reset = useCallback(() => dispatch({ type: 'reset' }), []);

    const save = useCallback((closeAfter = false) => {
        const current = stateRef.current;
        const { submit, canSubmit, onClose } = optionsRef.current;

        if (current.inFlight) {
            dispatch({ type: 'queue', closeAfter });
            return;
        }

        if (!isCatalogAdminFormDirty(current.baseline, current.draft)) {
            if (closeAfter) onClose();
            return;
        }

        if (!canSubmit(current.draft)) return;

        const operationId = submit(current.draft);
        if (operationId) dispatch({ type: 'submit', operationId, submitted: current.draft, closeAfter });
    }, []);

    /** Runs `proceed` straight away, or after the user agreed to drop unsaved or unanswered changes. */
    const confirmLeave = useCallback((proceed: () => void) => {
        const current = stateRef.current;

        if (current.inFlight || isCatalogAdminFormDirty(current.baseline, current.draft)) optionsRef.current.confirmDiscard(proceed);
        else proceed();
    }, []);

    const requestClose = useCallback(() => confirmLeave(() => optionsRef.current.onClose()), [confirmLeave]);

    /** Ctrl+S / Cmd+S saves, but only for the editor window that has focus. */
    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;

            event.preventDefault();
            save(false);
        },
        [save]
    );

    const inFlightId = state.inFlight?.operationId ?? null;
    const acknowledgement = inFlightId ? (acknowledgements.get(inFlightId) ?? null) : null;

    useEffect(() => {
        if (!acknowledgement) return;

        const current = stateRef.current;
        const inFlight = current.inFlight;
        if (!inFlight || inFlight.operationId !== acknowledgement.operationId) return;

        const { operationId } = acknowledgement;

        if (!acknowledgement.success) {
            if (acknowledgement.code === 'STALE_REVISION') dispatch({ type: 'conflict', operationId, message: acknowledgement.message });
            else dispatch({ type: 'failure', operationId, message: acknowledgement.message, fieldErrors: acknowledgement.fieldErrors });
            return;
        }

        const committed = optionsRef.current.toCommitted(acknowledgement);
        if (!committed) {
            dispatch({ type: 'failure', operationId, message: acknowledgement.message || incompleteMessage, fieldErrors: {} });
            return;
        }

        const merged = mergeCatalogAdminCommittedForm(inFlight.submitted, current.draft, committed);
        const shouldClose = inFlight.closeAfter && !current.queued && !isCatalogAdminFormDirty(committed, merged);

        dispatch({ type: 'success', operationId, committed, savedAt: acknowledgement.acknowledgedAt, message: acknowledgement.message });
        if (shouldClose) optionsRef.current.onClose();
    }, [acknowledgement, incompleteMessage]);

    // A save requested while another was in flight runs once the first one is answered.
    useEffect(() => {
        if (state.inFlight || !state.queued) return;

        const { submit, canSubmit, onClose } = optionsRef.current;

        if (!isCatalogAdminFormDirty(state.baseline, state.draft)) {
            const closeAfter = state.queued.closeAfter;
            dispatch({ type: 'reset' });
            if (closeAfter) onClose();
            return;
        }

        if (!canSubmit(state.draft)) return;

        const operationId = submit(state.draft);
        if (operationId) dispatch({ type: 'submit', operationId, submitted: state.draft, closeAfter: state.queued.closeAfter });
    }, [state.baseline, state.draft, state.inFlight, state.queued]);

    return {
        ...state,
        isDirty: isCatalogAdminFormDirty(state.baseline, state.draft),
        patch,
        hydrate,
        reset,
        save,
        requestClose,
        confirmLeave,
        onKeyDown
    };
};
