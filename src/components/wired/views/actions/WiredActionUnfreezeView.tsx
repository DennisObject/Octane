import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionUnfreezeView: FC<{}> = () => {
    const [userSource, setUserSource] = useState(0);
    const { trigger = null, setIntParams = null, setUserSources = null } = useWired();

    const save = () => {
        setIntParams([]);
        setUserSources([userSource]);
    };

    useEffect(() => {
        setUserSource(trigger?.userSources?.[0] ?? 0);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        />
    );
};
