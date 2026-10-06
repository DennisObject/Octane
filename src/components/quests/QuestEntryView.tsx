import { QuestMessageData } from '@octane/renderer';
import { FC } from 'react';
import {
    getCampaignCounterStyle,
    getCampaignImageUrl,
    getCampaignName,
    getQuestDescription,
    getQuestHint,
    getQuestingImageUrl,
    getQuestListImageUrl,
    getQuestName,
    isQuestRewardVisible,
    localizeWithFallback
} from '../../api';
import { AchievementText, useAirFieldWidth } from '../achievements/AchievementText';
import { QuestButton } from './QuestButton';

interface QuestEntryViewProps {
    quest: QuestMessageData;
    /** The QuestDetails window shows the hint under the description and no accept button. */
    showHint?: boolean;
    onAccept: (quest: QuestMessageData) => void;
    onReject: (quest: QuestMessageData) => void;
}

const rewardIconClass = (type: number) => ({ [-1]: 'credit', 0: 'ducket', 5: 'diamond' })[type as -1 | 0 | 5] ?? 'wallet';

/**
 * One entry of the quests list (Campaign 103x114 + Quest 362x114 of HabboQuestEngineCom), laid out at the layout XML
 * rects; every surface is flat colour or a questing bitmap, so nothing here is a CSS approximation.
 */
export const QuestEntryView: FC<QuestEntryViewProps> = (props) => {
    const { quest, showHint = false, onAccept = null, onReject = null } = props;

    const accepted = quest.accepted;
    const completedCampaign = quest.completedCampaign;
    const counterStyle = getCampaignCounterStyle(quest.completedQuestsInCampaign, completedCampaign);
    const blockFill = accepted ? 0xf3deb8 : 0xc8c8c8;
    const rewardVisible = isQuestRewardVisible(quest.activityPointType, quest.rewardCurrencyAmount);
    const hint = showHint ? getQuestHint(quest) : '';
    const rewardCaption = localizeWithFallback('quests.list.rewardcaption', 'Reward:');
    const amountText = String(quest.rewardCurrencyAmount);
    const captionWidth = useAirFieldWidth(rewardCaption);
    const amountWidth = useAirFieldWidth(amountText, 12, true);

    return (
        <div className="air-quest-entry" data-accepted={accepted} data-completed={completedCampaign}>
            <div className="air-quest-campaign">
                <div className="air-quest-campaign-top" />
                <div className="air-quest-campaign-bottom" />
                <AchievementText background={accepted ? 0xffd788 : 0xbababa} bold height={29} text={getCampaignName(quest.campaignCode)} width={95} x={4} y={12} align="center" />
                <img className="air-quest-campaign-image" src={getCampaignImageUrl(quest.campaignCode)} alt="" draggable={false} onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
                <img
                    className="air-quest-counter"
                    src={getQuestingImageUrl(counterStyle === 'green' ? 'quest_counterbkg_completed' : counterStyle === 'blue' ? 'quest_counterbkg_active' : 'quest_counterbkg_disabled')}
                    alt=""
                    draggable={false}
                />
                <AchievementText bold color={0xffffff} size={13} text={`${quest.completedQuestsInCampaign}/${quest.questCountInCampaign}`} width={49} x={27} y={84} align="center" />
            </div>
            {completedCampaign ? (
                <div className="air-quest-block air-quest-round" data-accepted={false}>
                    <AchievementText background={0xc8c8c8} maxWidth={230} text={localizeWithFallback('quests.list.completed', 'You have completed all the quests in this category.')} x={40} y={41} />
                    <img className="air-quest-completed-image" src={getQuestingImageUrl('category_completed')} alt="" draggable={false} />
                </div>
            ) : (
                <div className="air-quest-block air-quest-round" data-accepted={accepted}>
                    <div className="air-quest-block-header air-quest-round" />
                    <AchievementText background={accepted ? 0xedb23a : 0x8d8d8d} bold color={accepted ? 0xffffff : 0x373737} size={13} text={getQuestName(quest)} x={25} y={11} />
                    <img className="air-quest-image" src={getQuestListImageUrl(quest)} alt="" draggable={false} onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
                    <AchievementText background={blockFill} maxWidth={255} text={getQuestDescription(quest)} x={98} y={39} />
                    {hint.length > 0 && <AchievementText background={blockFill} maxWidth={255} text={hint} x={98} y={72} />}
                    {rewardVisible && (
                        <div className="air-quest-reward">
                            <AchievementText background={blockFill} style={{ position: 'relative', width: captionWidth }} text={rewardCaption} x={0} y={0} />
                            <AchievementText background={blockFill} bold style={{ position: 'relative', width: amountWidth }} text={amountText} x={0} y={0} />
                            <span className={`air-quest-reward-icon air-quest-reward-icon--${rewardIconClass(quest.activityPointType)}`} />
                        </div>
                    )}
                    {!accepted && (
                        <QuestButton className="air-quest-accept" label={localizeWithFallback('quests.list.accept', 'Activate quest')} width={108} onClick={() => onAccept(quest)} />
                    )}
                    {accepted && (
                        <button type="button" className="air-quest-cancel" onClick={() => onReject(quest)}>
                            <AchievementText background={blockFill} text={localizeWithFallback('quests.list.reject', 'Cancel Quest')} underline x={0} y={0} />
                        </button>
                    )}
                </div>
            )}
            <img className="air-quest-arrow" src={getQuestingImageUrl(accepted ? 'quest_arrow2' : 'quest_arrow1')} alt="" draggable={false} />
        </div>
    );
};
