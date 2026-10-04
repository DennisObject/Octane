import { FC, ReactNode } from 'react';
import { LocalizeText } from '../../../api';
import {
    EditField,
    EditForm,
    Expectation,
    fieldLabelKey,
    fieldTipKey,
    FormErrors,
    formatFurniEditorValue,
    furniEditorText,
    localizeFurniEditorText,
    NumberField,
    Suggestion,
    TextField
} from '../../../hooks/furni-editor';

/** What every field of the sheet reads and writes. */
export interface FurniEditorFieldContext {
    form: EditForm;
    stored: EditForm;
    errors: FormErrors;
    suggestions: Suggestion[];
    warnings: Expectation[];
    setField: <K extends EditField>(field: K, value: EditForm[K]) => void;
    applySuggestion: (suggestion: Suggestion) => void;
}

export const fieldInputId = (field: EditField) => `furni-editor-${field}`;

const isChanged = (fields: FurniEditorFieldContext, field: EditField) => !Object.is(fields.form[field], fields.stored[field]);

/** One-click suggestions and type warnings under a field. */
export const FurniEditorHintsView: FC<{ field: EditField; fields: FurniEditorFieldContext; showField?: boolean }> = ({ field, fields, showField = false }) => {
    const suggestions = fields.suggestions.filter((suggestion) => suggestion.field === field);
    const warnings = fields.warnings.filter((warning) => warning.field === field);

    if (!suggestions.length && !warnings.length) return null;

    return (
        <div className="octane-furni-editor-hints">
            {suggestions.map((suggestion) => (
                <button
                    key={`${suggestion.field}:${String(suggestion.value)}`}
                    className="octane-furni-editor-link"
                    title={localizeFurniEditorText(suggestion.reason)}
                    type="button"
                    onClick={() => fields.applySuggestion(suggestion)}
                >
                    {furniEditorText(showField ? 'furni.editor.hint.suggested_field' : 'furni.editor.hint.suggested', {
                        field: LocalizeText(fieldLabelKey(field)),
                        value: formatFurniEditorValue(suggestion.value),
                        reason: localizeFurniEditorText(suggestion.reason)
                    })}
                </button>
            ))}
            {warnings.map((warning) => (
                <span key={warning.field} className="octane-furni-editor-warning" role="note">
                    {localizeFurniEditorText(warning.message)}
                </span>
            ))}
        </div>
    );
};

interface FurniEditorFieldViewProps {
    field: EditField;
    fields: FurniEditorFieldContext;
    className?: string;
    children: ReactNode;
}

/** Label (with the field tip), a "was X" revert link once changed, the input, its error and hints. */
export const FurniEditorFieldView: FC<FurniEditorFieldViewProps> = ({ field, fields, className = '', children }) => {
    const tipKey = fieldTipKey(field);
    const changed = isChanged(fields, field);
    const error = fields.errors[field];
    const label = LocalizeText(fieldLabelKey(field));

    return (
        <div className={`octane-staff-field octane-furni-editor-field ${changed ? 'is-changed' : ''} ${error ? 'is-invalid' : ''} ${className}`}>
            <div className="octane-staff-row">
                <label className="octane-staff-field-label" htmlFor={fieldInputId(field)} title={tipKey ? LocalizeText(tipKey) : undefined}>
                    {label}
                    {tipKey && <span className="octane-furni-editor-tip"> (?)</span>}
                </label>
                {changed && (
                    <button
                        aria-label={furniEditorText('furni.editor.field.revert', { field: label })}
                        className="octane-furni-editor-link octane-furni-editor-revert"
                        title={LocalizeText('furni.editor.field.revert.tip')}
                        type="button"
                        onClick={() => fields.setField(field, fields.stored[field])}
                    >
                        {furniEditorText('furni.editor.field.was', { value: formatFurniEditorValue(fields.stored[field]) })}
                    </button>
                )}
            </div>
            {children}
            {error && <span className="octane-staff-error-text">{localizeFurniEditorText(error)}</span>}
            <FurniEditorHintsView field={field} fields={fields} />
        </div>
    );
};

interface NumberFieldProps {
    field: NumberField;
    fields: FurniEditorFieldContext;
    min?: number;
    max?: number;
    step?: number;
}

/** A cleared number input holds NaN, which the validation reports instead of saving 0. */
export const FurniEditorNumberFieldView: FC<NumberFieldProps> = ({ field, fields, min, max, step = 1 }) => {
    const value = fields.form[field];

    return (
        <FurniEditorFieldView field={field} fields={fields}>
            <input
                aria-invalid={!!fields.errors[field]}
                id={fieldInputId(field)}
                inputMode={step === 1 ? 'numeric' : 'decimal'}
                max={max}
                min={min}
                step={step}
                type="number"
                value={Number.isFinite(value) ? value : ''}
                onChange={(event) => fields.setField(field, event.target.value === '' ? NaN : Number(event.target.value))}
            />
        </FurniEditorFieldView>
    );
};

interface TextFieldProps {
    field: TextField;
    fields: FurniEditorFieldContext;
    maxLength: number;
    className?: string;
}

export const FurniEditorTextFieldView: FC<TextFieldProps> = ({ field, fields, maxLength, className = '' }) => (
    <FurniEditorFieldView className={className} field={field} fields={fields}>
        <input
            aria-invalid={!!fields.errors[field]}
            id={fieldInputId(field)}
            maxLength={maxLength}
            spellCheck={false}
            type="text"
            value={fields.form[field]}
            onChange={(event) => fields.setField(field, event.target.value)}
        />
    </FurniEditorFieldView>
);
