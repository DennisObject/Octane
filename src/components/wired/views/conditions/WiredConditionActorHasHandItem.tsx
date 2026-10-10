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
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => setIntParams([handItemId, userSource, quantifier]);

    useEffect(() => {
        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setQuantifier(trigger.intData.length > 2 && trigger.intData[2] === 1 ? 1 : 0);
    }, [trigger]);

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
