import { CreateLinkEvent, GetLocalizationManager } from '@volt/renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { getCampaignImageUrl, getCampaignName, getQuestCompletedText, getQuestingImageUrl, isQuestRewardVisible, localizeWithFallback } from '../../api';
import { VoltCardHeaderView, VoltCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { useQuests } from '../../hooks';
import { AchievementText, useAirFieldWidth } from '../achievements/AchievementText';
import { QuestButton } from './QuestButton';
import '../../css/quests/QuestCompleted.css';

/** The official dialog waits two seconds after the completion packet before it appears. */
const SHOW_DELAY_MS = 2000;
const WIDTH = 426;
const HEIGHT = 215;
const REWARD_COLOR = 0x7adde9;

/** `activitypoint.name.<type>` as the hotel texts define it; an undefined name stays empty like the official client's. */
const activityPointName = (type: number): string => {
    const manager = GetLocalizationManager();
    const key = `activitypoint.name.${type}`;

    return manager.hasValue(key) ? manager.getValue(key) : '';
};

/**
 * One run of the reward line. The official dialog flows its runs through a single html field; here each run is its own
 * field, cut back to the text plus its 2px gutter so the next run starts where this one's advance ends. Earlier runs
 * stack above later ones so a later field's flat background never covers a neighbour's glyphs.
 */
const RewardRun: FC<{ text: string; order: number; bold?: boolean; color: number }> = ({ text, order, bold = false, color }) => {
    const fieldWidth = useAirFieldWidth(text, 12, bold);

    if (!text.length) return null;

    return (
        <AchievementText
            background={0x7d7da6}
            bold={bold}
            color={color}
            style={{ position: 'relative', zIndex: 3 - order, marginLeft: order ? -2 : 0, overflow: 'hidden', width: fieldWidth === undefined ? undefined : fieldWidth - 3 }}
            text={text}
            x={0}
            y={0}
        />
    );
};

/**
 * The QuestCompletedDialog (426x215): congratulations, the quest's completed text, the reward and either the
 * "next quest" button or, for the last quest of a campaign, the "more quests" button.
 */
export const QuestCompletedView: FC<{}> = () => {
    const { completion = null, requestNextQuest = null, clearCompletion = null } = useQuests();
    const [visibleFor, setVisibleFor] = useState<number>(0);
    const [position, setPosition] = useState<{ x: number; y: number }>(null);

    useEffect(() => {
        if (!completion || !completion.showDialog) {
            setVisibleFor(0);

            return;
        }

        const timeout = window.setTimeout(() => setVisibleFor(completion.receivedAt), SHOW_DELAY_MS);

        return () => window.clearTimeout(timeout);
    }, [completion]);

    const isShown = !!completion && completion.showDialog && visibleFor === completion.receivedAt;

    useEffect(() => {
        if (isShown && !position) setPosition({ x: Math.round((window.innerWidth - WIDTH) / 2), y: Math.round((window.innerHeight - HEIGHT) / 2) });
    }, [isShown, position]);

    if (!isShown || !position) return null;

    const quest = completion.quest;
    const lastQuestInCampaign = quest.lastQuestInCampaign;
    const campaignName = getCampaignName(quest.campaignCode);
    const rewardVisible = isQuestRewardVisible(quest.activityPointType, quest.rewardCurrencyAmount);
    const currencyName = activityPointName(quest.activityPointType);

    const close = () => clearCompletion && clearCompletion();

    const onNextQuest = () => {
        requestNextQuest && requestNextQuest();
        close();
    };

    const onMoreQuests = () => {
        CreateLinkEvent('quests/show');
        close();
    };

    const onCatalog = () => {
        CreateLinkEvent(quest.catalogPageName && quest.catalogPageName.length ? `catalog/open/${quest.catalogPageName}` : 'catalog/open');
        close();
    };

    // quests.completed.reward is `...<b><font size="30" color="#7adde9">%amount%</font></b> %currencyname%`: a white run, the amount, a white run.
    const [rewardBefore, rewardAfter] = localizeWithFallback('quests.completed.reward', 'You have been rewarded %amount% %currencyname%')
        .replace('%currencyname%', currencyName)
        .replace(/<[^>]+>/g, '')
        .split('%amount%');

    return (
        <VoltCardView
            className="volt-quest-completed-air"
            uniqueKey="quest-completed"
            frameStyle={3}
            isResizable={false}
            initialPosition={position}
            onPositionChange={setPosition}
            unconstrainedPosition
            dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }}
        >
            <VoltCardHeaderView headerText="" onCloseClick={onNextQuest}>
                <NativeText
                    background={0x377998}
                    className={`air-quests-native-title${lastQuestInCampaign ? ' air-quests-native-title-campaign' : ''}`}
                    overrides={{ color: 0xffffff }}
                    text={
                        lastQuestInCampaign
                            ? localizeWithFallback('quests.completed.campaign.title', '%category% Quests Completed', ['category'], [campaignName])
                            : localizeWithFallback('quests.completed.quest.title', '%category% Quest Completed', ['category'], [campaignName])
                    }
                    textStyle="u_frame_title"
                />
            </VoltCardHeaderView>
            <div className="air-quest-completed-content volt-card-content-shell">
                <div className="air-quest-completed-banner" />
                {lastQuestInCampaign ? (
                    <>
                        <img className="air-quest-completed-star" src={getQuestingImageUrl('ach_receive_star')} alt="" draggable={false} />
                        <img className="air-quest-completed-campaign" src={getCampaignImageUrl(quest.campaignCode)} alt="" draggable={false} />
                    </>
                ) : (
                    <img className="air-quest-completed-icon" src={getQuestingImageUrl('quest_doneicon')} alt="" draggable={false} />
                )}
                <AchievementText
                    background={0x7d7da6}
                    bold
                    color={0xffffff}
                    height={22}
                    size={20}
                    text={lastQuestInCampaign ? localizeWithFallback('quests.completed.campaign.caption', 'Congratulations!') : localizeWithFallback('quests.completed.quest.caption', 'Well done!')}
                    x={138}
                    y={22}
                />
                <AchievementText background={0x7d7da6} color={0xffffff} maxWidth={282} text={getQuestCompletedText(quest)} x={139} y={48} />
                {rewardVisible && (
                    <div className="air-quest-completed-reward" style={{ '--air-reward-color': `#${REWARD_COLOR.toString(16)}` } as CSSProperties}>
                        <RewardRun color={0xffffff} order={0} text={rewardBefore} />
                        <RewardRun bold color={REWARD_COLOR} order={1} text={String(quest.rewardCurrencyAmount)} />
                        <RewardRun color={0xffffff} order={2} text={rewardAfter} />
                    </div>
                )}
                {!lastQuestInCampaign && rewardVisible && (
                    <button type="button" className="air-quest-completed-link" onClick={onCatalog}>
                        <AchievementText
                            background={0xe9e9e1}
                            text={localizeWithFallback('quests.completed.cataloglink', 'Go shopping with %currencyname%').replace('%currencyname%', currencyName)}
                            underline
                            x={0}
                            y={0}
                        />
                    </button>
                )}
                {lastQuestInCampaign ? (
                    <QuestButton className="air-quest-completed-more" label={localizeWithFallback('quests.campaigncompleted.more', 'More Quests')} width={157} onClick={onMoreQuests} />
                ) : (
                    <QuestButton className="air-quest-completed-next" label={localizeWithFallback('quests.completed.next', 'Activate Next Quest')} width={141} onClick={onNextQuest} />
                )}
            </div>
        </VoltCardView>
    );
};
