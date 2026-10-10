import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { StaffSection } from '../../../common';
import { FurniEditorInsights, furniEditorText, localizeFurniEditorText } from '../../../hooks/furni-editor';
import { fieldInputId, FurniEditorFieldContext, FurniEditorFieldView, FurniEditorNumberFieldView, FurniEditorTextFieldView } from './FurniEditorFieldView';
import { FurniEditorInteractionPickerView } from './FurniEditorInteractionPickerView';

interface FurniEditorBehaviourViewProps {
    fields: FurniEditorFieldContext;
    insights: FurniEditorInsights;
    interactions: string[];
}

export const FurniEditorBehaviourView: FC<FurniEditorBehaviourViewProps> = ({ fields, insights, interactions }) => {
    const { suggestedType, interactionUnregistered } = insights;

    return (
        <>
            <StaffSection title={LocalizeText('furni.editor.behaviour.interaction')}>
                <div className="volt-furni-editor-grid-3">
                    <FurniEditorFieldView className="volt-furni-editor-span-2" field="interactionType" fields={fields}>
                        <FurniEditorInteractionPickerView
                            id={fieldInputId('interactionType')}
                            options={interactions}
                            value={fields.form.interactionType}
                            onChange={(value) => fields.setField('interactionType', value)}
                        />
                        {suggestedType && (
                            <button
                                className="volt-furni-editor-link"
                                title={localizeFurniEditorText(suggestedType.reason)}
                                type="button"
                                onClick={() => fields.setField('interactionType', suggestedType.type)}
                            >
                                {furniEditorText('furni.editor.hint.suggested', {
                                    value: suggestedType.type,
                                    reason: localizeFurniEditorText(suggestedType.reason)
                                })}
                            </button>
                        )}
                        {interactionUnregistered && (
                            <span className="volt-furni-editor-warning" role="note">
                                {LocalizeText('furni.editor.behaviour.unregistered')}
                            </span>
                        )}
                    </FurniEditorFieldView>
                    <FurniEditorNumberFieldView field="interactionModesCount" fields={fields} max={100} min={0} />
                </div>
                <div className="volt-furni-editor-grid-3">
                    <FurniEditorTextFieldView field="vendingIds" fields={fields} maxLength={255} />
                    <FurniEditorTextFieldView field="multiheight" fields={fields} maxLength={50} />
                    {/* One effect id for both genders on this hotel; the female id follows it. */}
                    <FurniEditorNumberFieldView field="effectIdMale" fields={fields} max={999} min={0} />
                </div>
                {/* Custom params and walk clothing have no column on this hotel and are always empty. */}
            </StaffSection>
        </>
    );
};
