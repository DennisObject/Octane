import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const FURNI_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' }
];

const normalizeFurniSource = (value: number) => (FURNI_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 100);

export const WiredTriggerReceiveSignalView: FC<{}> = () => {
    const [senderCount, setSenderCount] = useState(0);
    const [channel, setChannel] = useState(0);
    const [furniSource, setFurniSource] = useState(100);

    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([channel, furniSource]);

    useEffect(() => {
        if (!trigger) return;

        const p = trigger.intData;
        // Current saves contain [channel, source]; older opens included sender metadata before source.
        setChannel(p[0] ?? 0);
        setSenderCount(p.length >= 4 ? p[1] : 0);
        setFurniSource(normalizeFurniSource(p.length >= 4 ? p[3] : p[1]));
    }, [trigger]);

    return (
        <WiredTriggerBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} furniSources={FURNI_SOURCE_OPTIONS} onChangeFurni={setFurniSource} />}
        >
            <div className="flex items-center justify-between">
                <Text small>{localizeWithFallback('wiredfurni.params.signal.senders_connected', 'Senders connected')}</Text>
                <Text bold small>
                    {senderCount}
                </Text>
            </div>
        </WiredTriggerBaseView>
    );
};
