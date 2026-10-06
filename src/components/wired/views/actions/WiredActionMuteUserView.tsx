import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, WiredFurniType, WIRED_SLIDER_ECHO } from '../../../../api';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { WiredTextInput } from '../WiredTextInput';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionMuteUserView: FC<{}> = (props) => {
    const [time, setTime] = useState(-1);
    const [message, setMessage] = useState('');
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => {
        setIntParams([time, userSource]);
        setStringParam(message);
    };

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
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
            <WiredSliderSection converter={WIRED_SLIDER_ECHO} max={10} min={0} titleKey="wiredfurni.params.length.minutes" unit="minutes" value={time} onChange={setTime} />
        </WiredActionBaseView>
    );
};
