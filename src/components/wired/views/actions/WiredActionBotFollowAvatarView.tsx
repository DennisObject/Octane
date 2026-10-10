import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';
import { normalizeBotSource, WIRED_BOT_NAMED_SOURCE } from '../../../../api';

export const WiredActionBotFollowAvatarView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [followMode, setFollowMode] = useState(1);
    const [botSource, setBotSource] = useState<number>(WIRED_BOT_NAMED_SOURCE);
    const [userSource, setUserSource] = useState<number>(0);
    const { trigger = null, setStringParam = null, setIntParams = null, setUserSources = null } = useWired();
    const userAllowed = trigger?.inputSources?.usersAllowed[1];
    const userDefault = trigger?.inputSources?.userDefaults[1] ?? 0;
    const botAllowed = trigger?.inputSources?.usersAllowed[0];
    const botDefault = trigger?.inputSources?.userDefaults[0] ?? 0;

    const save = () => {
        setStringParam(botSource === WIRED_BOT_NAMED_SOURCE ? botName : '');
        // owned: [follow mode]; users: [bot, followed user].
        setIntParams([followMode]);
        setUserSources([botSource, userSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const nextBotName = trigger.stringData || '';
        setBotName(nextBotName);
        setFollowMode(trigger.intData.length > 0 ? trigger.intData[0] : 1);
        setUserSource(userAllowed?.includes(trigger.userSources[1]) ? trigger.userSources[1] : userDefault);
        setBotSource(normalizeBotSource(trigger.userSources[0] ?? botDefault, botAllowed, botDefault, nextBotName.length > 0));
    }, [botAllowed, botDefault, trigger, userAllowed, userDefault]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <>
                    <WiredSourcesSelector showUsers={true} userSlot={1} userSource={userSource} onChangeUsers={setUserSource} />
                    <WiredSourcesSelector
                        showUsers={true}
                        userSlot={0}
                        userSource={botSource}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botAllowed, botDefault, botName.length > 0))}
                    />
                </>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.bot.name')}>
                {botSource === WIRED_BOT_NAMED_SOURCE && <WiredTextInput maxLength={32} value={botName} onChange={setBotName} />}
                <WiredRadioGroup
                    name="followMode"
                    options={[
                        { id: 1, label: LocalizeText('wiredfurni.params.start.following') },
                        { id: 0, label: LocalizeText('wiredfurni.params.stop.following') }
                    ]}
                    value={followMode}
                    onChange={setFollowMode}
                />
            </WiredSection>
        </WiredActionBaseView>
    );
};
