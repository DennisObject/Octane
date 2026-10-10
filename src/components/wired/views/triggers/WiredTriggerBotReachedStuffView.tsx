import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const FURNI_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' },
    { value: 0, label: 'wiredfurni.params.sources.furni.0' }
];

const BOT_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.users.100' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' }
];

export const WiredTriggerBotReachedStuffView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [furniSource, setFurniSource] = useState(100);
    const [botSource, setBotSource] = useState(0);
    const { trigger = null, setStringParam = null, setIntParams = null, setFurniSources, setUserSources } = useWired();

    const save = () => {
        setStringParam(botName);
        setIntParams([]);
        setFurniSources([furniSource]);
        setUserSources([botSource]);
    };

    useEffect(() => {
        setBotName(trigger.stringData);
        setFurniSource(trigger?.furniSources[0] ?? 100);
        setBotSource(trigger?.userSources[0] ?? 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    showUsers={true}
                    furniSource={furniSource}
                    userSource={botSource}
                    furniSources={FURNI_SOURCE_OPTIONS}
                    userSources={BOT_SOURCE_OPTIONS}
                    usersTitle="wiredfurni.params.sources.users.title.bots"
                    onChangeFurni={setFurniSource}
                    onChangeUsers={setBotSource}
                />
            }
        >
            {
                <WiredSection title={LocalizeText('wiredfurni.params.bot.name')}>
                    <WiredTextInput maxLength={32} value={botName} onChange={setBotName} />
                </WiredSection>
            }
        </WiredTriggerBaseView>
    );
};
