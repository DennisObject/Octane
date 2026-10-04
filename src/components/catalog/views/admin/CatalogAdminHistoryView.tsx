import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, StaffEmpty, StaffSection } from '../../../../common';
import { useNotificationActions } from '../../../../hooks';
import { CATALOG_STUDIO_UNDOABLE_OPERATIONS, CatalogStudioHistoryGroup } from '../../../../hooks/catalog/catalogStudio.types';
import { useCatalogStudio } from '../../../../hooks/catalog/useCatalogStudio';

const isUndoable = (group: CatalogStudioHistoryGroup) =>
    group.entries.length > 0 && group.entries.every((entry) => CATALOG_STUDIO_UNDOABLE_OPERATIONS.includes(entry.operation));

/** The live operation history, with undo on edits and moves. */
export const CatalogAdminHistoryView: FC = () => {
    const { history, loading, undo } = useCatalogStudio();
    const { showConfirm } = useNotificationActions();

    const confirmUndo = (group: CatalogStudioHistoryGroup) =>
        showConfirm(
            LocalizeText('catalog.admin.history.undo.confirm', ['summary'], [group.summary]),
            () => undo(group.id),
            null,
            LocalizeText('catalog.admin.history.undo'),
            null,
            LocalizeText('catalog.admin.history.undo.title')
        );

    return (
        <div className="octane-catalog-admin-history">
            <StaffSection title={LocalizeText('catalog.admin.history')}>
                <div className="octane-staff-list octane-catalog-admin-history-list">
                    {!history.length && <StaffEmpty>{LocalizeText('catalog.admin.history.empty')}</StaffEmpty>}
                    {history.map((group) => (
                        <div key={group.id} className="octane-staff-list-row">
                            <div className="octane-catalog-admin-grow octane-catalog-admin-history-main">
                                <strong>{group.summary}</strong>
                                <span className="octane-staff-muted">
                                    {LocalizeText(
                                        'catalog.admin.history.meta',
                                        ['count', 'name'],
                                        [String(group.entries.length), group.actorName || `#${group.actorId}`]
                                    )}
                                </span>
                            </div>
                            {isUndoable(group) && (
                                <Button disabled={loading} variant="secondary" onClick={() => !loading && confirmUndo(group)}>
                                    {LocalizeText('catalog.admin.history.undo')}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </StaffSection>
        </div>
    );
};
