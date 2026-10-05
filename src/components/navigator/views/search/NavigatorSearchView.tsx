import { NavigatorSearchComposer, NavigatorSearchResultSet } from '@octane/renderer';
import { FC, FormEvent, useEffect, useRef, useState } from 'react';
import { INavigatorSearchFilter, LocalizeText, SearchFilterOptions, SendMessageComposer } from '../../../../api';
import refreshIcon from '../../../../assets/images/navigator/air/refresh-search.png';
import searchCloseIcon from '../../../../assets/images/navigator/air/search-close.png';
import searchPenIcon from '../../../../assets/images/navigator/air/search-pen.png';
import { useNavigatorData, useNavigatorUiStore } from '../../../../hooks';
import { NavigatorFilterChipsView } from './NavigatorFilterChipsView';

interface NavigatorSearchViewProps {
    searchResult: NavigatorSearchResultSet | null;
}

const buildQuery = (filterIndex: number, value: string) => {
    const searchFilter: INavigatorSearchFilter = SearchFilterOptions[filterIndex] ?? SearchFilterOptions[0];

    return (searchFilter.query ? searchFilter.query + ':' : '') + value;
};

export const NavigatorSearchView: FC<NavigatorSearchViewProps> = (props) => {
    const { searchResult } = props;
    const [searchFilterIndex, setSearchFilterIndex] = useState(0);
    const [inputText, setInputText] = useState('');
    const [showClearIcon, setShowClearIcon] = useState(false);
    const [showRefresh, setShowRefresh] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { topLevelContext } = useNavigatorData();
    const tabCode = useNavigatorUiStore((state) => state.currentTabCode);
    const currentFilter = useNavigatorUiStore((state) => state.currentFilter);
    const placeholder = LocalizeText('navigator.filter.input.placeholder');
    const hasQuery = inputText.length > 0;

    useEffect(() => {
        if (!searchResult) return;

        const filter = SearchFilterOptions.find((option) => option.query && searchResult.data.startsWith(option.query + ':')) ?? SearchFilterOptions[0];
        const value = filter.query ? searchResult.data.slice(filter.query.length + 1) : searchResult.data;

        setSearchFilterIndex(SearchFilterOptions.findIndex((option) => option === filter));
        setInputText(value);
        setShowClearIcon(value.length > 0);
        setShowRefresh(value.length > 0);
    }, [searchResult]);

    const submitSearch = (value = inputText) => {
        if (!topLevelContext) return;
        useNavigatorUiStore.getState().setFilter(buildQuery(searchFilterIndex, value));
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        submitSearch();
    };

    const refreshSearch = () => {
        if (!tabCode) return;
        SendMessageComposer(new NavigatorSearchComposer(tabCode, currentFilter));
    };

    const clearSearch = () => {
        setInputText('');
        setShowClearIcon(false);
        inputRef.current?.focus();
    };

    return (
        <form onSubmit={onSubmit} className="octane-navigator-air__search">
            <NavigatorFilterChipsView value={searchFilterIndex} onChange={setSearchFilterIndex} />
            <div className={`octane-navigator-air__search-field${hasQuery ? '' : ' is-placeholder'}`}>
                <input
                    ref={inputRef}
                    className="octane-navigator-air__search-input"
                    name="q"
                    placeholder={placeholder}
                    aria-label={LocalizeText('navigator.tooltip.filter.input')}
                    type="text"
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                />
                <button
                    type="button"
                    className="octane-navigator-air__search-clear"
                    aria-label={showClearIcon ? LocalizeText('generic.clear') : placeholder}
                    onClick={clearSearch}
                >
                    <img src={showClearIcon ? searchCloseIcon : searchPenIcon} alt="" />
                </button>
            </div>
            {showRefresh && (
                <button type="button" className="octane-navigator-air__search-refresh" aria-label={LocalizeText('generic.refresh')} onClick={refreshSearch}>
                    <i className="octane-navigator-air__search-refresh-skin" aria-hidden="true" />
                    <img src={refreshIcon} alt="" />
                </button>
            )}
        </form>
    );
};
