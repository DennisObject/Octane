import { Dispatch, FC, useRef, useState } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { localizeOr } from '../state/localize';
import { serializeTilemap } from '../state/encoding';
import { FloorplanAction, FloorplanState } from '../state/types';
import { FloorplanCenteredText, FloorplanNativeText } from './FloorplanNativeText';
import { FloorplanSkinScrollbar } from './FloorplanSkinScrollbar';

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
    const dataRef = useRef<HTMLTextAreaElement>(null);

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
            {showLoad ? (
                <OctaneCardHeaderView headerText={LocalizeText('floor.plan.editor.import.export')} onCloseClick={onClose} />
            ) : (
                <div className="octane-card-header-shell">
                    <span className="octane-card-title">
                        <FloorplanCenteredText background={0x377998} color={0xffffff} text={LocalizeText('floor.plan.editor.import.export')} textStyle="u_frame_title" width={377} />
                    </span>
                    <button aria-label={LocalizeText('generic.close')} className="octane-card-close-button" type="button" onClick={onClose} />
                </div>
            )}
            <OctaneCardContentView overflow="hidden" className="fp-bc-import">
                <textarea ref={dataRef} className="fp-bc-import-data" name="data" value={raw} spellCheck={false} onChange={(event) => setRaw(event.target.value)} />
                {!showLoad && (
                    <>
                        <FloorplanSkinScrollbar scrollerRef={dataRef} axis="vertical" slot={17} className="fp-bc-import-vbar" testId="import-scroll-vertical" />
                        <FloorplanSkinScrollbar scrollerRef={dataRef} axis="horizontal" slot={17} className="fp-bc-import-hbar" testId="import-scroll-horizontal" />
                    </>
                )}
                <button type="button" className="fp-bc-btn fp-bc-import-revert" data-testid="import-revert" onClick={() => setRaw(onRevertText())}>
                    {showLoad ? localizeOr('floor.plan.editor.revert.to.last.received.map', 'Revert') : <span className="fp-bc-import-label"><FloorplanNativeText background={0xffffff} color={0x000000} style={{ mixBlendMode: 'multiply' }} text={localizeOr('floor.plan.editor.revert.to.last.received.map', 'Revert')} size={10} textStyle="button_shiny_bold" /></span>}
                </button>
                {showLoad && (
                    <button type="button" className="fp-bc-btn is-extra" data-testid="import-load" onClick={load}>
                        Load
                    </button>
                )}
                <button type="button" className="fp-bc-btn fp-bc-import-save" data-testid="import-save" disabled={saveDisabled} onClick={save}>
                    {showLoad ? LocalizeText('floor.plan.editor.save') : <span className="fp-bc-import-label"><FloorplanNativeText background={0xffffff} color={0x000000} style={{ mixBlendMode: 'multiply', opacity: saveDisabled ? 0.5 : 1 }} text={LocalizeText('floor.plan.editor.save')} size={10} textStyle="button_shiny_bold" /></span>}
                </button>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
