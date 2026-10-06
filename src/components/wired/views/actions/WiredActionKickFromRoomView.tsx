import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionKickFromRoomView: FC<{}> = (props) => {
    const [message, setMessage] = useState('');
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    /** Sit, lie down and fast walk share this window for its user source; nobody is being kicked, so
     * the message the kicked person would see has nothing to say. */
    const showMessage = trigger?.code !== WiredActionLayoutCode.USER_TARGET;
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length >= 1) return trigger.intData[0];
        return 0;
    });

    const save = () => {
        setStringParam(showMessage ? message : '');
        setIntParams([userSource]);
    };

    useEffect(() => {
        setMessage(trigger.stringData);
        if (trigger.intData.length >= 1) setUserSource(trigger.intData[0]);
        else setUserSource(0);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            {showMessage && (
                <WiredSection title={LocalizeText('wiredfurni.params.message')}>
                    <WiredTextInput maxLength={GetConfigurationValue<number>('wired.action.kick.from.room.max.length', 100)} value={message} onChange={setMessage} />
                </WiredSection>
            )}
        </WiredActionBaseView>
    );
};
