import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredLegacySlider as Slider } from '../WiredSlider';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const directionOptions: { value: number; icon: string }[] = [
    {
        value: 0,
        icon: 'ne'
    },
    {
        value: 2,
        icon: 'se'
    },
    {
        value: 4,
        icon: 'sw'
    },
    {
        value: 6,
        icon: 'nw'
    }
];

export const WiredActionMoveFurniToView: FC<{}> = (props) => {
    const [spacing, setSpacing] = useState(1);
    const [movement, setMovement] = useState(0);
    const { trigger = null, setIntParams = null, setFurniSources, setActivePickSlot, activePickSlot } = useWired();
    const [furniSource, setFurniSource] = useState(100);
    const [targetSource, setTargetSource] = useState(101);
    const save = () => {
        setIntParams([movement, spacing]);
        setFurniSources([furniSource, targetSource]);
    };
    useEffect(() => {
        setMovement(trigger?.intData[0] ?? 0);
        setSpacing(trigger?.intData[1] ?? 1);
        setFurniSource(trigger?.furniSources[0] ?? 100);
        setTargetSource(trigger?.furniSources[1] ?? 101);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <>
                    <WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />
                    <WiredSourcesSelector showFurni={true} furniSlot={1} furniSource={targetSource} onChangeFurni={setTargetSource} />
                    <div className="flex gap-2">
                        <button type="button" aria-pressed={activePickSlot === 0} onClick={() => setActivePickSlot(0)}>
                            {LocalizeText('wiredfurni.params.sources.furni.100')}
                        </button>
                        <button type="button" aria-pressed={activePickSlot === 1} onClick={() => setActivePickSlot(1)}>
                            {LocalizeText('wiredfurni.params.sources.furni.101')}
                        </button>
                    </div>
                </>
            }
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.emptytiles', ['tiles'], [spacing.toString()])}</Text>
                <Slider max={5} min={1} value={spacing} onChange={(event) => setSpacing(event)} />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.movefurni', LocalizeText('wiredfurni.params.startdir'))}</Text>
                <div className="flex gap-1">
                    {directionOptions.map((value) => {
                        return (
                            <div key={value.value} className="flex items-center gap-1">
                                <input
                                    checked={movement === value.value}
                                    className="form-check-input"
                                    id={`movement${value.value}`}
                                    name="movement"
                                    type="radio"
                                    onChange={(event) => setMovement(value.value)}
                                />
                                <Text>
                                    <i className={`icon icon-${value.icon}`} />
                                </Text>
                            </div>
                        );
                    })}
                </div>
            </div>
        </WiredActionBaseView>
    );
};
