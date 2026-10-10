import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Button, StaffSection } from '../../../common';
import {
    formatFurniEditorValue,
    FurniEditorDetail,
    FurniEditorInsights,
    FurniEditorRights,
    FurniEditorSheetActions,
    furniEditorText,
    interpretFurniEditorMessage,
    localizeFurniEditorText
} from '../../../hooks/furni-editor';
import { furnidataReasonText } from './FurniEditorFurnidataFlagView';
import { FurniEditorRelatedView } from './FurniEditorRelatedView';

interface FurniEditorDataViewProps {
    detail: FurniEditorDetail;
    insights: FurniEditorInsights;
    actions: FurniEditorSheetActions;
    isBusy: boolean;
    rights: FurniEditorRights;
    onOpen: (id: number) => void;
}

// The diagnostic reuses the server sentences; an unknown one reads as it is.
const diagnosticMessage = (message: string): string => {
    const mapped = interpretFurniEditorMessage(message);

    return mapped ? localizeFurniEditorText(mapped.text) : '';
};

/** Furnidata structure and resolution, plus the furni that share this line or duplicate it. */
export const FurniEditorDataView: FC<FurniEditorDataViewProps> = ({ detail, insights, actions, isBusy, rights, onOpen }) => {
    const { item, furniDataEntry: entry, furniDataDiagnostic: diagnostic } = detail;
    const { structureDiff, furnidataIdMismatch, furnidataState } = insights;

    return (
        <>
            {entry && (
                <StaffSection title={LocalizeText('furni.editor.data.structure')}>
                    {structureDiff.length === 0 ? (
                        <p className="volt-staff-muted">
                            {LocalizeText(furnidataState === 'editable' ? 'furni.editor.data.structure.in_sync' : 'furni.editor.data.structure.no_match')}
                        </p>
                    ) : (
                        <>
                            <p className="volt-staff-muted">{LocalizeText('furni.editor.data.structure.hint')}</p>
                            <table className="volt-staff-table">
                                <tbody>
                                    {structureDiff.map((row) => (
                                        <tr key={row.key}>
                                            <td>{row.key}</td>
                                            <td className="volt-staff-muted">{formatFurniEditorValue(row.from)}</td>
                                            <td>{formatFurniEditorValue(row.to)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {rights.canEditFurnidata ? (
                                <div className="volt-staff-row">
                                    <Button disabled={isBusy} variant="secondary" onClick={actions.writeStructure}>
                                        {LocalizeText('furni.editor.data.structure.write')}
                                    </Button>
                                </div>
                            ) : (
                                <p className="volt-staff-muted">{LocalizeText('furni.editor.names.no_right')}</p>
                            )}
                        </>
                    )}
                </StaffSection>
            )}
            {furnidataIdMismatch !== null && (
                <p className="volt-furni-editor-warning" role="note">
                    {furniEditorText('furni.editor.data.id_mismatch', { entryId: furnidataIdMismatch, spriteId: item.spriteId })}
                </p>
            )}
            <FurniEditorRelatedView duplicates={insights.duplicates} siblings={insights.related.siblings} onOpen={onOpen} />
            {entry && (
                <details className="volt-furni-editor-details">
                    <summary>{LocalizeText('furni.editor.data.entry')}</summary>
                    <p className="volt-staff-muted">{LocalizeText('furni.editor.data.entry.hint')}</p>
                    <pre className="volt-furni-editor-code">{JSON.stringify(entry, null, 2)}</pre>
                </details>
            )}
            <details className="volt-furni-editor-details">
                <summary>{LocalizeText('furni.editor.data.resolution')}</summary>
                <table className="volt-staff-table">
                    <tbody>
                        <tr>
                            <th>{LocalizeText('furni.editor.data.resolution.reason')}</th>
                            <td>{furnidataReasonText(insights.furnidataReason)}</td>
                        </tr>
                        <tr>
                            <th>{LocalizeText('furni.editor.data.resolution.source')}</th>
                            <td className="volt-furni-editor-break">{diagnostic?.sourcePath || LocalizeText('furni.editor.data.resolution.unresolved')}</td>
                        </tr>
                        {diagnostic?.sourceStatus && (
                            <tr>
                                <th>{LocalizeText('furni.editor.data.resolution.status')}</th>
                                <td>{diagnostic.sourceStatus}</td>
                            </tr>
                        )}
                        {diagnostic?.message && (
                            <tr>
                                <th>{LocalizeText('furni.editor.data.resolution.message')}</th>
                                <td className="volt-furni-editor-break">{diagnosticMessage(diagnostic.message)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </details>
        </>
    );
};
