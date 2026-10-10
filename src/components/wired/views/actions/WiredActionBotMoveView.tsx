import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';
import { normalizeBotSource, WIRED_BOT_NAMED_SOURCE } from '../../../../api';

export const WiredActionBotMoveView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [botSource, setBotSource] = useState<number>(WIRED_BOT_NAMED_SOURCE);
    const [furniSource, setFurniSource] = useState<number>(100);
    const { trigger = null, setStringParam = null, setIntParams = null, setFurniSources = null, setUserSources = null } = useWired();
    const botAllowed = trigger?.inputSources?.usersAllowed[0];
    const botDefault = trigger?.inputSources?.userDefaults[0] ?? 0;

    const save = () => {
        setStringParam(botSource === WIRED_BOT_NAMED_SOURCE ? botName : '');
        setIntParams([]);
        setFurniSources([furniSource]);
        setUserSources([botSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const nextBotName = trigger.stringData || '';
        setBotName(nextBotName);
        setFurniSource(trigger.furniSources[0] ?? 100);
        setBotSource(normalizeBotSource(trigger.userSources[0] ?? botDefault, botAllowed, botDefault, nextBotName.length > 0));
    }, [botAllowed, botDefault, trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            footer={
                <>
                    <WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />
                    <WiredSourcesSelector
                        showUsers={true}
                        userSource={botSource}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botAllowed, botDefault, botName.length > 0))}
                    />
                </>
            }
        >
            {botSource === WIRED_BOT_NAMED_SOURCE && (
                <WiredSection title={LocalizeText('wiredfurni.params.bot.name')}>
                    <WiredTextInput maxLength={32} value={botName} onChange={setBotName} />
                </WiredSection>
            )}
        </WiredActionBaseView>
    );
};
