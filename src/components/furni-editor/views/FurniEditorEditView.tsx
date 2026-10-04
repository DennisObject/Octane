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
    useFurniEditorRights,
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
    const { interactions, relatedItems, pendingMutation, writeBlock, isImporting, importUnavailable, isLoadingDetail } = useFurniEditorState();
    const setTab = useFurniEditorUiStore((state) => state.setTab);
    const insights = useFurniEditorInsights(detail, form, stored, interactions, relatedItems);
    const rights = useFurniEditorRights();
    const actions = useFurniEditorSheetActions(detail, form, stored, sheet, draft, insights, rights);
    // While a furni loads (another one, or the re-read after a save) the sheet
    // is locked, so nothing typed there is silently replaced by the answer.
    const isLocked = isLoadingDetail;
    // An unconfirmed write pauses every save until the server answers it or the socket reconnects.
    const isBusy = pendingMutation !== null || writeBlock !== null || isLocked;
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
    const onKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>) => {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;

        event.preventDefault();

        if (!isBusy) actions.save();
    };

    const pane = (id: FurniEditorGroup) => `octane-furni-editor-group ${group === id ? '' : 'is-hidden'}`;

    return (
        <fieldset aria-busy={isLocked} className="octane-furni-editor-sheet" disabled={isLocked} onKeyDown={onKeyDown}>
            <FurniEditorSidebarView
                actions={actions}
                detail={detail}
                displayName={displayName}
                form={form}
                insights={insights}
                isBusy={isBusy}
                rights={rights}
                sheet={sheet}
                stored={stored}
                onBack={onBack}
                onGroup={setTab}
                onJump={jumpToField}
            />
            <div className="octane-furni-editor-pane">
                <div className={pane('names')}>
                    <FurniEditorNamesView
                        actions={actions}
                        draft={draft}
                        insights={insights}
                        isBusy={isBusy}
                        importUnavailable={importUnavailable}
                        isImporting={isImporting}
                        item={item}
                        rights={rights}
                    />
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
                    <FurniEditorDataView actions={actions} detail={detail} insights={insights} isBusy={isBusy} rights={rights} onOpen={onOpen} />
                </div>
            </div>
        </fieldset>
    );
};
