import { FC } from 'react';
import { LocalizeText, ReportState, ReportType } from '../../../api';
import { useHelp, useModTools } from '../../../hooks';
import { HelpActionButton } from './HelpIndexView';
import { HelpText } from './HelpText';

export const SelectTopicView: FC = () => {
    const { activeReport, setActiveReport } = useHelp();
    const { cfhCategories } = useModTools();
    const category = cfhCategories[activeReport.cfhCategory];
    const isRoom = activeReport.reportType === ReportType.ROOM;
    const roomTopic = cfhCategories.flatMap((item) => item.topics).find((topic) => topic.name === 'inappropiate_room_group_event');
    const isDirect =
        isRoom ||
        activeReport.reportType === ReportType.THREAD ||
        activeReport.reportType === ReportType.MESSAGE ||
        activeReport.reportType === ReportType.PHOTO;
    const submitTopic = (topicId: number) => setActiveReport((previous) => ({ ...previous, cfhTopic: topicId, currentStep: ReportState.INPUT_REPORT_MESSAGE }));
    const back = () => {
        if (category) setActiveReport((previous) => ({ ...previous, cfhCategory: -1 }));
        else setActiveReport((previous) => ({ ...previous, currentStep: ReportState.SELECT_CHATS }));
    };
    return (
        <>
            <div className="help-topics-panel">
                <p className="help-pick-topic">
                    <HelpText text={LocalizeText('help.cfh.pick.topic')} maxWidth={405} />
                </p>
                <div className="help-topic-list help-scroll">
                    {isRoom ? (
                        <HelpActionButton tone="red" className="help-topic" textStyle="u_bold" textSize={14} textWidth={335} onClick={() => submitTopic(roomTopic?.id ?? -1)}>
                            {LocalizeText('help.cfh.topic.34', ['name'], [activeReport.roomName])}
                        </HelpActionButton>
                    ) : category ? (
                        category.topics.map((topic) => (
                            <HelpActionButton key={topic.id} tone="red" className="help-topic" textStyle="u_bold" textSize={14} textWidth={335} onClick={() => submitTopic(topic.id)}>
                                {LocalizeText('help.cfh.topic.' + topic.id)}
                            </HelpActionButton>
                        ))
                    ) : (
                        cfhCategories.map((item, index) => (
                            <HelpActionButton
                                key={item.name}
                                tone="red"
                                className="help-topic"
                                textStyle="u_bold" textSize={14}
                                textWidth={335}
                                onClick={() => {
                                    if (item.topics.length) setActiveReport((previous) => ({ ...previous, cfhCategory: index }));
                                }}
                            >
                                {LocalizeText('help.cfh.reason.' + item.name)}
                            </HelpActionButton>
                        ))
                    )}
                </div>
            </div>
            {(!isDirect || category) && (
                <HelpActionButton tone="gray" className="help-back" onClick={back}>
                    {LocalizeText('generic.back')}
                </HelpActionButton>
            )}
        </>
    );
};
