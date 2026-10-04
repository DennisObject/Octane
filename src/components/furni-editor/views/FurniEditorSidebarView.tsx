import { FC, ReactNode, useState } from 'react';
import { LocalizeText } from '../../../api';
import { Button } from '../../../common';
import {
    AssetPresence,
    EDITABLE_FIELDS,
    EditField,
    EditForm,
    fieldLabelKey,
    formatFurniEditorValue,
    FurniEditorDetail,
    FurniEditorFormApi,
    FurniEditorGroup,
    FurniEditorInsights,
    FurniEditorRights,
    FurniEditorSheetActions,
    furniEditorText
} from '../../../hooks/furni-editor';
import { FurniEditorCopyValueView } from './FurniEditorCopyValueView';
import { furnidataReasonText, FurniEditorFurnidataFlagView } from './FurniEditorFurnidataFlagView';
import { FurniEditorPreviewView } from './FurniEditorPreviewView';

const ASSET_TONE: Record<AssetPresence, string> = { present: 'is-ok', missing: 'is-danger', unknown: 'is-muted' };

const Fact: FC<{ label: string; tone?: 'warning'; children: ReactNode }> = ({ label, tone, children }) => (
    <tr className={tone === 'warning' ? 'octane-furni-editor-warning' : ''}>
        <th>{label}</th>
        <td>{children}</td>
    </tr>
);

const Link: FC<{ onClick: () => void; title?: string; children: ReactNode }> = ({ onClick, title, children }) => (
    <button className="octane-furni-editor-link" title={title} type="button" onClick={onClick}>
        {children}
    </button>
);

interface FurniEditorSidebarViewProps {
    detail: FurniEditorDetail;
    form: EditForm;
    stored: EditForm;
    sheet: FurniEditorFormApi;
    displayName: string;
    insights: FurniEditorInsights;
    actions: FurniEditorSheetActions;
    isBusy: boolean;
    rights: FurniEditorRights;
    onBack: () => void;
    onGroup: (group: FurniEditorGroup) => void;
    onJump: (field: EditField) => void;
}

