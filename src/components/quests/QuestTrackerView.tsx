import { CreateLinkEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { getQuestDescription, getQuestImageUrl, getQuestingImageUrl, getQuestName, getQuestProgressPercent, localizeWithFallback } from '../../api';
import { useQuests } from '../../hooks';
import { AchievementText } from '../achievements/AchievementText';
import { AirAchievementProgressBar } from '../achievements/AirAchievementProgressBar';
import '../../css/quests/QuestTracker.css';

/** The official check animation: one engine tick per frame (13 frames over success_pic_1..6), then a 1 s close wait. */
const COMPLETION_FRAMES = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 4];
const COMPLETION_FRAME_MS = 17;
const COMPLETION_CLOSE_WAIT_MS = 1000;
const NEXT_QUEST_TIMEOUT_MS = 600;

/** QuestTracker layout: the 195x135 `quest_tracker_with_bar` bitmap (window 192x132) with its fields on top. */
const BODY_COLOR = 0x292929;

/**
 * The quest tracker widget the official client attaches to the toolbar extension column while a quest is
 * accepted: quest name, image, description, progress bar and the "Details" link (in room only).
 */
export const QuestTrackerView: FC<{}> = () => {
    const { trackedQuest = null, completion = null, isInRoom = false, requestNextQuest = null, clearTrackedQuest = null } = useQuests();
    const [frame, setFrame] = useState(-1);

    const completing = completion && trackedQuest && completion.quest.id === trackedQuest.id;

    useEffect(() => {
        if (!completing) {
            setFrame(-1);

            return;
        }

        let index = 0;
        let cancelled = false;
        let timeout = 0;

        setFrame(COMPLETION_FRAMES[0]);

        const step = () => {
            if (cancelled) return;

            index++;

            if (index < COMPLETION_FRAMES.length) {
                setFrame(COMPLETION_FRAMES[index]);
                timeout = window.setTimeout(step, COMPLETION_FRAME_MS);

                return;
            }

            timeout = window.setTimeout(() => {
                if (cancelled) return;

                if (!completion.showDialog) {
                    requestNextQuest && requestNextQuest();
                    timeout = window.setTimeout(() => !cancelled && clearTrackedQuest && clearTrackedQuest(), NEXT_QUEST_TIMEOUT_MS);
                } else {
                    clearTrackedQuest && clearTrackedQuest();
                }
            }, COMPLETION_CLOSE_WAIT_MS);
        };

        timeout = window.setTimeout(step, COMPLETION_FRAME_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [completing, completion, requestNextQuest, clearTrackedQuest]);

    if (!trackedQuest || (!trackedQuest.accepted && !completing)) return null;

    if (trackedQuest.waitPeriodSeconds > 0) return null;

    const percent = completing ? 100 : getQuestProgressPercent(trackedQuest.completedSteps, trackedQuest.totalSteps);

    return (
        <div className="air-quest-tracker">
            <img className="air-quest-tracker-bg" src={getQuestingImageUrl('quest_tracker_with_bar')} alt="" draggable={false} />
            <AchievementText
                align="center"
                bold
                color={0xffffff}
                height={18}
                size={13}
                text={localizeWithFallback('quests.tracker.caption', 'Quest: %quest_name%', ['quest_name'], [getQuestName(trackedQuest)])}
                width={134}
                x={25}
                y={2}
            />
            {frame > 0 ? (
                <img className="air-quest-tracker-check" src={getQuestingImageUrl(`checkanim${frame}`)} alt="" draggable={false} />
            ) : (
                <img
                    className="air-quest-tracker-image"
                    src={getQuestImageUrl(trackedQuest)}
                    alt=""
                    draggable={false}
                    onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                    }}
                    onLoad={(event) => {
                        event.currentTarget.style.visibility = 'visible';
                    }}
                />
            )}
            <AchievementText color={0xffffff} height={61} maxWidth={115} text={getQuestDescription(trackedQuest)} x={71} y={27} />
            <AirAchievementProgressBar
                className="air-quest-tracker-progress"
                hasFrame={false}
                identity={trackedQuest.id}
                localizationKey="quests.tracker.progress"
                maxProgress={100}
                progress={percent}
                width={162}
            />
            {isInRoom && (
                <button type="button" className="air-quest-tracker-details" onClick={() => CreateLinkEvent('quests/details')}>
                    <AchievementText
                        align="center"
                        background={BODY_COLOR}
                        bold
                        color={0x23c5ff}
                        height={17}
                        text={localizeWithFallback('quests.tracker.moreinfo', 'Details')}
                        underline
                        width={139}
                        x={0}
                        y={0}
                    />
                </button>
            )}
        </div>
    );
};
