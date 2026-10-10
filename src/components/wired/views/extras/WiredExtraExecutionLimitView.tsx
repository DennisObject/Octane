import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { WiredLegacySlider as Slider } from '../WiredSlider';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_EXECUTIONS = 1;
const MAX_EXECUTIONS = 100;
const DEFAULT_EXECUTIONS = 1;
/** The window is counted in pulses; one pulse is half a second. */
const MIN_PULSES = 1;
const MAX_PULSES = 20;
const DEFAULT_PULSES = 2;
const MS_PER_PULSE = 500;

const normalizeExecutions = (value: number) => {
    if (isNaN(value)) return DEFAULT_EXECUTIONS;

    return Math.max(MIN_EXECUTIONS, Math.min(MAX_EXECUTIONS, Math.round(value)));
};

const normalizePulses = (value: number) => {
    if (isNaN(value)) return DEFAULT_PULSES;

    return Math.max(MIN_PULSES, Math.min(MAX_PULSES, Math.round(value)));
};

const formatWindow = (pulses: number) => (pulses * MS_PER_PULSE / 1000).toFixed(1);

export const WiredExtraExecutionLimitView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [executions, setExecutions] = useState(DEFAULT_EXECUTIONS);
    const [pulses, setPulses] = useState(DEFAULT_PULSES);

    useEffect(() => {
        if (!trigger) return;

        // owned: [executions per window, window in pulses].
        setExecutions(normalizeExecutions(trigger.intData.length > 0 ? trigger.intData[0] : DEFAULT_EXECUTIONS));
        setPulses(normalizePulses(trigger.intData.length > 1 ? trigger.intData[1] : DEFAULT_PULSES));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeExecutions(executions), normalizePulses(pulses)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                    <Text>{LocalizeText('wiredfurni.params.setexecutions', ['amount'], [executions.toString()])}</Text>
                    <Slider
                        min={MIN_EXECUTIONS}
                        max={MAX_EXECUTIONS}
                        step={1}
                        value={executions}
                        onChange={(value) => setExecutions(normalizeExecutions(Array.isArray(value) ? value[0] : Number(value)))}
                    />
                    <Text small>{executions}</Text>
                </div>
                <div className="flex flex-col gap-2">
                    <Text>{LocalizeText('wiredfurni.params.settimewindow', ['timewindow'], [formatWindow(pulses)])}</Text>
                    <Slider
                        min={MIN_PULSES}
                        max={MAX_PULSES}
                        step={1}
                        value={pulses}
                        onChange={(value) => setPulses(normalizePulses(Array.isArray(value) ? value[0] : Number(value)))}
                    />
                    <Text small>{formatWindow(pulses)}s</Text>
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
