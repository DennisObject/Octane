import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, WIRED_STRING_DELIMETER, WiredFurniType } from '../../../../api';
import { Button, LayoutAvatarImageView, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import { normalizeBotSource, WIRED_BOT_NAMED_SOURCE } from '../../../../api';

const DEFAULT_FIGURE: string = 'hd-180-1.ch-210-66.lg-270-82.sh-290-81';

export const WiredActionBotChangeFigureView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [figure, setFigure] = useState('');
    const [botSource, setBotSource] = useState<number>(WIRED_BOT_NAMED_SOURCE);
    const { trigger = null, setStringParam = null, setIntParams = null, setUserSources = null } = useWired();
    const botAllowed = trigger?.inputSources?.usersAllowed[0];
    const botDefault = trigger?.inputSources?.userDefaults[0] ?? 0;

    const save = () => {
        setStringParam((botSource === WIRED_BOT_NAMED_SOURCE ? botName : '') + WIRED_STRING_DELIMETER + figure);
        setIntParams([]);
        setUserSources([botSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.stringData.split(WIRED_STRING_DELIMETER);
        const nextBotName = data.length > 0 ? data[0] : '';

        setBotName(nextBotName);
        setFigure(data.length > 1 && data[1].length > 0 ? data[1] : DEFAULT_FIGURE);
        setBotSource(normalizeBotSource(trigger.userSources[0] ?? botDefault, botAllowed, botDefault, nextBotName.length > 0));
    }, [botAllowed, botDefault, trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <WiredSourcesSelector
                    showUsers={true}
                    userSource={botSource}
                    usersTitle="wiredfurni.params.sources.users.title.bots"
                    onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botAllowed, botDefault, botName.length > 0))}
                />
            }
        >
            {botSource === WIRED_BOT_NAMED_SOURCE && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            )}
            <div className="flex items-center justify-center">
                <LayoutAvatarImageView direction={4} figure={figure} />
                <Button onClick={() => setFigure(GetSessionDataManager().figure)}>{LocalizeText('wiredfurni.params.capture.figure')}</Button>
            </div>
        </WiredActionBaseView>
    );
};
