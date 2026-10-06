import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredTextInput } from '../WiredTextInput';
import { WiredHandItemField } from '../WiredHandItemField';
import { CLICKED_USER_SOURCE_VALUE, WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const USER_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

const BOT_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 100, label: 'wiredfurni.params.sources.users.100' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

const normalizeUserSource = (value: number) =>
    value === CLICKED_USER_SOURCE_VALUE || USER_SOURCE_OPTIONS.some((option) => option.value === value) ? value : 0;
const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCE_OPTIONS.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotGiveHandItemView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [handItemId, setHandItemId] = useState(-1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(0);
    const [botSource, setBotSource] = useState<number>(100);

    const save = () => {
        setStringParam(botSource === 100 ? botName : '');
        setIntParams([handItemId, userSource, botSource]);
    };

    useEffect(() => {
        const nextBotName = trigger.stringData || '';

        setBotName(nextBotName);
        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.intData.length > 1 ? normalizeUserSource(trigger.intData[1]) : 0);
        setBotSource(
            trigger.intData.length > 2 ? normalizeBotSource(trigger.intData[2], nextBotName.length > 0) : normalizeBotSource(-1, nextBotName.length > 0)
        );
    }, [trigger]);

    // class_3977: "Bot Name" holds the "use bot" checkbox and the name field it reveals, then the hand item section.
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
                        userSources={BOT_SOURCE_OPTIONS}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        allowClickedUserSource={false}
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botName.length > 0))}
                    />
                    <WiredSourcesSelector showUsers={true} userSource={userSource} userSources={USER_SOURCE_OPTIONS} onChangeUsers={setUserSource} />
                </>
            }
        >
            <WiredSection title={LocalizeText('wiredfurni.params.bot.name')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={botSource === 100} label={LocalizeText('wiredfurni.params.bot.usage')} last={true} onChange={(checked) => setBotSource(checked ? 100 : 0)} />
                </WiredCheckboxGroup>
                {botSource === 100 && <WiredTextInput maxLength={32} value={botName} onChange={setBotName} />}
            </WiredSection>
            {/* Official BOT_GIVE_HAND_ITEM code list includes 1126/1127/1128 (§_-32b§.as DEFAULT_CODES);
                the condition/selector variants intentionally do NOT, so pass them per-view. */}
            <WiredHandItemField handItemId={handItemId} extraItemIds={[1126, 1127, 1128]} nativeSection={true} showCopyButton={true} onChange={setHandItemId} />
        </WiredActionBaseView>
    );
};
