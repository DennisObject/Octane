import { ChangeEvent, FC, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, StaffSection, StaffStatus } from '../../../../common';
import { useNotificationActions } from '../../../../hooks';
import { useCatalogStudio } from '../../../../hooks/catalog/useCatalogStudio';

const CATALOG_FILE_NAME = 'catalog-studio.sql';

const downloadDocument = (document: string) => {
    const url = URL.createObjectURL(new Blob([document], { type: 'application/sql;charset=utf-8' }));
    const link = window.document.createElement('a');
    link.href = url;
    link.download = CATALOG_FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);
};

/**
 * Exports the whole catalog as one SQL file and imports one back. The server parses the
 * statements and never executes them directly; an import is dry-run before it can be applied.
 */
export const CatalogAdminTransferView: FC = () => {
    const studio = useCatalogStudio();
    const { showConfirm } = useNotificationActions();
    const [document, setDocument] = useState('');
    const [dryRunSource, setDryRunSource] = useState<string | null>(null);
    const downloadPendingRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const result = studio.documentResult?.format === 'SQL' ? studio.documentResult : null;
    const exportId = result?.code === 'EXPORTED' ? result.operationId : null;
    const exportedDocument = exportId ? result.document : '';
    // The dry-run fingerprint only covers the text it checked; editing it afterwards needs a new dry-run.
    const canApply = !studio.loading && result?.code === 'DRY_RUN_READY' && result.changedEntities > 0 && dryRunSource === document;

    // A finished export replaces the text once, and downloads it when that was asked for.
    const [loadedExportId, setLoadedExportId] = useState<string | null>(null);
    if (exportId && exportId !== loadedExportId) {
        setLoadedExportId(exportId);
        setDocument(exportedDocument);
    }

    useEffect(() => {
        if (!exportId || !downloadPendingRef.current) return;

        downloadPendingRef.current = false;
        downloadDocument(exportedDocument);
    }, [exportId, exportedDocument]);

    const requestDryRun = () => {
        if (studio.loading || !document.trim()) return;

        setDryRunSource(document);
        studio.dryRunDocument('SQL', document);
    };

    const importFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => setDocument(typeof reader.result === 'string' ? reader.result : ''));
        reader.readAsText(file);
    };

    const requestDownload = () => {
        if (studio.loading) return;

        downloadPendingRef.current = true;
        studio.exportDocument('SQL');
    };

    const confirmApply = () => {
        if (!canApply) return;

        const { fingerprint, changedEntities } = result;
        showConfirm(
            LocalizeText('catalog.admin.sql.apply.confirm', ['count'], [String(changedEntities)]),
            () => studio.applyDocument('SQL', document, fingerprint, LocalizeText('catalog.admin.history.sql.import')),
            null,
            LocalizeText('catalog.admin.sql.apply', ['count'], [String(changedEntities)]),
            null,
            LocalizeText('catalog.admin.sql.title')
        );
    };

    return (
        <StaffSection className="octane-catalog-admin-transfer" title={LocalizeText('catalog.admin.sql.title')}>
            <span className="octane-staff-muted">{LocalizeText('catalog.admin.sql.description')}</span>
            <div className="octane-staff-row octane-catalog-admin-actions">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    {LocalizeText('catalog.admin.sql.import')}
                </Button>
                <input ref={fileInputRef} accept=".sql,application/sql,text/plain" className="hidden" type="file" onChange={importFile} />
                <Button disabled={studio.loading} variant="secondary" onClick={requestDownload}>
                    {LocalizeText('catalog.admin.sql.download')}
                </Button>
                <Button disabled={studio.loading || !document.trim()} variant="secondary" onClick={requestDryRun}>
                    {LocalizeText('catalog.admin.sql.dryrun')}
                </Button>
                <Button disabled={!canApply} variant="primary" onClick={confirmApply}>
                    {LocalizeText('catalog.admin.sql.apply', ['count'], [String(result?.changedEntities ?? 0)])}
                </Button>
            </div>
            <textarea
                aria-label={LocalizeText('catalog.admin.sql.title')}
                className="octane-catalog-admin-sql"
                placeholder={LocalizeText('catalog.admin.sql.placeholder')}
                spellCheck={false}
                value={document}
                onChange={(event) => setDocument(event.target.value)}
            />
            {result && (
                <StaffStatus
                    message={LocalizeText('catalog.admin.sql.result', ['message', 'count'], [result.message, String(result.changedEntities)])}
                    tone={result.success ? 'success' : 'error'}
                />
            )}
            {!!result?.changes.length && (
                <div className="octane-staff-list octane-catalog-admin-sql-diff" aria-label={LocalizeText('catalog.admin.sql.diff')}>
                    {result.changes.map((change) => (
                        <div key={`${change.catalogType}-${change.entityType}-${change.entityId}-${change.operation}`} className="octane-staff-list-row">
                            <strong>
                                {change.operation} {change.entityType} #{change.entityId}
                            </strong>
                            <span className="octane-staff-muted">
                                {change.catalogType} · {change.fields.length ? change.fields.join(', ') : LocalizeText('catalog.admin.sql.nofields')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </StaffSection>
    );
};
