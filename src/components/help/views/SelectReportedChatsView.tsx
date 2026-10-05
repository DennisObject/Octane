import { RoomObjectType } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { ChatEntryType, IChatEntry, LocalizeText, ReportState, ReportType } from '../../../api';
import { useChatHistory, useHelp, useNotification } from '../../../hooks';
import { HelpActionButton, HelpInputSkin } from './HelpIndexView';

export const SelectReportedChatsView: FC = () => {
    const { activeReport, setActiveReport } = useHelp();
    const { chatHistory, messengerHistory } = useChatHistory();
    const { simpleAlert } = useNotification();
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
            simpleAlert(LocalizeText('help.cfh.error.chatmissing'), null, null, null, LocalizeText('generic.alert.title'));
            return;
        }
        setActiveReport((previous) => ({ ...previous, cfhCategory: -1, currentStep: ReportState.SELECT_TOPICS }));
    };
    return (
        <>
            <div className="help-report-panel help-chat-panel">
                <h2 className="help-report-title">{LocalizeText('help.emergency.chat_report.subtitle')}</h2>
                <p className="help-chat-description">{LocalizeText('help.emergency.chat_report.description')}</p>
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
                                <span className="help-chat-text">{chat.message}</span>
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
