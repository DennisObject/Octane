import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionKickFromRoomView: FC<{}> = (props) => {
    const [message, setMessage] = useState('');
    const { trigger = null, setStringParam = null, setIntParams = null, setUserSources = null } = useWired();
    /** Sit, lie down and fast walk share this window for its user source; nobody is being kicked, so
     * the message the kicked person would see has nothing to say. */
    const showMessage = trigger?.code !== WiredActionLayoutCode.USER_TARGET;
    const [userSource, setUserSource] = useState<number>(() => {
        return trigger?.userSources?.[0] ?? 0;
    });

    const save = () => {
        setStringParam(showMessage ? message : '');
        setIntParams([]);
        setUserSources([userSource]);
    };

    useEffect(() => {
        setMessage(trigger.stringData);
        setUserSource(trigger.userSources[0] ?? 0);
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
                    <WiredTextInput
                        maxLength={GetConfigurationValue<number>('wired.action.kick.from.room.max.length', 100)}
                        value={message}
                        onChange={setMessage}
                    />
                </WiredSection>
            )}
        </WiredActionBaseView>
    );
};
