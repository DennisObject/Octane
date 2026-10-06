import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCES.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotFollowAvatarView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [followMode, setFollowMode] = useState(-1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const [botSource, setBotSource] = useState<number>(100);
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => {
        setStringParam(botSource === 100 ? botName : '');
        setIntParams([followMode, userSource, botSource]);
    };

    useEffect(() => {
        const nextBotName = trigger.stringData || '';
        setBotName(nextBotName);
        setFollowMode(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setBotSource(
            trigger.intData.length > 2 ? normalizeBotSource(trigger.intData[2], nextBotName.length > 0) : normalizeBotSource(-1, nextBotName.length > 0)
        );
    }, [trigger]);

    // class_4276: one "Bot Name" section holding the name field and the start/stop radios.
    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            // class_3976: user selection 0 is the bot, 1 the user.
            footer={
                <>
                    <WiredSourcesSelector
                        showUsers={true}
                        userSource={botSource}
                        userSources={BOT_SOURCES}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botName.length > 0))}
                    />
                    <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                </>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.bot.name')}>
                {botSource === 100 && <WiredTextInput maxLength={32} value={botName} onChange={setBotName} />}
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
