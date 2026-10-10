import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { FurnidataState } from '../../../hooks/furni-editor';

const FLAG_TONE: Record<FurnidataState, string> = {
    editable: 'is-ok',
    missing: 'is-muted',
    locked: 'is-danger',
    unconfigured: 'is-muted'
};

/** The emulator's furnidata resolution code (matched_id, not_found, ...) in words; an unknown code reads as itself. */
export const furnidataReasonText = (reason: string): string => {
    const key = `furni.editor.furnidata.reason.${reason}`;
    const text = LocalizeText(key);

    return text && text !== key ? text : reason.replace(/_/g, ' ');
};

export const FurniEditorFurnidataFlagView: FC<{ state: FurnidataState }> = ({ state }) => (
    <span className={`volt-staff-flag ${FLAG_TONE[state]}`} title={LocalizeText(`furni.editor.furnidata.flag.${state}.tip`)}>
        {LocalizeText(`furni.editor.furnidata.flag.${state}`)}
    </span>
);
