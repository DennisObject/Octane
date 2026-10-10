import { RoomObjectType } from '@volt/renderer';
import { FC, useMemo } from 'react';
import { ChatEntryType, IChatEntry, LocalizeText, ReportState, ReportType } from '../../../api';
import { useChatHistory, useHelp } from '../../../hooks';
import { useHelpAlert } from './HelpAlertView';
import { HelpActionButton, HelpInputSkin } from './HelpIndexView';
import { HELP_WHITE_COLOR, HelpText } from './HelpText';

export const SelectReportedChatsView: FC = () => {
    const { activeReport, setActiveReport } = useHelp();
    const { chatHistory, messengerHistory } = useChatHistory();
    const showAlert = useHelpAlert();
    const isIm = activeReport.reportType === ReportType.IM;
    const userChats = useMemo(
        () =>
            isIm
                ? messengerHistory.filter((chat) => chat.webId === activeReport.reportedUserId && chat.type === ChatEntryType.TYPE_IM)
                : chatHistory.filter(
                      (chat) => chat.type === ChatEntryType.TYPE_CHAT && chat.webId === activeReport.reportedUserId && chat.entityType === RoomObjectType.USER
                  ),
        [isIm, activeReport.reportedUserId, chatHistory, messengerHistory]
    );
    const selectChat = (chat: IChatEntry) => {
        setActiveReport((previous) => {
            const selected = previous.reportedChats.some((entry) => entry.id === chat.id);
            const selectedIds = new Set(previous.reportedChats.map((entry) => entry.id));
            if (selected) selectedIds.delete(chat.id);
            else selectedIds.add(chat.id);
            return {
                ...previous,
                reportedChats: userChats.filter((entry) => selectedIds.has(entry.id)),
                roomId: !selected && !isIm ? chat.roomId : previous.roomId
            };
        });
    };
    const submitChats = () => {
        if (!activeReport.reportedChats.length) {
            showAlert('help.cfh.error.chatmissing');
            return;
        }
        setActiveReport((previous) => ({ ...previous, cfhCategory: -1, currentStep: ReportState.SELECT_TOPICS }));
    };
    return (
        <>
            <div className="help-report-panel help-chat-panel">
                <h2 className="help-report-title">
                    <HelpText text={LocalizeText('help.emergency.chat_report.subtitle')} textStyle="u_headline_medium" maxWidth={287} />
                </h2>
                <p className="help-chat-description">
                    <HelpText text={LocalizeText('help.emergency.chat_report.description')} maxWidth={380} />
                </p>
                <div className="help-chat-border help-input-skin">
                    <HelpInputSkin />
                    <div className="help-chat-list help-scroll">
                        {userChats.map((chat) => (
                            <label className="help-chat-row" key={chat.id}>
                                <input
                                    type="checkbox"
                                    className="help-chat-check"
                                    checked={activeReport.reportedChats.some((entry) => entry.id === chat.id)}
                                    onChange={() => selectChat(chat)}
                                />
                                <span className="help-chat-text">
                                    <HelpText plain text={chat.message} background={HELP_WHITE_COLOR} maxWidth={336} />
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            {!isIm && (
                <HelpActionButton
                    tone="gray"
                    className="help-back"
                    onClick={() => setActiveReport((previous) => ({ ...previous, currentStep: ReportState.SELECT_USER }))}
                >
                    {LocalizeText('generic.back')}
                </HelpActionButton>
            )}
            <HelpActionButton className="help-continue" onClick={submitChats}>
                {LocalizeText('help.emergency.main.submit.button')}
            </HelpActionButton>
        </>
    );
};
