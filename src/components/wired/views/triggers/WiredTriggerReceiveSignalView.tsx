import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggerReceiveSignalView: FC<{}> = () => {
    const { trigger, setIntParams, setFurniSources } = useWired();
    const [furniSource, setFurniSource] = useState(100);
    useEffect(() => {
        setFurniSource(trigger?.furniSources[0] ?? 100);
    }, [trigger]);
    const save = () => {
        setIntParams([]);
        setFurniSources([furniSource]);
    };
    return (
        <WiredTriggerBaseView
            hasSpecialInput={false}
            nativeLayout
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            footer={<WiredSourcesSelector showFurni furniSource={furniSource} onChangeFurni={setFurniSource} />}
        />
    );
};
