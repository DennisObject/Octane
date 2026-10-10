import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../api';
import { FurniSearchCriteria, furniEditorText, SEARCH_PAGE_SIZE, searchRowFlag, useFurniEditorActions, useFurniEditorState } from '../../../hooks/furni-editor';
import { FurniEditorPaginationView } from './FurniEditorPaginationView';
import { FurniEditorSearchTableView } from './FurniEditorSearchTableView';

const SEARCH_DEBOUNCE_MS = 350;

const TYPE_FILTERS: { value: FurniSearchCriteria['type']; key: string }[] = [
    { value: '', key: 'furni.editor.search.type.all' },
    { value: 's', key: 'furni.editor.type.floor' },
    { value: 'i', key: 'furni.editor.type.wall' }
];

export const FurniEditorSearchView: FC<{ onOpen: (id: number) => void }> = ({ onOpen }) => {
    const { items, total, page, criteria, isSearching, interactions } = useFurniEditorState();
    const { search } = useFurniEditorActions();
    const [queryText, setQueryText] = useState(criteria.query);
    const [onlyFlagged, setOnlyFlagged] = useState(false);

    // Live search as the user types; the criteria already sent are the reference.
    useEffect(() => {
        if (queryText === criteria.query) return;

        const handle = window.setTimeout(() => search({ ...criteria, query: queryText, page: 1 }), SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(handle);
    }, [queryText, criteria, search]);

    // Registered interaction types: a row whose stored type is not among them,
    // or whose classname points at another one, is flagged as worth a look.
    const rows = useMemo(() => items.map((item) => ({ item, flag: searchRowFlag(item, interactions) })), [items, interactions]);
    const flaggedCount = rows.filter((row) => row.flag).length;
    const shownRows = onlyFlagged ? rows.filter((row) => row.flag) : rows;
    const from = total === 0 ? 0 : (page - 1) * SEARCH_PAGE_SIZE + 1;
    const to = Math.min(page * SEARCH_PAGE_SIZE, total);

    return (
        <div className="volt-furni-editor-search">
            <div className="volt-staff-row">
                <input
                    aria-label={LocalizeText('furni.editor.search.placeholder')}
                    className="volt-furni-editor-grow"
                    maxLength={100}
                    placeholder={LocalizeText('furni.editor.search.placeholder')}
                    type="search"
                    value={queryText}
                    onChange={(event) => setQueryText(event.target.value)}
                />
                {TYPE_FILTERS.map((filter) => (
                    <label key={filter.value || 'all'} className="volt-staff-row">
                        <input
                            checked={criteria.type === filter.value}
                            name="furni-editor-type"
                            type="radio"
                            onChange={() => search({ ...criteria, query: queryText, type: filter.value, page: 1 })}
                        />
                        {LocalizeText(filter.key)}
                    </label>
                ))}
            </div>
            <div className="volt-staff-row">
                <span className="volt-staff-muted volt-furni-editor-grow">
                    {total > 0
                        ? furniEditorText('furni.editor.search.showing', { from, to, total: total.toLocaleString() })
                        : LocalizeText(isSearching ? 'furni.editor.search.searching' : 'furni.editor.search.none')}
                </span>
                {flaggedCount > 0 && (
                    <label className="volt-staff-row" title={LocalizeText('furni.editor.search.only_flagged.tip')}>
                        <input checked={onlyFlagged} type="checkbox" onChange={(event) => setOnlyFlagged(event.target.checked)} />
                        {furniEditorText('furni.editor.search.only_flagged', { count: flaggedCount })}
                    </label>
                )}
            </div>
            <FurniEditorSearchTableView
                criteria={criteria}
                isSearching={isSearching}
                rows={shownRows}
                onOpen={onOpen}
                onSort={(sortField, sortDir) => search({ ...criteria, query: queryText, sortField, sortDir, page: 1 })}
            />
            <FurniEditorPaginationView page={page} total={total} onPage={(next) => search({ ...criteria, query: queryText, page: next })} />
        </div>
    );
};
