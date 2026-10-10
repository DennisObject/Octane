import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionCallAnotherStackView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null, setFurniSources = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        return trigger?.furniSources?.[0] ?? 100;
    });

    useEffect(() => {
        if (!trigger) return;

        setFurniSource(trigger.furniSources[0] ?? 100);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([]);
        setFurniSources([furniSource]);
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        />
    );
};
