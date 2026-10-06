import { FC } from 'react';
import { GetConfigurationValue, LocalizeText, ReportState } from '../../../api';
import { useHelp } from '../../../hooks';
import { useHelpAlert } from './HelpAlertView';
import { HelpActionButton, HelpInputSkin } from './HelpIndexView';
import { HELP_WHITE_COLOR, HelpText } from './HelpText';

export const DescribeReportView: FC = () => {
    const { activeReport, setActiveReport } = useHelp();
    const showAlert = useHelpAlert();
    const submitMessage = () => {
        const errorKey = !activeReport.message.length
            ? 'help.cfh.error.nomsg'
            : activeReport.message.length < GetConfigurationValue<number>('help.cfh.length.minimum', 15)
              ? 'help.cfh.error.msgtooshort'
              : null;
        if (errorKey) {
            showAlert(errorKey);
            return;
        }
        setActiveReport((previous) => ({ ...previous, currentStep: ReportState.REPORT_SUMMARY }));
    };
    return (
        <>
            <div className="help-report-panel help-message-panel">
                <h2 className="help-report-title">
                    <HelpText text={LocalizeText('help.emergency.main.step.one.title')} textStyle="u_headline_medium" maxWidth={278} />
                </h2>
                <p className="help-message-description">
                    <HelpText text={LocalizeText('help.emergency.main.step.one.description')} maxWidth={380} />
                </p>
                <div className="help-message-input help-input-skin">
                    <HelpInputSkin />
                    {!activeReport.message.length && (
                        <span className="help-message-placeholder" aria-hidden="true">
                            <HelpText text={LocalizeText('help.emergency.main.step.one.entry.instruction')} size={11} color={0x888888} background={HELP_WHITE_COLOR} maxWidth={380} />
                        </span>
                    )}
                    {!!activeReport.message.length && (
                        <span className="help-message-text" aria-hidden="true">
                            <HelpText text={activeReport.message} size={11} background={HELP_WHITE_COLOR} maxWidth={380} />
                        </span>
                    )}
                    <textarea
                        aria-label={LocalizeText('help.emergency.main.step.one.title')}
                        maxLength={253}
                        value={activeReport.message}
                        onChange={(event) => {
                            const message = event.target.value;
                            setActiveReport((previous) => ({ ...previous, message }));
                        }}
                    />
                </div>
            </div>
            <HelpActionButton
                tone="gray"
                className="help-back"
                onClick={() => setActiveReport((previous) => ({ ...previous, cfhCategory: -1, currentStep: ReportState.SELECT_TOPICS }))}
            >
                {LocalizeText('generic.back')}
            </HelpActionButton>
            <HelpActionButton className="help-continue" onClick={submitMessage}>
                {LocalizeText('help.emergency.main.submit.button')}
            </HelpActionButton>
        </>
    );
};
