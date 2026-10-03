import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { StaffSection } from '../../../common';
import { fieldLabelKey, PERMISSION_GROUPS } from '../../../hooks/furni-editor';
import { fieldInputId, FurniEditorFieldContext, FurniEditorHintsView, FurniEditorNumberFieldView } from './FurniEditorFieldView';

export const FurniEditorPlacementView: FC<{ fields: FurniEditorFieldContext }> = ({ fields }) => (
    <>
        <StaffSection title={LocalizeText('furni.editor.placement.dimensions')}>
            <div className="octane-furni-editor-grid-3">
                <FurniEditorNumberFieldView field="width" fields={fields} max={64} min={1} />
                <FurniEditorNumberFieldView field="length" fields={fields} max={64} min={1} />
                <FurniEditorNumberFieldView field="stackHeight" fields={fields} max={99.99} min={0} step={0.01} />
            </div>
        </StaffSection>
        <StaffSection title={LocalizeText('furni.editor.placement.permissions')}>
            {PERMISSION_GROUPS.map((group) => (
                <div key={group.labelKey} className="octane-staff-field">
                    <span className="octane-staff-field-label">{LocalizeText(group.labelKey)}</span>
                    <div className="octane-furni-editor-flags">
                        {group.fields.map((field) => (
                            <label
                                key={field}
                                className={`octane-staff-row octane-furni-editor-flag ${Object.is(fields.form[field], fields.stored[field]) ? '' : 'is-changed'}`}
                            >
                                <input
                                    checked={fields.form[field]}
                                    id={fieldInputId(field)}
                                    type="checkbox"
                                    onChange={(event) => fields.setField(field, event.target.checked)}
                                />
                                {LocalizeText(fieldLabelKey(field))}
                            </label>
                        ))}
                    </div>
                    {group.fields.map((field) => (
                        <FurniEditorHintsView key={field} showField field={field} fields={fields} />
                    ))}
                </div>
            ))}
        </StaffSection>
    </>
);
