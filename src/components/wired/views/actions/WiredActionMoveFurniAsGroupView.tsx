import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { useWiredFurniTargets } from '../../../../hooks/wired/useWiredFurniTargets';
import { WiredActionBaseView } from './WiredActionBaseView';

// The second picker uses source 100 and stores its furniture ids in stringData.
const TARGET_FURNI_SOURCES = FURNI_SOURCES.map(option => option.value === 100
    ? { value: 100, label: 'wiredfurni.params.sources.furni.101' } : option);

export const WiredActionMoveFurniAsGroupView: FC<{}> = () => {
    const { trigger, setIntParams } = useWired();
    const [targetMode, setTargetMode] = useState(false);
    const [direction, setDirection] = useState(0);
    const [moveSource, setMoveSource] = useState(100);
    const [targetSource, setTargetSource] = useState(100);
    const [userSource, setUserSource] = useState(0);
    const [targetIsUser, setTargetIsUser] = useState(false);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const picks = useWiredFurniTargets(moveSource === 100, targetMode && !targetIsUser && targetSource === 100);

    useEffect(() => {
        if (!trigger) return;
        const fields = trigger.intData;
        const usesTarget = fields.length === 6;
        setTargetMode(usesTarget);
        setDirection(usesTarget ? 0 : fields[0] ?? 0);
        setMoveSource(usesTarget ? fields[3] : fields[1] ?? (trigger.selectedItems?.length ? 100 : 0));
        setTargetSource(usesTarget ? fields[4] : 100);
        setUserSource(usesTarget ? fields[5] : 0);
        setTargetIsUser(usesTarget && fields[0] === 1);
        setOffsetX(usesTarget ? fields[1] : 0);
        setOffsetY(usesTarget ? fields[2] : 0);
    }, [trigger]);

    const save = () => {
        if (targetMode) {
            picks.save();
            setIntParams([targetIsUser ? 1 : 0, offsetX, offsetY, moveSource, targetSource, userSource]);
        } else {
            const ids = picks.currentIds();
            picks.replace(ids.move, ids.target);
            setIntParams([direction, moveSource]);
        }
    };
    const limit = trigger?.maximumItemSelectionCount ?? 0;
    const offset = (value: string) => Math.max(-64, Math.min(64, Number.parseInt(value, 10) || 0));

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            selectionPreview={
                <div className="flex flex-col gap-2">
                    <WiredFurniSelectionSourceRow title="wiredfurni.params.sources.furni.title.mv.0"
                        options={FURNI_SOURCES} value={moveSource} selectionKind="primary"
                        selectionActive={picks.selection === 'move'} selectionCount={picks.moveIds.length}
                        selectionLimit={limit} selectionEnabledValues={[100]} onChange={setMoveSource}
                        onSelectionActivate={() => picks.activate('move')} />
                    {targetMode && !targetIsUser && <WiredFurniSelectionSourceRow title="wiredfurni.params.sources.furni.title.mv.1"
                        options={TARGET_FURNI_SOURCES} value={targetSource} selectionKind="secondary"
                        selectionActive={picks.selection === 'target'} selectionCount={picks.targetIds.length}
                        selectionLimit={limit} selectionEnabledValues={[100]} onChange={setTargetSource}
                        onSelectionActivate={() => picks.activate('target')} />}
                    {targetMode && targetIsUser && <WiredSourcesSelector showUsers={true} userSource={userSource}
                        allowClickedUserSource={true} onChangeUsers={setUserSource} />}
                </div>
            }
        >
            <label className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.group.mode', 'Group movement')}</Text>
                <select className="form-select" value={targetMode ? 'target' : 'step'} onChange={event => setTargetMode(event.target.value === 'target')}>
                    <option value="step">{localizeWithFallback('wiredfurni.params.group.step', 'Move one tile in a direction')}</option>
                    <option value="target">{localizeWithFallback('wiredfurni.params.group.target', 'Move group to a target')}</option>
                </select>
            </label>
            {targetMode ? <>
                <label className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.group.target_kind', 'Target')}</Text>
                    <select className="form-select" value={targetIsUser ? 'user' : 'furni'} onChange={event => setTargetIsUser(event.target.value === 'user')}>
                        <option value="furni">{localizeWithFallback('wiredfurni.params.group.target_furni', 'Furniture')}</option>
                        <option value="user">{localizeWithFallback('wiredfurni.params.group.target_user', 'User')}</option>
                    </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1"><Text>{localizeWithFallback('wiredfurni.params.group.offset_x', 'X offset (tiles)')}</Text>
                        <input className="form-control" type="number" min={-64} max={64} step={1} value={offsetX} onChange={event => setOffsetX(offset(event.target.value))} />
                    </label>
                    <label className="flex flex-col gap-1"><Text>{localizeWithFallback('wiredfurni.params.group.offset_y', 'Y offset (tiles)')}</Text>
                        <input className="form-control" type="number" min={-64} max={64} step={1} value={offsetY} onChange={event => setOffsetY(offset(event.target.value))} />
                    </label>
                </div>
            </> : <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.startdir')}</Text>
                <div className="grid grid-cols-4 gap-2 max-w-[240px]">
                    {WIRED_DIRECTION_GRID.flatMap((row, rowIndex) => row.map((value, columnIndex) => value === null
                        ? <div key={`group-dir-empty-${rowIndex}-${columnIndex}`} />
                        : <label key={`group-dir-${value}`} className="flex items-center justify-center gap-[2px] cursor-pointer">
                            <input checked={direction === value} className="form-check-input" name="groupdir" type="radio" onChange={() => setDirection(value)} />
                            <WiredDirectionIcon direction={value} selected={direction === value} />
                        </label>))}
                </div>
            </div>}
        </WiredActionBaseView>
    );
};
