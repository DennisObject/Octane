import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, StaffEmpty, StaffSection } from '../../../../common';
import { useNotificationActions } from '../../../../hooks';
import type { CatalogStudioHistoryGroup, CatalogStudioValidationIssue } from '../../../../hooks/catalog/catalogStudio.types';
import { useCatalogStudio } from '../../../../hooks/catalog/useCatalogStudio';

const MAX_ROWS_PER_RULE = 50;

// Grouping earns its keep on a catalog that answers with hundreds of rows. On a short list it is
// just a click in the way, so a small report opens itself.
const AUTO_EXPAND_LIMIT = 20;

// A rule fires once per entity, so a live catalog answers with hundreds of identical sentences.
// The rule is what an operator acts on; the entities are the detail underneath it.
const groupByRule = (issues: CatalogStudioValidationIssue[]) => {
    const groups = new Map<string, { code: string; label: string; issues: CatalogStudioValidationIssue[] }>();

    for (const issue of issues) {
        const group = groups.get(issue.code);

        if (group) group.issues.push(issue);
        else groups.set(issue.code, { code: issue.code, label: issue.message, issues: [issue] });
    }

    return [...groups.values()].sort((a, b) => b.issues.length - a.issues.length);
};

interface CatalogAdminHistoryViewProps {
    /** Only pages can be opened from a problem: an offer is not addressable on its own in the manager. */
    onSelectPage: (pageId: number) => void;
}

/** Live catalog health check and the undoable operation history. */
export const CatalogAdminHistoryView: FC<CatalogAdminHistoryViewProps> = ({ onSelectPage }) => {
    const { session, revision, validation, history, loading, validate, undo } = useCatalogStudio();
    const { showConfirm } = useNotificationActions();
    const [openRules, setOpenRules] = useState<string[] | null>(null);
    const issues = useMemo(() => validation?.issues ?? [], [validation]);
    const ruleGroups = useMemo(() => groupByRule(issues), [issues]);
    const expandedRules = openRules ?? (issues.length <= AUTO_EXPAND_LIMIT ? ruleGroups.map((group) => group.code) : []);
    const sessionReady = !!session;
    const validatedRevision = validation?.revision ?? null;

    // Check once per catalog revision instead of after every answer.
    useEffect(() => {
        if (sessionReady && validatedRevision !== revision) validate();
    }, [revision, sessionReady, validate, validatedRevision]);

    const toggleRule = (code: string) =>
        setOpenRules((current) => {
            const base = current ?? expandedRules;

            return base.includes(code) ? base.filter((entry) => entry !== code) : [...base, code];
        });

    const confirmUndo = (group: CatalogStudioHistoryGroup) =>
        showConfirm(
            LocalizeText('catalog.admin.history.undo.confirm', ['summary'], [group.summary]),
            () => undo(group.id),
            null,
            LocalizeText('catalog.admin.history.undo'),
            null,
            LocalizeText('catalog.admin.history.undo.title')
        );

    const checkedAt = validation?.receivedAt ? new Date(validation.receivedAt).toLocaleTimeString() : null;

    return (
        <div className="octane-catalog-admin-history">
            <StaffSection title={LocalizeText('catalog.admin.problems')}>
                <div className="octane-staff-row">
                    <span className="octane-staff-muted octane-catalog-admin-grow">
                        {checkedAt ? LocalizeText('catalog.admin.problems.checked', ['time'], [checkedAt]) : LocalizeText('catalog.admin.problems.unchecked')}
                    </span>
                    <Button disabled={loading || !sessionReady} variant="secondary" onClick={() => !loading && sessionReady && validate()}>
                        {LocalizeText('catalog.admin.problems.recheck')}
                    </Button>
                </div>
                <div className="octane-staff-list octane-catalog-admin-problem-list">
                    {!issues.length && <StaffEmpty>{LocalizeText('catalog.admin.problems.none')}</StaffEmpty>}
                    {ruleGroups.map((group) => {
                        const isOpen = expandedRules.includes(group.code);

                        return (
                            <div key={group.code} className="octane-catalog-admin-problem-group">
                                <button
                                    aria-expanded={isOpen}
                                    className="octane-staff-list-row octane-catalog-admin-problem-head"
                                    type="button"
                                    onClick={() => toggleRule(group.code)}
                                >
                                    <span className={`octane-catalog-admin-tree-caret ${isOpen ? 'is-open' : ''}`} />
                                    <strong className="octane-catalog-admin-grow">{group.label}</strong>
                                    <span className="octane-staff-flag is-danger">{group.issues.length}</span>
                                </button>
                                {isOpen &&
                                    group.issues.slice(0, MAX_ROWS_PER_RULE).map((issue, index) => (
                                        <button
                                            key={`${issue.entityType}-${issue.entityId}-${issue.field}-${index}`}
                                            className="octane-staff-list-row octane-catalog-admin-problem-row"
                                            disabled={issue.entityType !== 'PAGE'}
                                            type="button"
                                            onClick={() => issue.entityType === 'PAGE' && onSelectPage(issue.entityId)}
                                        >
                                            <strong>
                                                {issue.entityType} #{issue.entityId}
                                            </strong>
                                            <span className="octane-staff-muted">
                                                {issue.field} · {issue.message}
                                            </span>
                                        </button>
                                    ))}
                                {isOpen && group.issues.length > MAX_ROWS_PER_RULE && (
                                    <span className="octane-staff-muted octane-catalog-admin-problem-more">
                                        {LocalizeText('catalog.admin.problems.more', ['count'], [String(group.issues.length - MAX_ROWS_PER_RULE)])}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </StaffSection>
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
                            <Button disabled={loading} variant="secondary" onClick={() => !loading && confirmUndo(group)}>
                                {LocalizeText('catalog.admin.history.undo')}
                            </Button>
                        </div>
                    ))}
                </div>
            </StaffSection>
        </div>
    );
};
