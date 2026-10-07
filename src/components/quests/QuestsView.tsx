import {
    AddLinkEventTracker,
    CreateLinkEvent,
    GetSessionDataManager,
    ILinkEventTracker,
    QuestMessageData,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { ClassicScrollAreaView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { useQuests } from '../../hooks';
import { AchievementText } from '../achievements/AchievementText';
import { useAirScrollInput } from '../achievements/useAirScrollInput';
import { QuestButton } from './QuestButton';
import { QuestEntryView } from './QuestEntryView';
import '../../css/quests/QuestsList.css';

const WINDOW_WIDTH = 512;
const WINDOW_HEIGHT = 448;
const DETAILS_WIDTH = 493;
const DETAILS_HEIGHT = 253;
const LIST_WHEEL_STEP = 75;
const LIST_ARROW_STEP = 15;

const centered = (width: number, height: number) => ({ x: Math.round((window.innerWidth - width) / 2), y: Math.round((window.innerHeight - height) / 2) });

const FrameTitle: FC<{ text: string }> = ({ text }) => (
    <NativeText background={0x377998} className="air-quests-native-title" overrides={{ color: 0xffffff }} text={text} textStyle="u_frame_title" />
);

/**
 * The official Quests window (512x448): one row per campaign with the current quest, plus the HC info footer.
 * `quests/show|hide|toggle|details` and `questengine/quests` open it; the QuestDetails window is the same entry
 * with the quest hint, opened from the tracker.
 */
export const QuestsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number }>(null);
    const [detailsQuest, setDetailsQuest] = useState<QuestMessageData>(null);
    const [detailsPosition, setDetailsPosition] = useState<{ x: number; y: number }>(null);
    const [detailsBlockHeight, setDetailsBlockHeight] = useState(114);
    const [listViewport, setListViewport] = useState<HTMLDivElement>(null);
    const { quests = [], openRequests = 0, trackedQuest = null, requestQuests = null, acceptQuest = null, rejectQuest = null } = useQuests();

    useAirScrollInput(listViewport, { wheelStep: LIST_WHEEL_STEP, arrowStep: LIST_ARROW_STEP });

    const hasClub = GetSessionDataManager().clubLevel > 0;

    const show = useCallback(() => {
        setIsVisible(true);
        requestQuests && requestQuests();
    }, [requestQuests]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        show();
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => {
                            if (!prevValue) requestQuests && requestQuests();

                            return !prevValue;
                        });
                        return;
                    case 'details':
                        // The tracker's Details link toggles the window: a second click hides it.
                        setDetailsQuest((prevValue) => (prevValue ? null : trackedQuest));
                        return;
                }
            },
            eventUrlPrefix: 'quests/'
        };

        const engineTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length >= 2 && parts[1] === 'quests') show();
            },
            eventUrlPrefix: 'questengine/'
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(engineTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(engineTracker);
        };
    }, [show, requestQuests, trackedQuest]);

    useEffect(() => {
        if (openRequests > 0) setIsVisible(true);
    }, [openRequests]);

    useEffect(() => {
        if (isVisible && !position) setPosition(centered(WINDOW_WIDTH, WINDOW_HEIGHT));
    }, [isVisible, position]);

    useEffect(() => {
        if (detailsQuest && !detailsPosition) setDetailsPosition(centered(DETAILS_WIDTH, DETAILS_HEIGHT));
    }, [detailsQuest, detailsPosition]);

    useEffect(() => {
        if (!detailsQuest) return;

        const current = quests.find((quest) => quest.id === detailsQuest.id);

        if (current && current !== detailsQuest) setDetailsQuest(current);
    }, [quests, detailsQuest]);

    /** List entry: the official list sends the accept and stays open. */
    const onAccept = useCallback((quest: QuestMessageData) => acceptQuest && acceptQuest(quest.id), [acceptQuest]);

    /** QuestDetails: accepting hides the details window and closes the quests list. */
    const onDetailsAccept = useCallback(
        (quest: QuestMessageData) => {
            acceptQuest && acceptQuest(quest.id);
            setDetailsQuest(null);
            setIsVisible(false);
        },
        [acceptQuest]
    );

    /** Cancelling only sends the reject; neither window closes until the server answers. */
    const onReject = useCallback((quest: QuestMessageData) => rejectQuest && rejectQuest(quest.id), [rejectQuest]);

    const sorted = [...quests].sort((a, b) => a.sortOrder - b.sortOrder);

    return (
        <>
            {isVisible && position && (
                <OctaneCardView
                    className="octane-quests-air"
                    uniqueKey="quests"
                    frameStyle={3}
                    isResizable={false}
                    initialPosition={position}
                    onPositionChange={setPosition}
                    unconstrainedPosition
                    dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }}
                >
                    <OctaneCardHeaderView headerText="" onCloseClick={() => setIsVisible(false)}>
                        <FrameTitle text={localizeWithFallback('quests.list.caption', 'Quests')} />
                    </OctaneCardHeaderView>
                    <div className="air-quests-content octane-card-content-shell">
                        <ClassicScrollAreaView className="air-quests-list air-style0-scroll-area" scrollStep={LIST_ARROW_STEP} thumbSizeAdjustment={1} viewportRef={setListViewport}>
                            <div className="air-quests-entries" style={{ height: Math.max(0, sorted.length * 124 - 8) }}>
                                {sorted.map((quest) => (
                                    <QuestEntryView key={`${quest.campaignCode}-${quest.id}`} quest={quest} onAccept={onAccept} onReject={onReject} />
                                ))}
                            </div>
                        </ClassicScrollAreaView>
                        <div className="air-quests-hc-info">
                            <AchievementText
                                background={0xe9e9e1}
                                maxWidth={349}
                                text={
                                    hasClub
                                        ? localizeWithFallback('hc.has.double_duckets.info', 'You get double duckets as you are an HC member!')
                                        : localizeWithFallback('hc.get.double_duckets.info', 'Get HC membership to gain double duckets!')
                                }
                                textStyle="u_regular"
                                x={17}
                                y={385}
                            />
                            {!hasClub && (
                                <QuestButton className="air-quest-get-hc" label={localizeWithFallback('generic.get_hc', 'Get HC')} width={107} onClick={() => CreateLinkEvent('catalog/open/hc_membership')} />
                            )}
                        </div>
                    </div>
                </OctaneCardView>
            )}
            {detailsQuest && detailsPosition && (
                <OctaneCardView
                    className="octane-quest-details-air"
                    uniqueKey="quest-details"
                    frameStyle={3}
                    isResizable={false}
                    style={{ height: detailsBlockHeight + 56 }}
                    initialPosition={detailsPosition}
                    onPositionChange={setDetailsPosition}
                    unconstrainedPosition
                    dragStyle={{ filter: 'drop-shadow(2.828px 2.828px 2px rgba(0, 0, 0, 0.349))' }}
                >
                    <OctaneCardHeaderView headerText="" onCloseClick={() => setDetailsQuest(null)}>
                        <FrameTitle text={localizeWithFallback('quests.details.caption', 'Quest')} />
                    </OctaneCardHeaderView>
                    <div className="air-quest-details-content octane-card-content-shell">
                        <QuestEntryView quest={detailsQuest} showHint onAccept={onDetailsAccept} onReject={onReject} onBlockHeight={setDetailsBlockHeight} />
                    </div>
                </OctaneCardView>
            )}
        </>
    );
};
