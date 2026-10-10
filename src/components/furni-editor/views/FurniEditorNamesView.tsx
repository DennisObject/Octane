import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Button, StaffSection } from '../../../common';
import {
    FurniDetail,
    FurnidataDraftApi,
    FurniEditorInsights,
    FurniEditorRights,
    FurniEditorSheetActions,
    furniEditorText,
    localizeFurniEditorText
} from '../../../hooks/furni-editor';
import { FurniEditorCopyValueView } from './FurniEditorCopyValueView';
import { furnidataReasonText, FurniEditorFurnidataFlagView } from './FurniEditorFurnidataFlagView';

/** FurnidataEditPayload limits on PlusEMU; the server checks them again. */
const FURNIDATA_NAME_MAX = 100;
const FURNIDATA_DESCRIPTION_MAX = 512;

interface FurniEditorNamesViewProps {
    item: FurniDetail;
    draft: FurnidataDraftApi;
    insights: FurniEditorInsights;
    actions: FurniEditorSheetActions;
    isBusy: boolean;
    isImporting: boolean;
    /** The server said the import is not configured on this hotel. */
    importUnavailable: boolean;
    rights: FurniEditorRights;
}

export const FurniEditorNamesView: FC<FurniEditorNamesViewProps> = ({ item, draft, insights, actions, isBusy, isImporting, importUnavailable, rights }) => {
    const { furnidataState } = insights;
    const isEditable = furnidataState === 'editable';
    const canWrite = rights.canEditFurnidata && isEditable;

    return (
        <>
            <StaffSection title={LocalizeText('furni.editor.names.title')}>
                <div className="volt-staff-row">
                    <FurniEditorFurnidataFlagView state={furnidataState} />
                    {isEditable && draft.isDirty && <span className="volt-furni-editor-warning">{LocalizeText('furni.editor.names.unsaved')}</span>}
                </div>
                {furnidataState === 'unconfigured' && <p className="volt-staff-muted">{LocalizeText('furni.editor.names.unconfigured')}</p>}
                {furnidataState === 'locked' && (
                    <p className="volt-staff-muted">
                        {furniEditorText('furni.editor.names.locked', { reason: furnidataReasonText(insights.furnidataReason) })}
                    </p>
                )}
                {isEditable && !rights.canEditFurnidata && (
                    <>
                        <div className="volt-staff-grid">
                            <div className="volt-staff-field">
                                <span className="volt-staff-field-label">{LocalizeText('furni.editor.names.display_name')}</span>
                                <FurniEditorCopyValueView value={draft.storedName} />
                            </div>
                            <div className="volt-staff-field">
                                <span className="volt-staff-field-label">{LocalizeText('furni.editor.names.description')}</span>
                                <FurniEditorCopyValueView value={draft.storedDescription} />
                            </div>
                        </div>
                        <p className="volt-staff-muted">{LocalizeText('furni.editor.names.no_right')}</p>
                    </>
                )}
                {furnidataState === 'missing' && <p className="volt-staff-muted">{LocalizeText('furni.editor.names.missing')}</p>}
                {canWrite && (
                    <>
                        <div className="volt-staff-grid">
                            <label className="volt-staff-field">
                                <span className="volt-staff-field-label">{LocalizeText('furni.editor.names.display_name')}</span>
                                <input maxLength={FURNIDATA_NAME_MAX} type="text" value={draft.name} onChange={(event) => draft.setName(event.target.value)} />
                            </label>
                            <label className="volt-staff-field">
                                <span className="volt-staff-field-label">{LocalizeText('furni.editor.names.description')}</span>
                                <input
                                    maxLength={FURNIDATA_DESCRIPTION_MAX}
                                    type="text"
                                    value={draft.description}
                                    onChange={(event) => draft.setDescription(event.target.value)}
                                />
                            </label>
                        </div>
                        <div className="volt-staff-row">
                            <Button disabled={isBusy || !draft.isDirty} variant="primary" onClick={actions.saveFurnidata}>
                                {LocalizeText('furni.editor.names.save')}
                            </Button>
                            <Button disabled={isBusy} variant="secondary" onClick={actions.revert}>
                                {LocalizeText('furni.editor.names.revert')}
                            </Button>
                            {!importUnavailable && (
                                <Button
                                    className="volt-furni-editor-push"
                                    disabled={isBusy || isImporting}
                                    title={LocalizeText('furni.editor.names.import.tip')}
                                    variant="secondary"
                                    onClick={actions.importFromHabbo}
                                >
                                    {LocalizeText(isImporting ? 'furni.editor.names.import.pending' : 'furni.editor.names.import')}
                                </Button>
                            )}
                        </div>
                        {importUnavailable && <p className="volt-staff-muted">{LocalizeText('furni.editor.names.import.unconfigured')}</p>}
                        {draft.importNote && <p className="volt-staff-muted">{localizeFurniEditorText(draft.importNote)}</p>}
                    </>
                )}
            </StaffSection>
            <StaffSection title={LocalizeText('furni.editor.basic.title')}>
                <div className="volt-staff-grid">
                    <div className="volt-staff-field">
                        <span className="volt-staff-field-label">{LocalizeText('furni.editor.basic.classname')}</span>
                        <FurniEditorCopyValueView value={item.itemName} />
                    </div>
                    <div className="volt-staff-field">
                        <span className="volt-staff-field-label">{LocalizeText('furni.editor.basic.public_name')}</span>
                        <FurniEditorCopyValueView value={item.publicName} />
                        {insights.canSyncPublicName && rights.canEditFurnidata && (
                            <Button disabled={isBusy} variant="secondary" onClick={actions.syncName}>
                                {LocalizeText('furni.editor.basic.sync_name')}
                            </Button>
                        )}
                    </div>
                    <div className="volt-staff-field">
                        <span className="volt-staff-field-label">{LocalizeText('furni.editor.basic.sprite_id')}</span>
                        <FurniEditorCopyValueView value={item.spriteId} />
                    </div>
                    <div className="volt-staff-field">
                        <span className="volt-staff-field-label">{LocalizeText('furni.editor.basic.type')}</span>
                        <FurniEditorCopyValueView value={LocalizeText(item.type === 's' ? 'furni.editor.type.floor_code' : 'furni.editor.type.wall_code')} />
                    </div>
                </div>
            </StaffSection>
        </>
    );
};