/** Who the open furni is, what state it is in, and the sheet actions. Never scrolls away. */
export const FurniEditorSidebarView: FC<FurniEditorSidebarViewProps> = (props) => {
    const { detail, form, stored, sheet, displayName, insights, actions, isBusy, rights, onBack, onGroup, onJump } = props;
    const { item, catalogItems } = detail;
    const { suggestions, warnings, duplicates, related, furnidataIdMismatch, interactionUnregistered, assets, furnidataState } = insights;
    const { changedFields, isDirty, isValid } = sheet;
    const [jumpQuery, setJumpQuery] = useState('');

    const furnidataStatus =
        furnidataState === 'locked' ? furnidataReasonText(insights.furnidataReason) : LocalizeText(`furni.editor.side.furnidata.${furnidataState}`);

    const jump = (query: string) => {
        setJumpQuery(query);

        const needle = query.trim().toLowerCase();

        if (!needle) return;

        const label = (field: EditField) => LocalizeText(fieldLabelKey(field)).toLowerCase();
        const match = EDITABLE_FIELDS.find((field) => label(field) === needle) ?? EDITABLE_FIELDS.find((field) => label(field).startsWith(needle));

        if (!match) return;

        setJumpQuery('');
        onJump(match);
    };

    return (
        <aside className="octane-furni-editor-side">
            <div className="octane-staff-row">
                <Link onClick={onBack}>{LocalizeText('furni.editor.side.back')}</Link>
            </div>
            <FurniEditorPreviewView key={item.id} item={item} length={form.length} modes={form.interactionModesCount} width={form.width} />
            <div className="octane-staff-row">
                <strong className="octane-furni-editor-grow octane-furni-editor-ellipsis" title={displayName}>
                    {displayName}
                </strong>
                <FurniEditorFurnidataFlagView state={furnidataState} />
            </div>
            <FurniEditorCopyValueView value={furniEditorText('furni.editor.side.identity', { classname: item.itemName, id: item.id, sprite: item.spriteId })} />
            <table className="octane-staff-table octane-furni-editor-facts">
                <tbody>
                    <Fact label={LocalizeText('furni.editor.side.type')}>
                        {LocalizeText(item.type === 's' ? 'furni.editor.type.floor' : 'furni.editor.type.wall')}
                    </Fact>
                    <Fact label={LocalizeText('furni.editor.side.catalogue')}>
                        <Link onClick={() => onGroup('catalogue')}>
                            {catalogItems.length === 0
                                ? LocalizeText('furni.editor.side.catalogue.none')
                                : furniEditorText('furni.editor.side.catalogue.offers', { count: catalogItems.length })}
                        </Link>
                    </Fact>
                    <Fact label={LocalizeText('furni.editor.side.placed')}>{item.usageCount}</Fact>
                    {suggestions.length > 0 && (
                        <Fact label={LocalizeText('furni.editor.side.suggestions')}>
                            <Link onClick={() => onJump(suggestions[0].field)}>{suggestions.length}</Link>
                            {suggestions.length > 1 && (
                                <>
                                    {' '}
                                    <Link onClick={actions.applyAllSuggestions}>{LocalizeText('furni.editor.side.apply_all')}</Link>
                                </>
                            )}
                        </Fact>
                    )}
                    {warnings.length > 0 && (
                        <Fact label={LocalizeText('furni.editor.side.warnings')} tone="warning">
                            <Link onClick={() => onJump(warnings[0].field)}>{warnings.length}</Link>
                        </Fact>
                    )}
                    {duplicates.length > 0 && (
                        <Fact label={LocalizeText('furni.editor.side.duplicates')} tone="warning">
                            <Link onClick={() => onGroup('data')}>{duplicates.length}</Link>
                        </Fact>
                    )}
                    {related.siblings.length > 0 && (
                        <Fact label={LocalizeText('furni.editor.side.siblings')}>
                            <Link onClick={() => onGroup('data')}>{related.siblings.length}</Link>
                        </Fact>
                    )}
                    {furnidataIdMismatch !== null && (
                        <Fact label={LocalizeText('furni.editor.side.furnidata_id')} tone="warning">
                            <Link
                                title={furniEditorText('furni.editor.data.id_mismatch', { entryId: furnidataIdMismatch, spriteId: item.spriteId })}
                                onClick={() => onGroup('data')}
                            >
                                {furniEditorText('furni.editor.side.furnidata_id.value', { entryId: furnidataIdMismatch })}
                            </Link>
                        </Fact>
                    )}
                    <Fact label={LocalizeText('furni.editor.side.assets')}>
                        {(['icon', 'bundle'] as const).map((kind) => {
                            const state: AssetPresence | null = assets ? assets[kind] : null;
                            const url = assets ? (kind === 'icon' ? assets.iconUrl : assets.bundleUrl) : '';

                            return (
                                <span
                                    key={kind}
                                    className={`octane-staff-flag ${state ? ASSET_TONE[state] : 'is-muted'} octane-furni-editor-asset`}
                                    title={`${LocalizeText(`furni.editor.side.assets.${state ?? 'checking'}`)}${url ? `: ${url}` : ''}`}
                                >
                                    {LocalizeText(`furni.editor.side.assets.${kind}`)}
                                </span>
                            );
                        })}
                    </Fact>
                    {interactionUnregistered && (
                        <Fact label={LocalizeText('furni.editor.side.interaction')} tone="warning">
                            <Link onClick={() => onGroup('behaviour')}>{LocalizeText('furni.editor.side.interaction.no_class')}</Link>
                        </Fact>
                    )}
                    <Fact label={LocalizeText('furni.editor.side.furnidata')}>
                        <Link onClick={() => onGroup('data')}>{furnidataStatus}</Link>
                    </Fact>
                </tbody>
            </table>
            {isDirty && (
                <div className="octane-furni-editor-unsaved">
                    <strong>{furniEditorText('furni.editor.side.unsaved', { count: changedFields.length })}</strong>
                    <ul>
                        {changedFields.map((field) => (
                            <li key={field}>
                                <Link onClick={() => onJump(field)}>{LocalizeText(fieldLabelKey(field))}</Link> {formatFurniEditorValue(stored[field])} →{' '}
                                {formatFurniEditorValue(form[field])}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <input
                aria-label={LocalizeText('furni.editor.side.jump')}
                list="furni-editor-fields"
                placeholder={LocalizeText('furni.editor.side.jump')}
                type="text"
                value={jumpQuery}
                onChange={(event) => jump(event.target.value)}
            />
            <datalist id="furni-editor-fields">
                {EDITABLE_FIELDS.map((field) => (
                    <option key={field} value={LocalizeText(fieldLabelKey(field))} />
                ))}
            </datalist>
            <div className="octane-furni-editor-actions">
                <Button disabled={isBusy || !isValid || !isDirty} fullWidth variant="primary" onClick={actions.save}>
                    {isDirty ? furniEditorText('furni.editor.side.save_count', { count: changedFields.length }) : LocalizeText('furni.editor.side.save')}
                </Button>
                <div className="octane-staff-row">
                    {isDirty && (
                        <Button grow disabled={isBusy} variant="secondary" onClick={sheet.discard}>
                            {LocalizeText('furni.editor.side.discard')}
                        </Button>
                    )}
                    {rights.canDelete && (
                        <Button
                            grow
                            disabled={isBusy || item.usageCount > 0}
                            title={item.usageCount > 0 ? LocalizeText('furni.editor.side.delete.placed') : undefined}
                            variant="danger"
                            onClick={actions.remove}
                        >
                            {LocalizeText('furni.editor.side.delete')}
                        </Button>
                    )}
                </div>
                {sheet.canUndo && (
                    <Button disabled={isBusy} fullWidth title={LocalizeText('furni.editor.side.undo.tip')} variant="secondary" onClick={sheet.undoLastSave}>
                        {LocalizeText('furni.editor.side.undo')}
                    </Button>
                )}
                <span className="octane-staff-muted octane-furni-editor-center">{LocalizeText('furni.editor.side.shortcut')}</span>
            </div>
        </aside>
    );
};
