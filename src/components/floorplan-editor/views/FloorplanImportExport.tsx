import { Dispatch, FC, useState } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { localizeOr } from '../state/localize';
import { serializeTilemap } from '../state/encoding';
import { FloorplanAction, FloorplanState } from '../state/types';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    onClose: () => void;
    onSaveFromText: (raw: string) => void;
    onRevertText: () => string;
    initialText?: string;
    saveDisabled?: boolean;
    showLoad?: boolean;
};

export const FloorplanImportExport: FC<Props> = ({ state, dispatch, onClose, onSaveFromText, onRevertText, initialText, saveDisabled = false, showLoad = false }) => {
    const [raw, setRaw] = useState(() => initialText ?? serializeTilemap(state.tiles));

    const load = () => {
        dispatch({ type: 'IMPORT_STRING', raw, source: 'local' });
        onClose();
    };

    const save = () => {
        if (saveDisabled) return;

        onSaveFromText(raw);
    };

    return (
        <OctaneCardView uniqueKey="floorplan-import-export" frameStyle={3} theme="primary" className="w-[379px] h-[374px]" classNames={['octane-floorplan-import', ...(!showLoad ? ['is-official'] : [])]} isResizable={false}>
            <OctaneCardHeaderView headerText={LocalizeText('floor.plan.editor.import.export')} onCloseClick={onClose} />
            <OctaneCardContentView overflow="hidden" className="fp-bc-import">
                <textarea className="fp-bc-import-data" name="data" value={raw} spellCheck={false} onChange={(event) => setRaw(event.target.value)} />
                <button type="button" className="fp-bc-btn fp-bc-import-revert" data-testid="import-revert" onClick={() => setRaw(onRevertText())}>
                    {localizeOr('floor.plan.editor.revert.to.last.received.map', 'Revert')}
                </button>
                {showLoad && (
                    <button type="button" className="fp-bc-btn is-extra" data-testid="import-load" onClick={load}>
                        Load
                    </button>
                )}
                <button type="button" className="fp-bc-btn fp-bc-import-save" data-testid="import-save" disabled={saveDisabled} onClick={save}>
                    {LocalizeText('floor.plan.editor.save')}
                </button>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
