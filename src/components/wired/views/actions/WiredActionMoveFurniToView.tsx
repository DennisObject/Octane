import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { WiredLegacySlider as Slider } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES } from '../WiredSourcesSelector';
import { useWiredFurniTargets } from '../../../../hooks/wired/useWiredFurniTargets';
import { WiredActionBaseView } from './WiredActionBaseView';

const directionOptions = [{ value: 0, icon: 'ne' }, { value: 2, icon: 'se' }, { value: 4, icon: 'sw' }, { value: 6, icon: 'nw' }];

// The second picker uses source 100 and stores its furniture ids in stringData.
const TARGET_FURNI_SOURCES = FURNI_SOURCES.map(option => option.value === 100
    ? { value: 100, label: 'wiredfurni.params.sources.furni.101' } : option);

export const WiredActionMoveFurniToView: FC<{}> = () => {
    const { trigger, setIntParams, setStringParam } = useWired();
    const [spacing, setSpacing] = useState(1);
    const [movement, setMovement] = useState(0);
    const [separateMovers, setSeparateMovers] = useState(false);
    const [moveSource, setMoveSource] = useState(100);
    const [targetSource, setTargetSource] = useState(100);
    const picks = useWiredFurniTargets(separateMovers ? moveSource === 100 : targetSource === 100, separateMovers && targetSource === 100);

    useEffect(() => {
        if (!trigger) return;
        const fields = trigger.intData;
        const separate = fields.length === 4;
        setSeparateMovers(separate);
        setMovement(fields[0] ?? 0);
        setSpacing(fields[1] ?? 1);
        setMoveSource(separate ? fields[2] : 0);
        setTargetSource(fields[separate ? 3 : 2] ?? (trigger.selectedItems?.length ? 100 : 0));
    }, [trigger]);

    const changeMode = (separate: boolean) => {
        const ids = picks.currentIds();
        // In the old editor primary picks are targets, so keep that role when opting into separate movers.
        picks.replace(separate ? [] : ids.target, separate ? ids.move : []);
        setMoveSource(separate ? 100 : 0);
        setSeparateMovers(separate);
    };

    const save = () => {
        if (separateMovers) {
            picks.save();
            setIntParams([movement, spacing, moveSource, targetSource]);
        } else {
            const ids = picks.currentIds();
            picks.replace(ids.move, ids.target);
            setStringParam(trigger?.stringData ?? '');
            setIntParams([movement, spacing, targetSource]);
        }
    };
    const limit = trigger?.maximumItemSelectionCount ?? 0;

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save}
            selectionPreview={
                <div className="flex flex-col gap-2">
                    <WiredFurniSelectionSourceRow title={separateMovers ? 'wiredfurni.params.sources.furni.title.mv.0' : 'wiredfurni.params.sources.furni.title.mv.1'}
                        options={FURNI_SOURCES} value={separateMovers ? moveSource : targetSource} selectionKind="primary"
                        selectionActive={picks.selection === 'move'} selectionCount={picks.moveIds.length}
                        selectionLimit={limit} selectionEnabledValues={[100]} onChange={separateMovers ? setMoveSource : setTargetSource}
                        onSelectionActivate={() => picks.activate('move')} />
                    {separateMovers && <WiredFurniSelectionSourceRow title="wiredfurni.params.sources.furni.title.mv.1"
                        options={TARGET_FURNI_SOURCES} value={targetSource} selectionKind="secondary"
                        selectionActive={picks.selection === 'target'} selectionCount={picks.targetIds.length}
                        selectionLimit={limit} selectionEnabledValues={[100]} onChange={setTargetSource}
                        onSelectionActivate={() => picks.activate('target')} />}
                </div>
            }>
            <label className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.moveto.movers', 'Furniture to move')}</Text>
                <select className="form-select" value={separateMovers ? 'separate' : 'trigger'} onChange={event => changeMode(event.target.value === 'separate')}>
                    <option value="trigger">{localizeWithFallback('wiredfurni.params.moveto.trigger', 'Triggering furniture')}</option>
                    <option value="separate">{localizeWithFallback('wiredfurni.params.moveto.separate', 'Choose movers and target separately')}</option>
                </select>
            </label>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.emptytiles', ['tiles'], [spacing.toString()])}</Text>
                <Slider max={5} min={1} value={spacing} onChange={setSpacing} />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.movefurni', LocalizeText('wiredfurni.params.startdir'))}</Text>
                <div className="flex gap-1">
                    {directionOptions.map(value => <label key={value.value} className="flex items-center gap-1">
                        <input checked={movement === value.value} className="form-check-input" name="movement" type="radio" onChange={() => setMovement(value.value)} />
                        <Text><i className={`icon icon-${value.icon}`} /></Text>
                    </label>)}
                </div>
            </div>
        </WiredActionBaseView>
    );
};
