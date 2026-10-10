import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { normalizeNativeSource } from '../../../../api';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MODE_ALL = 0;
const MODE_AT_LEAST_ONE = 1;
const MODE_NOT_ALL = 2;
const MODE_NONE = 3;
const MODE_LESS_THAN = 4;
const MODE_EXACTLY = 5;
const MODE_MORE_THAN = 6;
const MIN_COMPARE_VALUE = 0;
const MAX_COMPARE_VALUE = 1000;
const DEFAULT_COMPARE_VALUE = 1;
const COMPARE_VALUE_PATTERN = /^\d*$/;
const CONDITION_EVALUATION_INTERACTION_TYPES = ['wf_cnd_*', 'wf_xtra_*'];
const CONDITION_EVALUATION_ERROR_KEY = 'wiredfurni.error.condition_evaluation_furni';

const MODE_OPTIONS = [MODE_ALL, MODE_AT_LEAST_ONE, MODE_NOT_ALL, MODE_NONE];
const COMPARISON_OPTIONS = [MODE_LESS_THAN, MODE_EXACTLY, MODE_MORE_THAN];

const normalizeEvaluationMode = (value: number) => ([...MODE_OPTIONS, ...COMPARISON_OPTIONS].includes(value) ? value : MODE_ALL);
const normalizeCompareValue = (value: number) => {
    if (isNaN(value)) return DEFAULT_COMPARE_VALUE;

    return Math.max(MIN_COMPARE_VALUE, Math.min(MAX_COMPARE_VALUE, Math.floor(value)));
};

export const WiredExtraOrEvalView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setFurniSources = null, setAllowedInteractionTypes = null, setAllowedInteractionErrorKey = null } = useWired();
    const [evaluationMode, setEvaluationMode] = useState(MODE_ALL);
    const [furniSource, setFurniSource] = useState(0);
    const [compareValue, setCompareValue] = useState(DEFAULT_COMPARE_VALUE);
    const [compareValueInput, setCompareValueInput] = useState(DEFAULT_COMPARE_VALUE.toString());
    // The card's own furni group and default decide which sources are valid; nothing is hardcoded here.
    const furniAllowed = trigger?.inputSources?.furniAllowed[0];
    const furniDefault = trigger?.inputSources?.furniDefaults[0] ?? 0;
    const normalizeFurniSource = (value: number) => normalizeNativeSource(value, furniAllowed, furniDefault);

    useEffect(() => {
        setAllowedInteractionTypes(CONDITION_EVALUATION_INTERACTION_TYPES);
        setAllowedInteractionErrorKey(CONDITION_EVALUATION_ERROR_KEY);

        return () => {
            setAllowedInteractionTypes(null);
            setAllowedInteractionErrorKey(null);
        };
    }, [setAllowedInteractionErrorKey, setAllowedInteractionTypes]);

    useEffect(() => {
        if (!trigger) return;

        setEvaluationMode(normalizeEvaluationMode(trigger.intData.length > 0 ? trigger.intData[0] : MODE_ALL));
        setFurniSource(normalizeFurniSource(trigger.furniSources.length > 0 ? trigger.furniSources[0] : furniDefault));
        const nextCompareValue = normalizeCompareValue(trigger.intData.length > 1 ? trigger.intData[1] : DEFAULT_COMPARE_VALUE);
        setCompareValue(nextCompareValue);
        setCompareValueInput(nextCompareValue.toString());
    }, [trigger, furniAllowed, furniDefault]);

    const updateCompareValue = (value: number) => {
        const nextValue = normalizeCompareValue(value);

        setCompareValue(nextValue);
        setCompareValueInput(nextValue.toString());
    };

    const updateCompareValueInput = (value: string) => {
        if (!COMPARE_VALUE_PATTERN.test(value)) return;

        setCompareValueInput(value);

        if (!value.length) {
            setCompareValue(MIN_COMPARE_VALUE);
            return;
        }

        updateCompareValue(parseInt(value));
    };

    const save = () => {
        setIntParams([normalizeEvaluationMode(evaluationMode), normalizeCompareValue(compareValue)]);
        setFurniSources([normalizeFurniSource(furniSource)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            cardStyle={{ width: 360 }}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    furniSource={furniSource}
                    onChangeFurni={(value) => setFurniSource(normalizeFurniSource(value))}
                />
            }
        >
            <div className="flex flex-col gap-2">
                <Text>{LocalizeText('wiredfurni.params.eval_mode')}</Text>
                {MODE_OPTIONS.map((mode) => {
                    return (
                        <label key={mode} className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={evaluationMode === mode}
                                className="form-check-input"
                                name="wiredExtraOrEvalMode"
                                type="radio"
                                onChange={() => setEvaluationMode(mode)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.eval_mode.${mode}`)}</Text>
                        </label>
                    );
                })}
                {COMPARISON_OPTIONS.map((mode) => {
                    const isSelected = evaluationMode === mode;

                    return (
                        <label key={mode} className="flex items-center gap-2 cursor-pointer">
                            <input
                                checked={isSelected}
                                className="form-check-input"
                                name="wiredExtraOrEvalMode"
                                type="radio"
                                onChange={() => setEvaluationMode(mode)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.eval_mode.cmp.${mode - MODE_LESS_THAN}`)}</Text>
                            <input
                                className="form-control form-control-sm w-16"
                                inputMode="numeric"
                                max={MAX_COMPARE_VALUE}
                                min={MIN_COMPARE_VALUE}
                                type="text"
                                value={compareValueInput}
                                onBlur={() => setCompareValueInput(normalizeCompareValue(compareValue).toString())}
                                onChange={(event) => updateCompareValueInput(event.target.value)}
                                onFocus={() => setEvaluationMode(mode)}
                            />
                        </label>
                    );
                })}
            </div>
        </WiredExtraBaseView>
    );
};
