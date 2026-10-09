import { FlatCreatedEvent, NavigatorSearchComposer, NavigatorSearchEvent, NavigatorSearchResultSet } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useNavigatorUiStore } from './navigatorUiStore';

const NAVIGATOR_SEARCH_CACHE_MS = 4000;

export const useNavigatorSearch = () => {
    const searchRequest = useNavigatorUiStore((s) => s.searchRequest);
    const cache = useRef(new Map<string, { result: NavigatorSearchResultSet; expiresAt: number }>());
    const [searchResult, setSearchResult] = useState<NavigatorSearchResultSet | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    const acceptResult = useCallback((result: NavigatorSearchResultSet) => {
        const now = performance.now();
        for (const [key, entry] of cache.current) {
            if (now >= entry.expiresAt) cache.current.delete(key);
        }
        cache.current.set(`${result.code}/${result.data}`, { result, expiresAt: now + NAVIGATOR_SEARCH_CACHE_MS });

        setSearchResult(result);
        setIsFetching(false);
        useNavigatorUiStore.getState().recordSearchResult(result.code, result.data);
    }, []);

    const onSearchResult = useCallback(
        (event: NavigatorSearchEvent) => {
            const result = event.getParser()?.result;
            if (result) acceptResult(result);
        },
        [acceptResult]
    );
    const refetch = useCallback(() => useNavigatorUiStore.getState().requestSearch(), []);

    useMessageEvent<NavigatorSearchEvent>(NavigatorSearchEvent, onSearchResult);
    useMessageEvent<FlatCreatedEvent>(FlatCreatedEvent, refetch);

    useEffect(() => {
        if (!searchRequest?.code) return;

        const state = useNavigatorUiStore.getState();
        if (state.searchRequest !== searchRequest) return;
        state.consumeSearchRequest();

        const key = `${searchRequest.code}/${searchRequest.filter}`;
        if (searchRequest.refresh) cache.current.delete(key);

        const entry = cache.current.get(key);
        if (entry && performance.now() < entry.expiresAt) {
            acceptResult(entry.result);
            return;
        }

        cache.current.delete(key);
        setIsFetching(true);
        SendMessageComposer(new NavigatorSearchComposer(searchRequest.code, searchRequest.filter));
    }, [searchRequest, acceptResult]);

    return {
        searchResult,
        isFetching,
        refetch
    };
};
