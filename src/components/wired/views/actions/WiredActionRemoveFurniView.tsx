import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionRemoveFurniView: FC<{}> = () => {
    const { trigger, setIntParams, setFurniSources } = useWired();
    const [source, setSource] = useState(100);
    useEffect(() => setSource(trigger?.furniSources[0] ?? 100), [trigger]);
    const save = () => {
        setIntParams([]);
        setFurniSources([source]);
    };
    return (
        <WiredActionBaseView
            nativeLayout={true}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={source} onChangeFurni={setSource} />}
        />
    );
};
