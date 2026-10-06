import { AddLinkEventTracker, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker, RoomObjectType } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatEntryType, LocalizeText, ReportState, ReportType } from '../../api';
import { DraggableWindow, LayoutAvatarImageView } from '../../common';
import { useChatHistory, useFriendsState, useHelp, useMessenger } from '../../hooks';
import { DescribeReportView } from './views/DescribeReportView';
import { HelpAlertContext, HelpAlertView } from './views/HelpAlertView';
import { HELP_USER_HEADER_COLOR, HelpFrameTitle, HelpText } from './views/HelpText';
import { createHelpReportDraft, HELP_INDEX_STEP, HelpIndexView } from './views/HelpIndexView';
import { NameChangeView } from './views/name-change/NameChangeView';
import { ReportSummaryView } from './views/ReportSummaryView';
import { SanctionSatusView } from './views/SanctionStatusView';
import { SelectReportedChatsView } from './views/SelectReportedChatsView';
import { SelectReportedUserView } from './views/SelectReportedUserView';
import { SelectTopicView } from './views/SelectTopicView';

const MODAL_ORIGIN = { x: 0, y: 0 };
const FOCUSABLE_CONTROLS = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

const getFocusableControls = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_CONTROLS)).filter(
        (element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible'
    );

export const HelpView: FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { activeReport, setActiveReport } = useHelp();
    const { chatHistory } = useChatHistory();
    const { friends } = useFriendsState();
    const { messageThreads } = useMessenger();
    const [alertKey, setAlertKey] = useState<string>(null);
    const modalRef = useRef<HTMLElement>(null);
    const hasActiveReport = activeReport !== null;
    const isOpen = isVisible || hasActiveReport;
    const onClose = useCallback(() => {
        setActiveReport(null);
        setIsVisible(false);
        setAlertKey(null);
    }, [setActiveReport]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        break;
                    case 'hide':
                        onClose();
                        break;
                    case 'toggle':
                        if (hasActiveReport) onClose();
                        else setIsVisible((value) => !value);
                        break;
                    case 'report':
                        if (parts.length >= 5 && parts[2] === 'room') {
                            const roomId = Number.parseInt(parts[3], 10);
                            if (Number.isFinite(roomId))
                                setActiveReport(
                                    createHelpReportDraft(ReportType.ROOM, ReportState.SELECT_TOPICS, { roomId, roomName: unescape(parts.slice(4).join('/')) })
                                );
                        }
                        break;
                }
            },
            eventUrlPrefix: 'help/'
        };
        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [hasActiveReport, onClose, setActiveReport]);

    useEffect(() => {
        if (!isOpen) return;
        const modal = modalRef.current;
        if (!modal) return;
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const modalWindow = modal.closest<HTMLElement>('.draggable-window');
        let lastFocused: HTMLElement = null;
        const getHigherWindow = () => {
            const ownLayer = Number(modalWindow?.style.zIndex) || 0;
            return Array.from(document.querySelectorAll<HTMLElement>('.draggable-window'))
                .filter(
                    (element) =>
                        element !== modalWindow &&
                        element.getClientRects().length > 0 &&
                        getComputedStyle(element).visibility === 'visible' &&
                        Number(getComputedStyle(element).zIndex) > ownLayer
                )
                .sort((left, right) => Number(getComputedStyle(right).zIndex) - Number(getComputedStyle(left).zIndex))[0];
        };
        const focusModal = () => {
            const controls = getFocusableControls(modal);
            (controls.includes(lastFocused) ? lastFocused : controls[0] || modal).focus({ preventScroll: true });
        };
        const onFocus = (event: FocusEvent) => {
            if (!(event.target instanceof HTMLElement)) return;
            const higherWindow = getHigherWindow();
            if (higherWindow) {
                if ((higherWindow.matches('.octane-alert') || higherWindow.querySelector('.octane-alert')) && !higherWindow.contains(event.target))
                    getFocusableControls(higherWindow)[0]?.focus({ preventScroll: true });
                return;
            }
            if (modal.contains(event.target)) lastFocused = event.target;
            else focusModal();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const higherWindow = getHigherWindow();
            // A notification above Help owns focus until it closes. Other higher windows manage their own focus.
            if (higherWindow && !higherWindow.matches('.octane-alert') && !higherWindow.querySelector('.octane-alert')) return;
            const focusOwner = higherWindow || modal;
            const controls = getFocusableControls(focusOwner);
            if (!controls.length) {
                if (!higherWindow) {
                    event.preventDefault();
                    modal.focus({ preventScroll: true });
                }
                return;
            }
            const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
            if (currentIndex === -1 || (event.shiftKey ? currentIndex === 0 : currentIndex === controls.length - 1)) {
                event.preventDefault();
                (event.shiftKey ? controls.at(-1) : controls[0]).focus({ preventScroll: true });
            }
        };
        document.addEventListener('focusin', onFocus);
        document.addEventListener('keydown', onKeyDown, true);
        const initialFocus = requestAnimationFrame(() => {
            if (modal.isConnected && !getHigherWindow()) focusModal();
        });
        return () => {
            cancelAnimationFrame(initialFocus);
            document.removeEventListener('focusin', onFocus);
            document.removeEventListener('keydown', onKeyDown, true);
            if (opener?.isConnected && !getHigherWindow() && (modal.contains(document.activeElement) || document.activeElement === document.body))
                opener.focus({ preventScroll: true });
        };
    }, [isOpen]);

    const reportedUserId = activeReport?.reportedUserId;
    const isIm = activeReport?.reportType === ReportType.IM;
    const selectedUser = useMemo(() => {
        const chatUser = chatHistory.findLast((entry) => entry.webId === reportedUserId);
        if (!isIm) return chatUser;
        const friend = friends.find((entry) => entry.id === reportedUserId);
        const participant = messageThreads.find((thread) => thread.participant?.id === reportedUserId)?.participant;
        return { name: friend?.name || participant?.name || chatUser?.name, look: friend?.figure || participant?.figure || chatUser?.look };
    }, [chatHistory, friends, isIm, messageThreads, reportedUserId]);
    const returnToIndex = () => {
        setActiveReport((previous) => ({ ...previous, currentStep: HELP_INDEX_STEP }));
        setIsVisible(true);
    };
    const changeUser = () => {
        if (
            !chatHistory.some(
                (entry) => entry.type === ChatEntryType.TYPE_CHAT && entry.entityType === RoomObjectType.USER && entry.webId !== GetSessionDataManager().userId
            )
        ) {
            setAlertKey('help.cfh.error.nochathistory');
            return;
        }
        setActiveReport((previous) => ({ ...previous, currentStep: ReportState.SELECT_USER }));
    };
    const showUser = activeReport && activeReport.currentStep >= ReportState.SELECT_CHATS;
    const isRoom = activeReport?.reportType === ReportType.ROOM;
    const isForum = activeReport?.reportType === ReportType.THREAD || activeReport?.reportType === ReportType.MESSAGE;
    let step = <HelpIndexView onClose={onClose} />;
    if (activeReport) {
        switch (activeReport.currentStep) {
            case ReportState.SELECT_USER:
                step = <SelectReportedUserView onBack={returnToIndex} />;
                break;
            case ReportState.SELECT_CHATS:
                step = <SelectReportedChatsView />;
                break;
            case ReportState.SELECT_TOPICS:
                step = <SelectTopicView />;
                break;
            case ReportState.INPUT_REPORT_MESSAGE:
                step = <DescribeReportView />;
                break;
            case ReportState.REPORT_SUMMARY:
                step = <ReportSummaryView onClose={onClose} />;
                break;
        }
    }

    return (
        <HelpAlertContext.Provider value={setAlertKey}>
            {isOpen && (
                <DraggableWindow disableDrag initialPosition={MODAL_ORIGIN} unconstrainedPosition>
                    <div className="octane-help-modal">
                        <div className="octane-help-backdrop" aria-hidden="true" />
                        <section
                            ref={modalRef}
                            className="octane-help octane-card-shell octane-card-frame-3 has-classic-scrollbar"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="octane-help-title"
                            tabIndex={-1}
                        >
                            <div className="octane-card-header-shell">
                                <span id="octane-help-title" className="octane-card-title">
                                    <HelpFrameTitle text={LocalizeText('help.button.cfh')} width={448} />
                                </span>
                                <button type="button" className="octane-card-close-button" aria-label={LocalizeText('generic.close')} onClick={onClose} />
                            </div>
                            <svg className="octane-help-filters" aria-hidden="true">
                                <defs>
                                    <filter id="help-green" colorInterpolationFilters="sRGB">
                                        <feColorMatrix type="matrix" values="0 0 0 0 0  0 .6666667 0 0 0  0 0 0 0 0  0 0 0 1 0" />
                                    </filter>
                                    <filter id="help-red" colorInterpolationFilters="sRGB">
                                        <feColorMatrix type="matrix" values=".6666667 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
                                    </filter>
                                    <filter id="help-gray" colorInterpolationFilters="sRGB">
                                        <feColorMatrix type="matrix" values=".6666667 0 0 0 0  0 .6666667 0 0 0  0 0 .6666667 0 0  0 0 0 1 0" />
                                    </filter>
                                </defs>
                            </svg>
                            <div className="octane-help-content">
                                {showUser && (
                                    <div className="help-reported-user">
                                        {!isRoom && !isForum && (
                                            <>
                                                {selectedUser?.look && (
                                                    <LayoutAvatarImageView
                                                        className="help-reported-avatar"
                                                        figure={selectedUser.look}
                                                        headOnly
                                                        nativeCroppedHead
                                                        trimmed
                                                        direction={2}
                                                    />
                                                )}
                                                <span className="help-reported-title">
                                                    <HelpText text={LocalizeText('help.cfh.selected_user.title')} textStyle="u_bold" color={0xefefef} background={HELP_USER_HEADER_COLOR} maxWidth={160} />
                                                </span>
                                            </>
                                        )}
                                        {!isForum && (
                                            <span className="help-reported-name">
                                                <HelpText text={(isRoom ? activeReport.roomName : selectedUser?.name) ?? ''} textStyle="u_headline_big" color={0xffffff} background={HELP_USER_HEADER_COLOR} />
                                            </span>
                                        )}
                                        {(activeReport.reportType === ReportType.BULLY || activeReport.reportType === ReportType.EMERGENCY) && (
                                            <button type="button" className="help-change-user" onClick={changeUser}>
                                                <HelpText text={LocalizeText('help.cfh.selected_user.change')} textStyle="id_link_strong" background={HELP_USER_HEADER_COLOR} color={0xefefef} underline maxWidth={256} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {step}
                            </div>
                        </section>
                    </div>
                </DraggableWindow>
            )}
            {isOpen && alertKey && <HelpAlertView message={LocalizeText(alertKey)} onClose={() => setAlertKey(null)} />}
            <SanctionSatusView />
            <NameChangeView />
        </HelpAlertContext.Provider>
    );
};
