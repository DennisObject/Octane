import { useCallback, useEffect, useRef, useState } from 'react';
import { WiredFurniType, WiredSelectionVisualizer } from '../../api';
import { useWired } from './useWired';

type Selection = 'move' | 'target';

export const useWiredFurniTargets = (moveEnabled: boolean, targetEnabled: boolean) => {
    const { trigger, furniIds, setFurniIds, setStringParam, setAllowsFurni } = useWired();
    const [moveIds, setMoveIds] = useState<number[]>([]);
    const [targetIds, setTargetIds] = useState<number[]>([]);
    const [selection, setSelection] = useState<Selection>('move');
    const highlighted = useRef<number[]>([]);

    const currentIds = () => ({
        move: selection === 'move' ? [...furniIds] : [...moveIds],
        target: selection === 'target' ? [...furniIds] : [...targetIds]
    });

    const replace = (move: number[], target: number[]) => {
        setMoveIds(move);
        setTargetIds(target);
        setSelection('move');
        setFurniIds([...move]);
    };

    const activate = useCallback((next: Selection) => {
        if (!(next === 'move' ? moveEnabled : targetEnabled)) return;
        const move = selection === 'move' ? [...furniIds] : [...moveIds];
        const target = selection === 'target' ? [...furniIds] : [...targetIds];
        setMoveIds(move);
        setTargetIds(target);
        setSelection(next);
        setFurniIds(next === 'move' ? move : target);
    }, [moveEnabled, targetEnabled, selection, furniIds, moveIds, targetIds, setFurniIds]);

    useEffect(() => {
        if (!trigger) return;
        const targets = Array.from(new Set((trigger.stringData ?? '').split(/[;,\t]/)
            .map(value => Number(value.trim())).filter(value => Number.isInteger(value) && value > 0)));
        setMoveIds(trigger.selectedItems ?? []);
        setTargetIds(targets);
        setSelection('move');
        setFurniIds([...(trigger.selectedItems ?? [])]);
    }, [trigger, setFurniIds]);

    useEffect(() => {
        if (selection === 'move') setMoveIds(furniIds);
        else setTargetIds(furniIds);
    }, [selection, furniIds]);

    useEffect(() => {
        if (selection === 'move' && !moveEnabled && targetEnabled) {
            activate('target');
            return;
        }
        if (selection === 'target' && !targetEnabled && moveEnabled) {
            activate('move');
            return;
        }
        setAllowsFurni((selection === 'move' ? moveEnabled : targetEnabled)
            ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [moveEnabled, targetEnabled, selection, activate, setAllowsFurni]);

    useEffect(() => {
        WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlighted.current);
        WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlighted.current);
        const secondary = new Set(targetIds);
        WiredSelectionVisualizer.applySelectionShaderToFurni(moveIds.filter(id => !secondary.has(id)));
        WiredSelectionVisualizer.applySecondarySelectionShaderToFurni(targetIds);
        highlighted.current = Array.from(new Set([...moveIds, ...targetIds]));
    }, [moveIds, targetIds]);

    useEffect(() => () => {
        WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlighted.current);
        WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlighted.current);
    }, []);

    const save = () => {
        const ids = currentIds();
        replace(ids.move, ids.target);
        setStringParam(ids.target.join(';'));
    };

    return { moveIds, targetIds, selection, activate, currentIds, replace, save };
};
