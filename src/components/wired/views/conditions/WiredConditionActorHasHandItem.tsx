import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredHandItemField } from '../WiredHandItemField';
import { WiredQuantifierSection } from '../WiredOptions';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionActorHasHandItemViewProps {
    negative?: boolean;
}

export const WiredConditionActorHasHandItemView: FC<WiredConditionActorHasHandItemViewProps> = ({ negative = false }) => {
    const [handItemId, setHandItemId] = useState(-1);
    const [quantifier, setQuantifier] = useState(0);
    const { trigger = null, setIntParams = null, setUserSources, quantifier: nativeQuantifier, setQuantifier: setNativeQuantifier } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.userSources?.length > 0) return trigger.userSources[0];
        return 0;
    });

    const save = () => {
        setIntParams([handItemId]);
        setUserSources([userSource]);
        setNativeQuantifier(quantifier);
    };

    useEffect(() => {
        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.userSources[0] ?? 0);
        setQuantifier(nativeQuantifier);
    }, [trigger, nativeQuantifier]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <>
                    <WiredQuantifierSection kind="users" name="handItemQuantifier" negative={negative} value={quantifier} onChange={setQuantifier} />
                    <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                </>
            }
        >
            <WiredHandItemField handItemId={handItemId} nativeSection={true} showCopyButton={true} onChange={setHandItemId} />
        </WiredConditionBaseView>
    );
};
