import { FC, KeyboardEvent } from 'react';
import { LocalizeText } from '../../../api';
import { LayoutFurniIconImageView, StaffEmpty } from '../../../common';
import { FurniEditorText, FurniItem, FurniSearchCriteria, FurniSortField, localizeFurniEditorText } from '../../../hooks/furni-editor';

const COLUMNS: FurniSortField[] = ['id', 'spriteId', 'itemName', 'publicName', 'type', 'interactionType'];

interface FurniEditorSearchTableViewProps {
    rows: { item: FurniItem; flag: FurniEditorText | null }[];
    criteria: FurniSearchCriteria;
    isSearching: boolean;
    onSort: (field: FurniSortField, dir: FurniSearchCriteria['sortDir']) => void;
    onOpen: (id: number) => void;
}

export const FurniEditorSearchTableView: FC<FurniEditorSearchTableViewProps> = ({ rows, criteria, isSearching, onSort, onOpen }) => {
    const sortBy = (field: FurniSortField) => onSort(field, criteria.sortField === field && criteria.sortDir === 'asc' ? 'desc' : 'asc');

    const openOnKey = (event: KeyboardEvent<HTMLTableRowElement>, id: number) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        onOpen(id);
    };

    return (
        <div className="octane-furni-editor-results">
            <table className="octane-staff-table">
                <thead>
                    <tr>
                        <th aria-label={LocalizeText('furni.editor.search.column.icon')} />
                        {COLUMNS.map((field) => {
                            const active = criteria.sortField === field;

                            return (
                                <th key={field} aria-sort={active ? (criteria.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                    <button className="octane-furni-editor-sort" type="button" onClick={() => sortBy(field)}>
                                        {LocalizeText(`furni.editor.search.column.${field}`)}
                                        {active ? (criteria.sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                                    </button>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ item, flag }) => {
                        const note = flag ? localizeFurniEditorText(flag) : undefined;

                        return (
                            <tr
                                key={item.id}
                                className="octane-furni-editor-result"
                                tabIndex={0}
                                title={note}
                                onClick={() => onOpen(item.id)}
                                onKeyDown={(event) => openOnKey(event, item.id)}
                            >
                                <td className="octane-furni-editor-result-icon">
                                    <LayoutFurniIconImageView productClassId={item.spriteId} productType={item.type} />
                                </td>
                                <td>{item.id}</td>
                                <td>{item.spriteId}</td>
                                <td className="octane-furni-editor-ellipsis">
                                    {flag && (
                                        <span aria-label={note} className="octane-staff-flag is-danger octane-furni-editor-row-flag">
                                            {LocalizeText('furni.editor.search.flag')}
                                        </span>
                                    )}
                                    {item.itemName}
                                </td>
                                <td className="octane-furni-editor-ellipsis" title={item.publicName}>
                                    {item.publicName || <span className="octane-staff-muted">-</span>}
                                </td>
                                <td>{LocalizeText(item.type === 's' ? 'furni.editor.type.floor' : 'furni.editor.type.wall')}</td>
                                <td className="octane-furni-editor-ellipsis">{item.interactionType || <span className="octane-staff-muted">-</span>}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {rows.length === 0 && (
                <StaffEmpty>
                    {isSearching ? (
                        LocalizeText('furni.editor.search.searching')
                    ) : (
                        <>
                            <div>{LocalizeText('furni.editor.search.empty')}</div>
                            <div>{LocalizeText('furni.editor.search.empty.hint')}</div>
                        </>
                    )}
                </StaffEmpty>
            )}
        </div>
    );
};
