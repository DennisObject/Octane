import { GetSessionDataManager, RoomObjectType } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { ChatEntryType, LocalizeText, ReportState } from '../../../api';
import nativeBlueAtlas from '../../../assets/images/habbo-skin/2249_habbo_skin_blue_png$87fbbf84559e7bad0222a9c697b1104d-1406111769.png';
import { LayoutAvatarImageView } from '../../../common';
import { useChatHistory, useHelp, useNotification } from '../../../hooks';
import { HelpActionButton } from './HelpIndexView';

const BORDER_REGIONS = [
    [0, 0, 6, 6, 0, 229, 6, 6],
    [6, 0, 355, 6, 6, 229, 1, 6],
    [361, 0, 6, 6, 12, 229, 6, 6],
    [0, 6, 6, 40, 0, 235, 6, 1],
    [6, 6, 355, 40, 6, 235, 1, 1],
    [361, 6, 6, 40, 12, 235, 6, 1],
    [0, 46, 6, 6, 0, 241, 6, 6],
    [6, 46, 355, 6, 6, 241, 1, 6],
    [361, 46, 6, 6, 12, 241, 6, 6]
];

export const SelectReportedUserView: FC<{ onBack: () => void }> = ({ onBack }) => {
    const { chatHistory, roomHistory } = useChatHistory();
    const { activeReport, setActiveReport } = useHelp();
    const { simpleAlert } = useNotification();
    const [pinnedUserId] = useState(activeReport.reportedUserId);
    const availableUsers = useMemo(() => {
        const users = new Map<number, { id: number; username: string; figure: string; roomId: number; roomName: string }>();
        for (const chat of chatHistory) {
            if (chat.type !== ChatEntryType.TYPE_CHAT || chat.entityType !== RoomObjectType.USER || chat.webId === GetSessionDataManager().userId) continue;
            users.set(chat.webId, {
                id: chat.webId,
                username: chat.name,
                figure: chat.look ?? '',
                roomId: chat.roomId,
                roomName: roomHistory.find((room) => room.id === chat.roomId)?.name ?? ''
            });
        }
        const result = Array.from(users.values()).reverse();
        const selectedIndex = result.findIndex((user) => user.id === pinnedUserId);
        if (selectedIndex > 0) result.unshift(...result.splice(selectedIndex, 1));
        return result;
    }, [chatHistory, roomHistory, pinnedUserId]);
    const submitUser = () => {
        if (activeReport.reportedUserId <= 0) {
            simpleAlert(LocalizeText('guide.bully.request.usermissing'), null, null, null, LocalizeText('generic.alert.title'));
            return;
        }
        setActiveReport((previous) => ({ ...previous, currentStep: ReportState.SELECT_CHATS }));
    };
    return (
        <>
            <div className="help-users-panel">
                <h2 className="help-users-title">{LocalizeText('help.emergency.main.step.two.title')}</h2>
                <div className="help-user-list help-scroll">
                    {availableUsers.map((user) => (
                        <button
                            type="button"
                            key={user.id}
                            className="help-user-row"
                            aria-pressed={activeReport.reportedUserId === user.id}
                            onClick={() =>
                                setActiveReport((previous) => ({
                                    ...previous,
                                    reportedUserId: user.id,
                                    roomId: user.roomId,
                                    reportedChats: previous.reportedUserId === user.id ? previous.reportedChats : []
                                }))
                            }
                        >
                            {activeReport.reportedUserId === user.id && (
                                <svg className="help-user-selection" width="367" height="52" aria-hidden="true">
                                    {BORDER_REGIONS.map(([x, y, width, height, sx, sy, sw, sh]) => (
                                        <svg
                                            key={x + ':' + y}
                                            x={x}
                                            y={y}
                                            width={width}
                                            height={height}
                                            viewBox={[sx, sy, sw, sh].join(' ')}
                                            preserveAspectRatio="none"
                                        >
                                            <image href={nativeBlueAtlas} width="490" height="300" />
                                        </svg>
                                    ))}
                                </svg>
                            )}
                            {user.figure && (
                                <LayoutAvatarImageView
                                    className="help-user-avatar"
                                    figure={user.figure}
                                    headOnly
                                    direction={2}
                                    style={{ backgroundSize: 'auto', backgroundPosition: '0 0' }}
                                />
                            )}
                            <span className="help-user-name">{user.username}</span>
                            <span className="help-user-room">
                                {user.roomName ? LocalizeText('help.emergency.main.step.two.room.name', ['room_name'], [user.roomName]) : ''}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            <HelpActionButton tone="gray" className="help-back" onClick={onBack}>
                {LocalizeText('generic.back')}
            </HelpActionButton>
            <HelpActionButton className="help-continue" onClick={submitUser}>
                {LocalizeText('help.emergency.main.submit.button')}
            </HelpActionButton>
        </>
    );
};
