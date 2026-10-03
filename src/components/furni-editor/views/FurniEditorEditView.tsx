import { FC, KeyboardEvent } from 'react';
import {
    EditField,
    EditForm,
    FIELD_GROUP,
    FurnidataDraftApi,
    FurniEditorDetail,
    FurniEditorFormApi,
    FurniEditorGroup,
    useFurniEditorInsights,
    useFurniEditorSheetActions,
    useFurniEditorState,
    useFurniEditorUiStore
} from '../../../hooks/furni-editor';
import { FurniEditorBehaviourView } from './FurniEditorBehaviourView';
import { FurniEditorCatalogueView } from './FurniEditorCatalogueView';
import { FurniEditorDataView } from './FurniEditorDataView';
import { fieldInputId, FurniEditorFieldContext } from './FurniEditorFieldView';
import { FurniEditorNamesView } from './FurniEditorNamesView';
import { FurniEditorPlacementView } from './FurniEditorPlacementView';
import { FurniEditorSidebarView } from './FurniEditorSidebarView';

interface FurniEditorEditViewProps {
    detail: FurniEditorDetail;
    group: FurniEditorGroup;
    form: EditForm;
    stored: EditForm;
    sheet: FurniEditorFormApi;
    draft: FurnidataDraftApi;
    onOpen: (id: number) => void;
    onBack: () => void;
}

export const FurniEditorEditView: FC<FurniEditorEditViewProps> = ({ detail, group, form, stored, sheet, draft, onOpen, onBack }) => {
    const { interactions, relatedItems, pendingMutation, isImporting } = useFurniEditorState();
    const setTab = useFurniEditorUiStore((state) => state.setTab);
    const insights = useFurniEditorInsights(detail, form, stored, interactions, relatedItems);
    const actions = useFurniEditorSheetActions(detail, form, stored, sheet, draft, insights);
    const isBusy = pendingMutation !== null;
    const { item } = detail;
    const displayName = draft.name || item.publicName || item.itemName;

    const fields: FurniEditorFieldContext = {
        form,
        stored,
        errors: sheet.errors,
        suggestions: insights.suggestions,
        warnings: insights.warnings,
        setField: sheet.setField,
        applySuggestion: actions.applySuggestion
    };

    // Groups stay mounted and only toggle visibility, so a field can be
    // focused right after its group is switched in.
    const jumpToField = (field: EditField) => {
        setTab(FIELD_GROUP[field]);
        window.setTimeout(() => document.getElementById(fieldInputId(field))?.focus(), 0);
    };

    // Ctrl+S saves while focus is inside the sheet; it never fires for chat or another window.
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;

        event.preventDefault();

        if (!isBusy) actions.save();
    };

    const pane = (id: FurniEditorGroup) => `octane-furni-editor-group ${group === id ? '' : 'is-hidden'}`;

    return (
        <div className="octane-furni-editor-sheet" onKeyDown={onKeyDown}>
            <FurniEditorSidebarView
                actions={actions}
                detail={detail}
                displayName={displayName}
                form={form}
                insights={insights}
                isBusy={isBusy}
                sheet={sheet}
                stored={stored}
                onBack={onBack}
                onGroup={setTab}
                onJump={jumpToField}
            />
            <div className="octane-furni-editor-pane">
                <div className={pane('names')}>
                    <FurniEditorNamesView actions={actions} draft={draft} insights={insights} isBusy={isBusy} isImporting={isImporting} item={item} />
                </div>
                <div className={pane('behaviour')}>
                    <FurniEditorBehaviourView fields={fields} insights={insights} interactions={interactions} />
                </div>
                <div className={pane('placement')}>
                    <FurniEditorPlacementView fields={fields} />
                </div>
                <div className={pane('catalogue')}>
                    <FurniEditorCatalogueView catalogItems={detail.catalogItems} />
                </div>
                <div className={pane('data')}>
                    <FurniEditorDataView actions={actions} detail={detail} insights={insights} isBusy={isBusy} onOpen={onOpen} />
                </div>
            </div>
        </div>
    );
};
