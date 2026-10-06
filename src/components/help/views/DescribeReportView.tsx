import { FC } from 'react';
import { GetConfigurationValue, LocalizeText, ReportState } from '../../../api';
import { useHelp, useNotification } from '../../../hooks';
import { HelpActionButton, HelpInputSkin } from './HelpIndexView';

export const DescribeReportView: FC = () => {
    const { activeReport, setActiveReport } = useHelp();
    const { simpleAlert } = useNotification();
    const submitMessage = () => {
        const errorKey = !activeReport.message.length
            ? 'help.cfh.error.nomsg'
            : activeReport.message.length < GetConfigurationValue<number>('help.cfh.length.minimum', 15)
              ? 'help.cfh.error.msgtooshort'
              : null;
        if (errorKey) {
            simpleAlert(LocalizeText(errorKey), null, null, null, LocalizeText('generic.alert.title'));
            return;
        }
        setActiveReport((previous) => ({ ...previous, currentStep: ReportState.REPORT_SUMMARY }));
    };
    return (
        <>
            <div className="help-report-panel help-message-panel">
                <h2 className="help-report-title">{LocalizeText('help.emergency.main.step.one.title')}</h2>
                <p className="help-message-description">{LocalizeText('help.emergency.main.step.one.description')}</p>
                <div className="help-message-input help-input-skin">
                    <HelpInputSkin />
                    {!activeReport.message.length && (
                        <span className="help-message-placeholder" aria-hidden="true">
                            {LocalizeText('help.emergency.main.step.one.entry.instruction')}
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
