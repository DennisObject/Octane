import { GetSessionDataManager } from '@volt/renderer';
import { ChangeEvent, FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
    CatalogPage,
    FilterCatalogNode,
    FurnitureOffer,
    ICatalogNode,
    ICatalogPage,
    IPurchasableOffer,
    LocalizeText,
    localizeWithFallback,
    PageLocalization,
    SearchResult
} from '../../../../../api';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';
import {
    CATALOG_SEARCH_DEBOUNCE_MS,
    findCatalogFurnitureMatches,
    isCatalogSearchEnterKey,
    normalizeCatalogSearchText,
    shouldRunCatalogSearch
} from './catalogSearch.helpers';

export const CatalogSearchView: FC<{}> = () => {
    const [searchValue, setSearchValue] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
    const { rootNode = null } = useCatalogData();
    const inputRef = useRef<HTMLInputElement>(null);
    const { currentType = null, setSearchResult = null, setCurrentPage = null } = useCatalogUiState();

    const runSearch = useCallback(
        (search: string) => {
            if (!rootNode || !shouldRunCatalogSearch(search)) return;

            const furnitureDatas = GetSessionDataManager().getAllFurnitureData();

            if (!furnitureDatas || !furnitureDatas.length) return;

            const { furniture: foundFurniture, furniLines: foundFurniLines } = findCatalogFurnitureMatches(furnitureDatas, search, currentType);

            const offers: IPurchasableOffer[] = [];

            for (const furniture of foundFurniture) {
                offers.push(new FurnitureOffer(furniture));
            }

            let nodes: ICatalogNode[] = [];

            FilterCatalogNode(search, foundFurniLines, rootNode, nodes);

            setSearchResult(
                new SearchResult(
                    search,
                    offers,
                    nodes.filter((node) => node.isVisible)
                )
            );
            setCurrentPage(
                new CatalogPage(
                    -1,
                    'default_3x3',
                    new PageLocalization([], [LocalizeText('catalog.search.results', ['count', 'needle'], [String(offers.length), search])]),
                    offers,
                    false,
                    1
                )
            );
        },
        [currentType, rootNode, setCurrentPage, setSearchResult]
    );

    const scheduleSearch = useCallback(
        (value: string, immediate = false) => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);

            const search = normalizeCatalogSearchText(value);

            // An empty field restores the page underneath the result override. One or two characters keep the last results.
            if (!search) {
                setSearchResult(null);
                setCurrentPage(null);

                return;
            }

            if (!shouldRunCatalogSearch(search)) return;

            if (immediate) {
                runSearch(search);

                return;
            }

            searchTimeout.current = setTimeout(() => runSearch(search), CATALOG_SEARCH_DEBOUNCE_MS);
        },
        [runSearch, setCurrentPage, setSearchResult]
    );

    const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        setSearchValue(value);
        scheduleSearch(value);
    };

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!isCatalogSearchEnterKey(event.key, searchValue)) return;

        event.preventDefault();
        scheduleSearch(searchValue, true);
    };

    const clearSearch = () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setSearchValue('');
        setSearchResult(null);
        setCurrentPage(null);
        inputRef.current?.focus();
    };

    useEffect(() => {
        if (searchValue) scheduleSearch(searchValue);
    }, [currentType, rootNode]);

    useEffect(() => () => searchTimeout.current && clearTimeout(searchTimeout.current), []);

    const hasQuery = searchValue.length > 0;

    return (
        <div className="volt-catalog-search">
            <input
                ref={inputRef}
                aria-label={LocalizeText('catalog.search')}
                className="volt-catalog-search-input"
                placeholder={LocalizeText('catalog.search')}
                type="text"
                value={searchValue}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
            />
            <button
                aria-label={hasQuery ? localizeWithFallback('generic.clear', 'Clear') : LocalizeText('catalog.search')}
                className={`volt-catalog-search-pen${hasQuery ? ' is-filled' : ' is-empty'}`}
                type="button"
                onClick={clearSearch}
            />
        </div>
    );
};
