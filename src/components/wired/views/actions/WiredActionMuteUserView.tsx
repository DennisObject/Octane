import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, WIRED_SLIDER_ECHO, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionMuteUserView: FC<{}> = (props) => {
    const [time, setTime] = useState(1);
    const [message, setMessage] = useState('');
    const { trigger = null, setIntParams = null, setStringParam = null, setUserSources } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.userSources?.length) return trigger.userSources[0];
        return 0;
    });

    const save = () => {
        setIntParams([time]);
        setStringParam(message);
        setUserSources([userSource]);
    };

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 1);
        setUserSource(trigger?.userSources[0] ?? 0);
        setMessage(trigger.stringData);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <WiredSection title={LocalizeText('wiredfurni.params.message')}>
                <WiredTextInput maxLength={GetConfigurationValue<number>('wired.action.mute.user.max.length', 100)} value={message} onChange={setMessage} />
            </WiredSection>
            <WiredSliderSection
                converter={WIRED_SLIDER_ECHO}
                max={10}
                min={1}
                titleKey="wiredfurni.params.length.minutes"
                unit="minutes"
                value={time}
                onChange={setTime}
            />
        </WiredActionBaseView>
    );
};
