import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredHandItemField } from '../WiredHandItemField';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTextInput } from '../WiredTextInput';
import { WiredActionBaseView } from './WiredActionBaseView';
import { normalizeBotSource, WIRED_BOT_NAMED_SOURCE } from '../../../../api';

export const WiredActionBotGiveHandItemView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [handItemId, setHandItemId] = useState(-1);
    const [userSource, setUserSource] = useState<number>(0);
    const [botSource, setBotSource] = useState<number>(WIRED_BOT_NAMED_SOURCE);
    const { trigger = null, setStringParam = null, setIntParams = null, setUserSources = null } = useWired();
    const botAllowed = trigger?.inputSources?.usersAllowed[0];
    const botDefault = trigger?.inputSources?.userDefaults[0] ?? 0;
    const userAllowed = trigger?.inputSources?.usersAllowed[1];
    const userDefault = trigger?.inputSources?.userDefaults[1] ?? 0;

    const save = () => {
        setStringParam(botSource === WIRED_BOT_NAMED_SOURCE ? botName : '');
        // owned: [hand item]; users: [bot, receiving user].
        setIntParams([handItemId]);
        setUserSources([botSource, userSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const nextBotName = trigger.stringData || '';
        setBotName(nextBotName);
        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : -1);
        setUserSource(normalizeBotSource(trigger.userSources[1] ?? userDefault, userAllowed, userDefault, false));
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
                    <WiredSourcesSelector
                        showUsers={true}
                        userSlot={0}
                        userSource={botSource}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        allowClickedUserSource={false}
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botAllowed, botDefault, botName.length > 0))}
                    />
                    <WiredSourcesSelector
                        showUsers={true}
                        userSlot={1}
                        userSource={userSource}
                        onChangeUsers={(value) => setUserSource(normalizeBotSource(value, userAllowed, userDefault, false))}
                    />
                </>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.bot.name')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption
                        checked={botSource === WIRED_BOT_NAMED_SOURCE}
                        label={LocalizeText('wiredfurni.params.bot.usage')}
                        last={true}
                        onChange={(checked) => setBotSource(checked ? WIRED_BOT_NAMED_SOURCE : botDefault)}
                    />
                </WiredCheckboxGroup>
                {botSource === WIRED_BOT_NAMED_SOURCE && <WiredTextInput maxLength={32} value={botName} onChange={setBotName} />}
            </WiredSection>
            {/* Official BOT_GIVE_HAND_ITEM code list includes 1126/1127/1128. */}
            <WiredHandItemField handItemId={handItemId} extraItemIds={[1126, 1127, 1128]} nativeSection={true} showCopyButton={true} onChange={setHandItemId} />
        </WiredActionBaseView>
    );
};
