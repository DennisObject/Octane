import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Button, StaffSection } from '../../../common';
import { FurniDetail, FurnidataDraftApi, FurniEditorInsights, FurniEditorSheetActions, furniEditorText, localizeFurniEditorText } from '../../../hooks/furni-editor';
import { FurniEditorCopyValueView } from './FurniEditorCopyValueView';
import { furnidataReasonText, FurniEditorFurnidataFlagView } from './FurniEditorFurnidataFlagView';

/** Furnidata names cap (FurnitureTextProvider sanitises again on the server). */
const FURNIDATA_TEXT_MAX = 256;

interface FurniEditorNamesViewProps {
    item: FurniDetail;
    draft: FurnidataDraftApi;
    insights: FurniEditorInsights;
    actions: FurniEditorSheetActions;
    isBusy: boolean;
    isImporting: boolean;
}

export const FurniEditorNamesView: FC<FurniEditorNamesViewProps> = ({ item, draft, insights, actions, isBusy, isImporting }) => {
    const { furnidataState } = insights;
    const isEditable = furnidataState === 'editable';
    const isCreatable = furnidataState === 'creatable';

    return (
        <>
            <StaffSection title={LocalizeText('furni.editor.names.title')}>
                <div className="octane-staff-row">
                    <FurniEditorFurnidataFlagView state={furnidataState} />
                    {isEditable && draft.isDirty && <span className="octane-furni-editor-warning">{LocalizeText('furni.editor.names.unsaved')}</span>}
                </div>
                {furnidataState === 'locked' ? (
                    <p className="octane-staff-muted">{furniEditorText('furni.editor.names.locked', { reason: furnidataReasonText(insights.furnidataReason) })}</p>
                ) : (
                    <>
                        <div className="octane-staff-grid">
                            <label className="octane-staff-field">
                                <span className="octane-staff-field-label">{LocalizeText('furni.editor.names.display_name')}</span>
                                <input
                                    maxLength={FURNIDATA_TEXT_MAX}
                                    placeholder={isCreatable ? item.publicName || item.itemName : undefined}
                                    type="text"
                                    value={draft.name}
                                    onChange={(event) => draft.setName(event.target.value)}
                                />
                            </label>
                            <label className="octane-staff-field">
                                <span className="octane-staff-field-label">{LocalizeText('furni.editor.names.description')}</span>
                                <input
                                    maxLength={FURNIDATA_TEXT_MAX}
                                    type="text"
                                    value={draft.description}
                                    onChange={(event) => draft.setDescription(event.target.value)}
                                />
                            </label>
                        </div>
                        <div className="octane-staff-row">
                            <Button disabled={isBusy || (isEditable && !draft.isDirty)} variant="primary" onClick={actions.saveFurnidata}>
                                {LocalizeText(isEditable ? 'furni.editor.names.save' : 'furni.editor.names.create')}
                            </Button>
                            {isEditable && (
                                <>
                                    <Button disabled={isBusy} variant="secondary" onClick={actions.revert}>
                                        {LocalizeText('furni.editor.names.revert')}
                                    </Button>
                                    <Button
                                        className="octane-furni-editor-push"
                                        disabled={isBusy || isImporting}
                                        title={LocalizeText('furni.editor.names.import.tip')}
                                        variant="secondary"
                                        onClick={actions.importFromHabbo}
                                    >
                                        {LocalizeText(isImporting ? 'furni.editor.names.import.pending' : 'furni.editor.names.import')}
                                    </Button>
                                </>
                            )}
                        </div>
                        {isCreatable && <p className="octane-staff-muted">{LocalizeText('furni.editor.names.create.hint')}</p>}
                        {draft.importNote && <p className="octane-staff-muted">{localizeFurniEditorText(draft.importNote)}</p>}
                    </>
                )}
            </StaffSection>
            <StaffSection title={LocalizeText('furni.editor.basic.title')}>
                <div className="octane-staff-grid">
                    <div className="octane-staff-field">
                        <span className="octane-staff-field-label">{LocalizeText('furni.editor.basic.classname')}</span>
                        <FurniEditorCopyValueView value={item.itemName} />
                    </div>
                    <div className="octane-staff-field">
                        <span className="octane-staff-field-label">{LocalizeText('furni.editor.basic.public_name')}</span>
                        <FurniEditorCopyValueView value={item.publicName} />
                        {insights.canSyncPublicName && (
                            <Button disabled={isBusy} variant="secondary" onClick={actions.syncName}>
                                {LocalizeText('furni.editor.basic.sync_name')}
                            </Button>
                        )}
                    </div>
                    <div className="octane-staff-field">
                        <span className="octane-staff-field-label">{LocalizeText('furni.editor.basic.sprite_id')}</span>
                        <FurniEditorCopyValueView value={item.spriteId} />
                    </div>
                    <div className="octane-staff-field">
                        <span className="octane-staff-field-label">{LocalizeText('furni.editor.basic.type')}</span>
                        <FurniEditorCopyValueView value={LocalizeText(item.type === 's' ? 'furni.editor.type.floor_code' : 'furni.editor.type.wall_code')} />
                    </div>
                </div>
            </StaffSection>
        </>
    );
};
