import { GetCfhStatusMessageComposer, GetSessionDataManager, RoomObjectType } from '@volt/renderer';
import { ButtonHTMLAttributes, FC } from 'react';
import {
    ChatEntryType,
    GetConfigurationValue,
    IHelpReport,
    LocalizeText,
    OpenUrl,
    ReportState,
    ReportType,
    SendMessageComposer
} from '../../../api';
import inputAtlas from '../../../assets/images/friends/swf/illumina_light_input_chat.png';
import helpDuck from '../../../assets/images/help/help-duck.png';
import linkIcon from '../../../assets/images/help/icons_link_icon.png';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';
import { useChatHistory, useHelp } from '../../../hooks';
import { useHelpAlert } from './HelpAlertView';
import { HelpCenteredText, HelpText } from './HelpText';

export const HELP_INDEX_STEP = -1;

export const createHelpReportDraft = (reportType: number, currentStep: number, options: Partial<IHelpReport> = {}): IHelpReport => ({
    reportType,
    reportedUserId: -1,
    reportedChats: [],
    cfhCategory: -1,
    cfhTopic: -1,
    roomId: -1,
    roomName: '',
    messageId: -1,
    threadId: -1,
    groupId: -1,
    extraData: '',
    roomObjectId: -1,
    message: '',
    currentStep,
    ...options
});

export const HelpActionButton: FC<ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'green' | 'red' | 'gray'; thick?: boolean; textStyle?: NativeTextStyleName; textSize?: number; textWidth?: number }> = ({
    tone = 'green',
    thick = false,
    textStyle = 'u_headline_medium',
    textSize,
    textWidth = thick ? 365 : 169,
    className = '',
    children,
    ...props
}) => (
    <button type="button" className={'help-action help-action--' + tone + (thick ? ' help-action--thick ' : ' ') + className} {...props}>
        <span>
            <HelpCenteredText width={textWidth} text={String(children)} textStyle={textStyle} size={textSize} onButton="light" />
        </span>
    </button>
);

const INPUT_REGIONS = [
    [0, 0, 5, 8, 30, 0, 5, 8],
    [5, 0, 380, 8, 35, 0, 19, 8],
    [385, 0, 5, 8, 54, 0, 5, 8],
    [1, 8, 388, 208, 31, 8, 27, 16],
    [0, 216, 5, 4, 30, 24, 5, 4],
    [5, 216, 380, 4, 35, 24, 19, 4],
    [385, 216, 5, 4, 54, 24, 5, 4],
    [0, 0, 4, 4, 0, 0, 4, 4],
    [4, 0, 382, 1, 4, 0, 21, 1],
    [386, 0, 4, 4, 25, 0, 4, 4],
    [0, 4, 1, 211, 0, 4, 1, 20],
    [389, 4, 1, 211, 28, 4, 1, 20],
    [0, 215, 4, 5, 0, 24, 4, 5],
    [4, 218, 382, 2, 4, 27, 21, 2],
    [386, 215, 4, 5, 25, 24, 4, 5]
];

export const HelpInputSkin: FC = () => (
    <svg className="help-input-bitmap" width="390" height="220" aria-hidden="true">
        {INPUT_REGIONS.map(([x, y, width, height, sx, sy, sw, sh], index) => (
            <svg key={index} x={x} y={y} width={width} height={height} viewBox={[sx, sy, sw, sh].join(' ')} preserveAspectRatio="none">
                <image href={inputAtlas} width="59" height="29" />
            </svg>
        ))}
    </svg>
);

export const HelpIndexView: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { setActiveReport } = useHelp();
    const { chatHistory } = useChatHistory();
    const showAlert = useHelpAlert();
    const onReportClick = () => {
        const hasUsers = chatHistory.some(
            (entry) => entry.type === ChatEntryType.TYPE_CHAT && entry.entityType === RoomObjectType.USER && entry.webId !== GetSessionDataManager().userId
        );
        if (!hasUsers) {
            showAlert('help.cfh.error.nochathistory');
            return;
        }
        setActiveReport((previous) =>
            previous ? { ...previous, currentStep: ReportState.SELECT_USER } : createHelpReportDraft(ReportType.BULLY, ReportState.SELECT_USER)
        );
    };
    const requestStatus = (reports: boolean) => {
        SendMessageComposer(new GetCfhStatusMessageComposer(reports));
        onClose();
    };
    return (
        <div className="help-index">
            <h1 className="help-index-title">
                <HelpText text={LocalizeText('help.main.frame.title')} textStyle="u_headline_big" size={24} maxWidth={382} />
            </h1>
            <div className="help-index-duck">
                <img src={helpDuck} alt="" draggable={false} />
            </div>
            <div className="help-index-description">
                <HelpText text={LocalizeText('help.main.frame.description')} maxWidth={250} />
            </div>
            <HelpActionButton thick className="help-index-report" onClick={onReportClick}>
                {LocalizeText('help.main.bully.subtitle')}
            </HelpActionButton>
            <HelpActionButton
                thick
                className="help-index-account"
                onClick={() => {
                    OpenUrl(GetConfigurationValue<string>('zendesk.url', ''));
                    onClose();
                }}
            >
                {LocalizeText('help.main.self.tips.title')}
            </HelpActionButton>
            <img className="help-index-icon help-index-icon--faq" src={linkIcon} alt="" draggable={false} />
            <button type="button" className="help-index-link help-index-link--faq" onClick={() => OpenUrl(GetConfigurationValue<string>('cfh.faq.url', ''))}>
                <HelpText text={LocalizeText('help.main.faq.link.text')} textStyle="u_bold" size={14} underline maxWidth={354} />
            </button>
            <img className="help-index-icon help-index-icon--sanction" src={linkIcon} alt="" draggable={false} />
            <button type="button" className="help-index-link help-index-link--sanction" onClick={() => requestStatus(false)}>
                <HelpText text={LocalizeText('help.main.my.sanction.status')} textStyle="u_bold" size={14} underline maxWidth={354} />
            </button>
            {GetConfigurationValue<boolean>('my.reports.status.enabled', false) && (
                <>
                    <img className="help-index-icon help-index-icon--reports" src={linkIcon} alt="" draggable={false} />
                    <button type="button" className="help-index-link help-index-link--reports" onClick={() => requestStatus(true)}>
                        <HelpText text={LocalizeText('help.main.my.reports.status')} textStyle="u_bold" size={14} underline maxWidth={354} />
                    </button>
                </>
            )}
        </div>
    );
};
