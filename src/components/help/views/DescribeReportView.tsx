import { FC, useState } from 'react';
import { GetConfigurationValue, LocalizeText, ReportState } from '../../../api';
import { useHelp } from '../../../hooks';
import { useHelpAlert } from './HelpAlertView';
import { HelpActionButton, HelpInputSkin } from './HelpIndexView';
import { HELP_WHITE_COLOR, HelpText } from './HelpText';

// Beyond this many explicit lines the field keeps its own (scrollable) text instead of the native raster overlay.
const MAX_OVERLAY_LINES = 8;

export const DescribeReportView: FC = () => {
    const { activeReport, setActiveReport } = useHelp();
    const showAlert = useHelpAlert();
    const [isEditing, setIsEditing] = useState(false);
    const [fitsOverlay, setFitsOverlay] = useState(true);
    // The real textarea stays visible while editing (caret, selection, IME, scrolling are the browser's). Once it blurs and the text
    // is short enough to sit well inside the field, the v75 TextField raster is drawn over it.
    const showNativeText = !isEditing && fitsOverlay && activeReport.message.length > 0;
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
                <div className={'help-message-input help-input-skin' + (showNativeText ? ' is-native-text' : '')}>
                    <HelpInputSkin />
                    {!activeReport.message.length && (
                        <span className="help-message-placeholder" aria-hidden="true">
                            <HelpText text={LocalizeText('help.emergency.main.step.one.entry.instruction')} size={11} color={0x888888} background={HELP_WHITE_COLOR} maxWidth={380} />
                        </span>
                    )}
                    {showNativeText && (
                        <span className="help-message-text" aria-hidden="true">
                            <HelpText plain text={activeReport.message} size={11} background={HELP_WHITE_COLOR} maxWidth={380} />
                        </span>
                    )}
                    <textarea
                        aria-label={LocalizeText('help.emergency.main.step.one.title')}
                        maxLength={253}
                        value={activeReport.message}
                        onFocus={() => setIsEditing(true)}
                        onBlur={(event) => {
                            const field = event.currentTarget;

                            setFitsOverlay(field.scrollHeight <= field.clientHeight && field.scrollWidth <= field.clientWidth && field.value.split('\n').length <= MAX_OVERLAY_LINES);
                            setIsEditing(false);
                        }}
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
