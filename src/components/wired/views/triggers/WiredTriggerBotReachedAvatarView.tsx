import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const BOT_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.users.100' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' }
];

const normalizeBotSource = (value: number) => (BOT_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 100);

export const WiredTriggerBotReachedAvatarView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [botSource, setBotSource] = useState(100);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () => {
        setStringParam(botSource === 100 ? botName : '');
        setIntParams([botSource]);
    };

    useEffect(() => {
        setBotName(trigger.stringData);
        setBotSource(trigger?.intData?.length > 0 ? normalizeBotSource(trigger.intData[0]) : 100);
    }, [trigger]);

    return (
        <WiredTriggerBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <WiredSourcesSelector
                    showUsers={true}
                    userSource={botSource}
                    userSources={BOT_SOURCE_OPTIONS}
                    usersTitle="wiredfurni.params.sources.users.title.bots"
                    onChangeUsers={setBotSource}
                />
            }
        >
            {botSource === 100 && (
                <WiredSection title={LocalizeText('wiredfurni.params.bot.name')}>
                    <WiredTextInput maxLength={32} value={botName} onChange={setBotName} />
                </WiredSection>
            )}
        </WiredTriggerBaseView>
    );
};
