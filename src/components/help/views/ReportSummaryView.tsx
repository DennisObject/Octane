import {
    CallForHelpFromForumMessageMessageComposer,
    CallForHelpFromForumThreadMessageComposer,
    CallForHelpFromIMMessageComposer,
    CallForHelpFromPhotoMessageComposer,
    CallForHelpMessageComposer
} from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText, ReportState, ReportType, SendMessageComposer } from '../../../api';
import { useHelp } from '../../../hooks';
import { useHelpAlert } from './HelpAlertView';
import { HelpActionButton } from './HelpIndexView';
import { HelpText } from './HelpText';

export const ReportSummaryView: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { activeReport = null, setActiveReport = null } = useHelp();

    const showAlert = useHelpAlert();

    const submitReport = () => {
        if (activeReport.cfhTopic < 0) {
            showAlert('help.cfh.error.notopic');
            return;
        }
        const chats: (string | number)[] = [];

        switch (activeReport.reportType) {
            case ReportType.BULLY:
            case ReportType.EMERGENCY:
            case ReportType.ROOM: {
                const reportedRoomId = activeReport.roomId > 0 ? activeReport.roomId : activeReport.reportedChats[0]?.roomId;
                if (reportedRoomId === undefined) {
                    showAlert('help.cfh.error.chatmissing');
                    return;
                }

                activeReport.reportedChats.forEach((entry) => chats.push(entry.webId, entry.message));

                SendMessageComposer(
                    new CallForHelpMessageComposer(activeReport.message, activeReport.cfhTopic, activeReport.reportedUserId, reportedRoomId, chats)
                );
                break;
            }
            case ReportType.IM:
                activeReport.reportedChats.forEach((entry) => chats.push(entry.webId, entry.message));

                SendMessageComposer(new CallForHelpFromIMMessageComposer(activeReport.message, activeReport.cfhTopic, activeReport.reportedUserId, chats));
                break;
            case ReportType.THREAD:
                SendMessageComposer(
                    new CallForHelpFromForumThreadMessageComposer(activeReport.groupId, activeReport.threadId, activeReport.cfhTopic, activeReport.message)
                );
                break;
            case ReportType.MESSAGE:
                SendMessageComposer(
                    new CallForHelpFromForumMessageMessageComposer(
                        activeReport.groupId,
                        activeReport.threadId,
                        activeReport.messageId,
                        activeReport.cfhTopic,
                        activeReport.message
                    )
                );
                break;
            case ReportType.PHOTO:
                SendMessageComposer(
                    new CallForHelpFromPhotoMessageComposer(
                        activeReport.extraData,
                        activeReport.roomId,
                        activeReport.reportedUserId,
                        activeReport.cfhTopic,
                        activeReport.roomObjectId
                    )
                );
                break;
        }

        onClose();
    };

    return (
        <>
            <div className="help-report-panel help-summary-panel">
                <h2 className="help-report-title">
                    <HelpText text={LocalizeText('help.cfh.button.send')} textStyle="u_headline_medium" maxWidth={164} />
                </h2>
                <p className="help-summary-description">
                    <HelpText text={LocalizeText('help.main.summary')} maxWidth={390} />
                </p>
            </div>
            <HelpActionButton
                tone="gray"
                className="help-back"
                onClick={() => setActiveReport((previous) => ({ ...previous, currentStep: ReportState.INPUT_REPORT_MESSAGE }))}
            >
                {LocalizeText('generic.back')}
            </HelpActionButton>
            <HelpActionButton tone="red" className="help-continue" onClick={submitReport}>
                {LocalizeText('help.emergency.chat_report.submit.button')}
            </HelpActionButton>
        </>
    );
};
