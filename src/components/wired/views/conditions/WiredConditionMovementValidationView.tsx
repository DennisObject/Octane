import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionMovementValidationView: FC<{}> = () => {
    const { trigger, setIntParams, setStringParam, setFurniSources } = useWired();
    const [furniSource, setFurniSource] = useState(100);

    useEffect(() => {
        setFurniSource(trigger?.furniSources[0] ?? 100);
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setStringParam('');
        setFurniSources([furniSource]);
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            footer={<WiredSourcesSelector showFurni furniSource={furniSource} onChangeFurni={setFurniSource} />}
        />
    );
};
