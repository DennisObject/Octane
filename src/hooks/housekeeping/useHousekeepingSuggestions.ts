import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 250;
const MIN_PREFIX = 2;

/**
 * Debounced type-ahead over one search request. Only the newest request may write its
 * result: every new prefix aborts the one in flight.
 */
export const useHousekeepingSuggestions = <T>(search: (prefix: string, signal: AbortSignal) => Promise<T[]>) => {
    const [suggestions, setSuggestions] = useState<T[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const cancel = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = null;
        abortRef.current?.abort();
        abortRef.current = null;
    }, []);

    useEffect(() => cancel, [cancel]);

    const request = useCallback(
        (prefix: string) => {
            cancel();

            const trimmed = (prefix || '').trim();

            if (trimmed.length < MIN_PREFIX) {
                setSuggestions([]);

                return;
            }

            timerRef.current = setTimeout(async () => {
                const controller = new AbortController();

                abortRef.current = controller;

                try {
                    const list = await search(trimmed, controller.signal);

                    if (!controller.signal.aborted) setSuggestions(Array.isArray(list) ? list : []);
                } catch {
                    if (!controller.signal.aborted) setSuggestions([]);
                }
            }, DEBOUNCE_MS);
        },
        [cancel, search]
    );

    return { suggestions, request };
};
