import { FC, useEffect, useState } from 'react';
import { FaArrowDown, FaArrowLeft, FaArrowRight, FaArrowUp } from 'react-icons/fa';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredLegacySlider as Slider } from '../WiredSlider';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const MAX_DISTANCE = 20;

const HORIZONTAL_OPTIONS = [
    { value: 0, icon: <FaArrowLeft /> },
    { value: 1, icon: <FaArrowRight /> }
];

const VERTICAL_OPTIONS = [
    { value: 0, icon: <FaArrowDown /> },
    { value: 1, icon: <FaArrowUp /> }
];

const normalizeDirection = (value: number, fallback = 1) => {
    if (value === 0 || value === 1) return value;

    return fallback;
};

const normalizeDistance = (value: number) => {
    if (isNaN(value)) return 0;

    return Math.max(0, Math.min(MAX_DISTANCE, value));
};

export const WiredActionRelativeMoveView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setFurniSources } = useWired();

    const [horizontalDirection, setHorizontalDirection] = useState(1);
    const [horizontalDistance, setHorizontalDistance] = useState(0);
    const [verticalDirection, setVerticalDirection] = useState(1);
    const [verticalDistance, setVerticalDistance] = useState(0);
    const [furniSource, setFurniSource] = useState(100);

    useEffect(() => {
        if (!trigger) return;

        setHorizontalDirection((trigger.intData[0] ?? 0) < 0 ? 0 : 1);
        setHorizontalDistance(Math.abs(trigger.intData[0] ?? 0));
        setVerticalDirection((trigger.intData[1] ?? 0) < 0 ? 0 : 1);
        setVerticalDistance(Math.abs(trigger.intData[1] ?? 0));

        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    const save = () => {
        setIntParams([horizontalDistance * (horizontalDirection === 0 ? -1 : 1), verticalDistance * (verticalDirection === 0 ? -1 : 1)]);
        setFurniSources([furniSource]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.movement.horizontal.selection')}</Text>
                <div className="flex gap-2">
                    {HORIZONTAL_OPTIONS.map((option) => {
                        return (
                            <label key={option.value} className="flex items-center gap-1">
                                <input
                                    checked={horizontalDirection === option.value}
                                    className="form-check-input"
                                    name="relativeMoveHorizontal"
                                    type="radio"
                                    onChange={() => setHorizontalDirection(option.value)}
                                />
                                <Text>{option.icon}</Text>
                            </label>
                        );
                    })}
                </div>
                <Text>{LocalizeText('wiredfurni.params.movement.horizontal.distance', ['distance'], [horizontalDistance.toString()])}</Text>
                <Slider max={MAX_DISTANCE} min={0} step={1} value={horizontalDistance} onChange={(value) => setHorizontalDistance(value as number)} />
            </div>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.movement.vertical.selection')}</Text>
                <div className="flex gap-2">
                    {VERTICAL_OPTIONS.map((option) => {
                        return (
                            <label key={option.value} className="flex items-center gap-1">
                                <input
                                    checked={verticalDirection === option.value}
                                    className="form-check-input"
                                    name="relativeMoveVertical"
                                    type="radio"
                                    onChange={() => setVerticalDirection(option.value)}
                                />
                                <Text>{option.icon}</Text>
                            </label>
                        );
                    })}
                </div>
                <Text>{LocalizeText('wiredfurni.params.movement.vertical.distance', ['distance'], [verticalDistance.toString()])}</Text>
                <Slider max={MAX_DISTANCE} min={0} step={1} value={verticalDistance} onChange={(value) => setVerticalDistance(value as number)} />
            </div>
        </WiredActionBaseView>
    );
};
