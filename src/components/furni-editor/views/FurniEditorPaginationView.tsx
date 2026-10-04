import { FC, useState } from 'react';
import { LocalizeText } from '../../../api';
import { Button } from '../../../common';
import { furniEditorText, SEARCH_PAGE_SIZE } from '../../../hooks/furni-editor';

interface FurniEditorPaginationViewProps {
    page: number;
    total: number;
    onPage: (page: number) => void;
}

export const FurniEditorPaginationView: FC<FurniEditorPaginationViewProps> = ({ page, total, onPage }) => {
    const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
    const [pageText, setPageText] = useState(String(page));
    const [shownPage, setShownPage] = useState(page);

    // The page the server answered with wins over whatever was typed.
    if (shownPage !== page) {
        setShownPage(page);
        setPageText(String(page));
    }

    const goTo = (target: number) => onPage(Math.min(Math.max(1, Math.trunc(target) || 1), totalPages));

    return (
        <div className="octane-staff-row">
            <span className="octane-staff-muted octane-furni-editor-grow">
                {furniEditorText('furni.editor.search.total', { total: total.toLocaleString() })}
            </span>
            <Button disabled={page <= 1} title={LocalizeText('furni.editor.page.first')} variant="secondary" onClick={() => goTo(1)}>
                «
            </Button>
            <Button disabled={page <= 1} title={LocalizeText('furni.editor.page.previous')} variant="secondary" onClick={() => goTo(page - 1)}>
                ‹
            </Button>
            <input
                aria-label={LocalizeText('furni.editor.page.number')}
                className="octane-furni-editor-page-input"
                inputMode="numeric"
                type="text"
                value={pageText}
                onChange={(event) => setPageText(event.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') goTo(Number(pageText));
                }}
            />
            <span className="octane-staff-muted">{furniEditorText('furni.editor.page.of', { pages: totalPages.toLocaleString() })}</span>
            <Button disabled={page >= totalPages} title={LocalizeText('furni.editor.page.next')} variant="secondary" onClick={() => goTo(page + 1)}>
                ›
            </Button>
            <Button disabled={page >= totalPages} title={LocalizeText('furni.editor.page.last')} variant="secondary" onClick={() => goTo(totalPages)}>
                »
            </Button>
        </div>
    );
};
