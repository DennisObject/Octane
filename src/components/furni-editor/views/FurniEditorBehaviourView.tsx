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
                <div className="octane-furni-editor-grid-3">
                    <FurniEditorFieldView className="octane-furni-editor-span-2" field="interactionType" fields={fields}>
                        <FurniEditorInteractionPickerView
                            id={fieldInputId('interactionType')}
                            options={interactions}
                            value={fields.form.interactionType}
                            onChange={(value) => fields.setField('interactionType', value)}
                        />
                        {suggestedType && (
                            <button
                                className="octane-furni-editor-link"
                                title={localizeFurniEditorText(suggestedType.reason)}
                                type="button"
                                onClick={() => fields.setField('interactionType', suggestedType.type)}
                            >
                                {furniEditorText('furni.editor.hint.suggested', { value: suggestedType.type, reason: localizeFurniEditorText(suggestedType.reason) })}
                            </button>
                        )}
                        {interactionUnregistered && (
                            <span className="octane-furni-editor-warning" role="note">
                                {LocalizeText('furni.editor.behaviour.unregistered')}
                            </span>
                        )}
                    </FurniEditorFieldView>
                    <FurniEditorNumberFieldView field="interactionModesCount" fields={fields} max={100} min={0} />
                </div>
                <FurniEditorTextFieldView field="customparams" fields={fields} maxLength={256} />
                <div className="octane-staff-grid">
                    <FurniEditorTextFieldView field="vendingIds" fields={fields} maxLength={255} />
                    <FurniEditorTextFieldView field="multiheight" fields={fields} maxLength={50} />
                </div>
            </StaffSection>
            <StaffSection title={LocalizeText('furni.editor.behaviour.effects')}>
                <div className="octane-furni-editor-grid-3">
                    <FurniEditorNumberFieldView field="effectIdMale" fields={fields} min={0} />
                    <FurniEditorNumberFieldView field="effectIdFemale" fields={fields} min={0} />
                    <FurniEditorTextFieldView field="clothingOnWalk" fields={fields} maxLength={255} />
                </div>
            </StaffSection>
        </>
    );
};
