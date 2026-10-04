import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { StaffSection } from '../../../common';
import { furniEditorText, RelatedRow } from '../../../hooks/furni-editor';

interface FurniEditorRelatedViewProps {
    duplicates: RelatedRow[];
    siblings: RelatedRow[];
    onOpen: (id: number) => void;
}

// Rows are opened by their own id: duplicates usually share the sprite id,
// so a lookup by sprite could land on the furni already open.
export const FurniEditorRelatedView: FC<FurniEditorRelatedViewProps> = ({ duplicates, siblings, onOpen }) => (
    <>
        {duplicates.length > 0 && (
            <StaffSection title={furniEditorText('furni.editor.related.duplicates', { count: duplicates.length })}>
                <p className="octane-furni-editor-warning">{LocalizeText('furni.editor.related.duplicates.hint')}</p>
                <div className="octane-staff-list">
                    {duplicates.map((row) => (
                        <button key={row.id} className="octane-staff-list-row" type="button" onClick={() => onOpen(row.id)}>
                            <span className="octane-furni-editor-grow">{row.itemName}</span>
                            <span className="octane-staff-muted">{furniEditorText('furni.editor.related.ids', { id: row.id, sprite: row.spriteId })}</span>
                        </button>
                    ))}
                </div>
            </StaffSection>
        )}
        {siblings.length > 0 && (
            <StaffSection title={furniEditorText('furni.editor.related.siblings', { count: siblings.length })}>
                <p className="octane-staff-muted">{LocalizeText('furni.editor.related.siblings.hint')}</p>
                <div className="octane-staff-list">
                    {siblings.map((row) => (
                        <button key={row.id} className="octane-staff-list-row" type="button" onClick={() => onOpen(row.id)}>
                            <span className="octane-furni-editor-grow">{row.itemName}</span>
                            <span className="octane-staff-muted">
                                {furniEditorText('furni.editor.preview.footprint', { width: row.width, length: row.length })}
                            </span>
                            <span className="octane-staff-muted">{row.interactionType || LocalizeText('furni.editor.interaction.none')}</span>
                        </button>
                    ))}
                </div>
            </StaffSection>
        )}
    </>
);
