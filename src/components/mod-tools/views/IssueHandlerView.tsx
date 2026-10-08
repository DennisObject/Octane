import { CallForHelpCategoryData, CloseIssuesMessageComposer, ModeratorInitData } from '@octane/renderer';
import { FC, useMemo, useRef, useState } from 'react';
import { SendMessageComposer } from '../../../api';
import issueHandlerXml from '../../../assets/mod-tools/xml/issue_handler.xml?raw';
import { IssueManagerContext, isBundleWriteHeld, issueOpenTime, nextOpenBundle, pickNext, releaseBundle, useIssueManagerStore } from '../../../hooks';
import { Native100Dropmenu } from '../native/NativeDropmenu100';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Button, Native0Checkbox, Native0Frame, Native0Rows, Native0Scrollbar, Native0Text } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { EvidenceChatlogList, useEvidence } from './EvidenceChatlogList';
import { UserInfoPanel } from './UserInfoPanel';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const SHADE = 0xa2d6ea;
const GAP = 3;
const SOURCES: Record<number, string> = { 1: 'Normal', 2: 'Normal', 3: 'Automatic', 4: 'Automatic IM', 5: 'Guide System', 6: 'IM', 7: 'Room', 8: 'Panic', 9: 'Guardian', 10: 'Automatic Helper', 11: 'Discussion', 12: 'Selfie', 14: 'Photo', 15: 'Ambassador' };
const CATEGORIES: Record<number, string> = {
    0: 'Automatic', 101: 'Sex', 102: 'PII', 103: 'Scam', 104: 'Bullying', 105: 'Disruption', 106: 'Other', 111: 'Sex', 112: 'Scam', 113: 'Disruption', 114: 'Other', 121: 'Sex', 122: 'PII',
    123: 'Bullying', 124: 'Other', 130: 'Hate', 131: 'Violence', 132: 'Sex', 133: 'Illegal', 134: 'PII', 135: 'Copyright', 136: 'Spam', 1024: 'Guide', 1025: 'Bullying', 1026: 'Severe Alert'
};
/** cme._r914cf700ae539f: the issue category for which the topic menu is disabled (28, cme._r914733ad31df97, needs a topic before a sanction). */
const CATEGORY_NO_TOPIC = 27;
const CLOSE_USELESS = 1;
const CLOSE_RESOLVED = 3;

// the white bold headings on the frame blue carry the same faint glow as the frame captions (about 16%)
const HANDLER_GLOW = 0.16;

export interface IssueHandlerProps {
    bundleId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    settings: ModeratorInitData;
    categories: CallForHelpCategoryData[];
    context: IssueManagerContext;
    localize: (key: string) => string;
    onClose: () => void;
    onResize: (width: number, height: number) => void;
    /** The user info window of a user, opened next to the given parent rectangle (the handler, or the chat container whose local position the classic client uses). */
    onOpenUserInfo: (userId: number, parent: { x: number; y: number; width: number; height: number } | null) => void;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
    onOpenSendMessage: (userId: number, userName: string) => void;
    onOpenModAction: (userId: number, userName: string) => void;
    onOpenRoomVisits: (userId: number) => void;
    onOpenChatlog: (userId: number) => void;
}

// Classic v75 issue handler (cme, issue_handler): the issues of one bundle with the reporter's and the reported user's info panels and the messages on the left, the evidence chatlog
// of the selected issue on the right, "Close as useless" / "Close as resolved" / "Release", "Automatically open next issue" (picks the next open bundle after closing or releasing)
// and the topic menu. It opens at the saved position (0, 0 until the server sends one). The default sanction path (CFH topic lookup and "Default Sanction") is held: the
// native packets for it have no server handler and no matching SDK composer.
export const IssueHandlerView: FC<IssueHandlerProps> = ({
    bundleId,
    x,
    y,
    width,
    height,
    settings,
    categories,
    context,
    localize,
    onClose,
    onResize,
    onOpenUserInfo,
    onOpenRoomTool,
    onEnterRoom,
    onOpenSendMessage,
    onOpenModAction,
    onOpenRoomVisits,
    onOpenChatlog
}) => {
    const root = useMemo(() => parseNativeLayout(issueHandlerXml), []);
    useIssueManagerStore((state) => state.version);

    const bundle = useIssueManagerStore((state) => state.bundles.get(bundleId)) ?? null;
    const [selectedIssueId, setSelectedIssueId] = useState<number>(null);
    const [autoNext, setAutoNext] = useState(true);
    // the handler is disposed by its first close or release: a second call of a captured callback before it is gone must not send (or pick) again
    const finishedRef = useRef(false);
    const [chosenTopic, setChosenTopic] = useState(-1);
    const [menuOpen, setMenuOpen] = useState(false);
    const [messageOffset, setMessageOffset] = useState(0);
    const issues = bundle ? [...bundle.issues.values()] : [];
    const primary = bundle?.primary ?? null;
    const current = issues.find((tracked) => tracked.issue.issueId === selectedIssueId) ?? primary;
    const topics = useMemo(() => categories.flatMap((category) => category.topics ?? []), [categories]);
    const topicNames = topics.map((topic) => localize(`help.cfh.topic.${topic.id}`));
    const categoryId = primary?.issue.reportedCategoryId ?? 0;
    // the menu starts on the topic of the issue's category (cme._r1c8a7de5be5589)
    const topicIndex = chosenTopic >= 0 ? chosenTopic : topics.findIndex((topic) => topic.id === categoryId);
    const evidence = useEvidence('cfh', current?.issue.issueId ?? 0);

    if (!bundle || !current) return null;

    const stretch = height - 650;
    const left = rectOf(findNativeNode(root, 'issue_cont'));
    const header = findNativeNode(root, 'issues_header');
    const listNode = findNativeNode(root, 'issues_item_list');
    const region = listNode.children[0];
    const msgList = findNativeNode(root, 'msg_item_list');
    const buttons = rectOf(findNativeNode(root, 'buttons'));
    const buttonNode = (name: string) => findNativeNode(root, name);
    const menu = rectOf(findNativeNode(root, 'cfh_topics'));
    const chatCont = rectOf(findNativeNode(root, 'chat_cont'));
    const evidenceList = rectOf(findNativeNode(root, 'evidence_list'));
    const scroller = rectOf(findNativeNode(root, 'scroller'));
    const reportedShown = bundle.reportedUserId > 0;
    const itemX = (node: NativeNode, name: string) => rectOf(findNativeNode(node, name));

    // the left column is a vertical item list with 3px between its items; with the window taller or shorter than its default the two lists share what is left
    const listHeights = (() => {
        const fixed = 13 + 13 + 207 + 14 + 13 + (reportedShown ? 207 : 0) - (reportedShown ? 0 : 13) + (reportedShown ? 3 * 7 : 3 * 5);
        const visible = left.height + stretch;

        return stretch === 0 ? 70 : Math.max(16, (visible - fixed - 70 - 70 + 140) * 0.5 + 0);
    })();
    const rows = { issues: listHeights, messages: listHeights };
    let cursor = 0;
    const place = (itemHeight: number) => {
        const at = cursor;

        cursor += itemHeight + GAP;

        return at;
    };
    const yHeader = place(13);
    const yIssues = place(rows.issues);
    const yCallerCaption = place(13);
    const yCaller = place(207);
    const yMessagesCaption = place(14);
    const yMessages = place(rows.messages);
    const yReportedCaption = reportedShown ? place(13) : 0;
    const yReported = reportedShown ? place(207) : 0;

    const sourceOf = (tracked: typeof current) => SOURCES[tracked.issue.categoryId] ?? 'Unknown';
    const categoryOf = (id: number) => {
        const text = localize(`help.cfh.topic.${id}`);

        return text && text !== `help.cfh.topic.${id}` ? text : (CATEGORIES[id] ?? 'Unknown');
    };

    // closing, releasing: the next open bundle is picked when the checkbox is on, and the handler goes away (_r05ad52a6ed9ad8)
    const finish = () => {
        finishedRef.current = true;

        if (autoNext && !isBundleWriteHeld(nextOpenBundle())) pickNext('issue handler pick next', context);

        onClose();
    };
    const closeHeld = isBundleWriteHeld(bundle);
    const closeAs = (resolution: number) => {
        if (closeHeld || finishedRef.current) return;

        SendMessageComposer(new CloseIssuesMessageComposer(bundle.issueIds, resolution));
        finish();
    };

    const messageRows = issues.map((tracked, index) => {
        const text = `${tracked.issue.reporterUserName}: ${tracked.issue.message}`;

        return { text, color: index % 2 === 0 ? SHADE : 0xffffff, height: 19 };
    });
    const messagesHeight = messageRows.reduce((sum, row) => sum + row.height, 0);
    const msgOverflow = messagesHeight > rows.messages;
    const clampedMessages = Math.max(0, Math.min(Math.max(0, messagesHeight - rows.messages), messageOffset));

    const callerId = current.issue.reporterUserId;
    const chatRect = { x: chatCont.x, y: chatCont.y, width: chatCont.width, height: chatCont.height };
    const panelHandlers = (userId: number) => ({
        onOpenChatlog: () => onOpenChatlog(userId),
        onOpenModAction: (userName: string) => onOpenModAction(userId, userName),
        onOpenRoomVisits: () => onOpenRoomVisits(userId),
        onOpenSendMessage: (userName: string) => onOpenSendMessage(userId, userName)
    });

    return (
        <NativeWindowShell type="issueHandler" windowKey={`${bundleId}`} x={x} y={y}>
            <Native0Frame caption={nativeCaption(root)} height={height} width={width} onClose={() => onClose()} onResize={(_, h) => onResize(750, Math.max(390, h))}>
                {/* left column */}
                <div className="native0-box" style={{ left: left.x, top: left.y, width: left.width, height: Math.min(left.height + stretch, height - 32), backgroundColor: '#418db0' }} />
                {/* text on an opaque background is set with LCD subpixel fringes: the backgrounds are drawn apart and the texts get a layer of their own */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: 280, height: yHeader + 20, willChange: 'transform', pointerEvents: 'none' }}>
                    {header.children.map((node, index) => (
                        <Native0Text key={index} bold color={0xffffff} glow={HANDLER_GLOW} text={nativeCaption(node)} width={nativeNumber(node, 'width')} x={nativeNumber(node, 'x')} y={yHeader + nativeNumber(node, 'y')} />
                    ))}
                </div>
                <div className="native0-box" style={{ left: 0, top: yIssues, width: 280, height: rows.issues, backgroundColor: '#fff' }} />
                <div className="native0-list" style={{ left: 0, top: yIssues, width: 280, height: rows.issues, willChange: 'transform' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: 280, height: Math.max(rows.issues, issues.length * 16) }}>
                        {issues.map((tracked, index) => (
                            <div key={tracked.issue.issueId} style={{ position: 'absolute', left: 0, top: index * 16, width: 280, height: 16, cursor: 'pointer' }} onClick={() => setSelectedIssueId(tracked.issue.issueId)}>
                                <Native0Text clip height={13} text={tracked.issue.reporterUserName ?? ''} width={78} x={itemX(region, 'reporter').x} y={0} />
                                <Native0Text bold={tracked.issue.issueId === primary?.issue.issueId && issues.length > 1} clip height={13} text={categoryOf(tracked.issue.reportedCategoryId)} width={110} x={itemX(region, 'category').x} y={0} />
                                <Native0Text clip height={13} text={sourceOf(tracked)} width={60} x={itemX(region, 'type').x} y={0} />
                                <Native0Text height={13} text={issueOpenTime(tracked)} width={32} x={itemX(region, 'time_open').x} y={0} />
                            </div>
                        ))}
                    </div>
                </div>
                <Native0Text bold color={0xffffff} glow={HANDLER_GLOW} text="Caller User Info" width={100} x={95} y={yCallerCaption} />
                <div style={{ position: 'absolute', left: 0, top: yCaller, width: 280, height: 207 }}>
                    <UserInfoPanel key={callerId} settings={settings} userId={callerId} {...panelHandlers(callerId)} />
                </div>
                <Native0Text bold color={0xffffff} glow={HANDLER_GLOW} text="Messages" width={60} x={110} y={yMessagesCaption} />
                <div className="native0-box" style={{ left: 0, top: yMessages, width: 280, height: rows.messages, backgroundColor: '#fff' }} />
                <div className="native0-list" style={{ left: 0, top: yMessages, width: 280, height: rows.messages, willChange: 'transform' }} onWheel={(event) => setMessageOffset(Math.max(0, Math.min(Math.max(0, messagesHeight - rows.messages), clampedMessages + event.deltaY * 0.75)))}>
                    <div style={{ position: 'absolute', left: 0, top: -clampedMessages, width: msgOverflow ? 263 : 280, height: messagesHeight }}>
                        <Native0Rows colors={messageRows.map((row) => row.color)} heights={messageRows.map((row) => row.height)} width={msgOverflow ? 263 : 280} />
                        {messageRows.map((row, index) => (
                            <Native0Text key={index} height={19} text={row.text} width={msgOverflow ? 263 : 280} wrap x={0} y={messageRows.slice(0, index).reduce((sum, previous) => sum + previous.height, 0)} />
                        ))}
                    </div>
                </div>
                {msgOverflow && <Native0Scrollbar contentHeight={messagesHeight} height={rows.messages} offset={clampedMessages} viewHeight={rows.messages} x={263} y={yMessages} onOffset={setMessageOffset} />}
                {reportedShown && (
                    <>
                        <Native0Text bold color={0xffffff} glow={HANDLER_GLOW} text="Reported User Info" width={120} x={80} y={yReportedCaption} />
                        <div style={{ position: 'absolute', left: 0, top: yReported, width: 280, height: 207 }}>
                            <UserInfoPanel key={bundle.reportedUserId} settings={settings} userId={bundle.reportedUserId} {...panelHandlers(bundle.reportedUserId)} />
                        </div>
                    </>
                )}
                {/* right column */}
                <div style={{ position: 'absolute', left: buttons.x, top: buttons.y, width: buttons.width, height: buttons.height }}>
                    <Native0Button
                        color={0xff9090}
                        enabled={!closeHeld}
                        height={22}
                        label={nativeCaption(buttonNode('close_useless'))}
                        width={110}
                        x={itemX(buttonNode('buttons'), 'close_useless').x}
                        y={itemX(buttonNode('buttons'), 'close_useless').y}
                        onClick={() => closeAs(CLOSE_USELESS)}
                    />
                    <Native0Button enabled={!closeHeld} height={22} label={nativeCaption(buttonNode('close_resolved'))} width={110} x={itemX(buttonNode('buttons'), 'close_resolved').x} y={itemX(buttonNode('buttons'), 'close_resolved').y} onClick={() => closeAs(CLOSE_RESOLVED)} />
                    <Native0Button
                        height={22}
                        label={nativeCaption(buttonNode('release'))}
                        width={110}
                        x={itemX(buttonNode('buttons'), 'release').x}
                        y={itemX(buttonNode('buttons'), 'release').y}
                        onClick={() => {
                            if (finishedRef.current) return;

                            releaseBundle(bundle.id, context);
                            finish();
                        }}
                    />
                    <Native0Checkbox checked={autoNext} x={itemX(buttonNode('buttons'), 'handle_next_checkbox').x} y={itemX(buttonNode('buttons'), 'handle_next_checkbox').y} onToggle={() => setAutoNext((value) => !value)} />
                    <Native0Text color={0xffffff} glow={HANDLER_GLOW} text={nativeCaption(buttonNode('handle_next_text'))} width={153} x={itemX(buttonNode('buttons'), 'handle_next_text').x} y={itemX(buttonNode('buttons'), 'handle_next_text').y} />
                    {/* held: the default sanction packets have no server handler and no matching SDK composer */}
                    <Native0Button enabled={false} height={22} label={nativeCaption(buttonNode('close_sanction'))} width={110} x={itemX(buttonNode('buttons'), 'close_sanction').x} y={itemX(buttonNode('buttons'), 'close_sanction').y} />
                </div>
                {!evidence && (
                    <div style={{ position: 'absolute', left: chatCont.x, top: chatCont.y }}>
                        <Native0Scrollbar arrowsOpaque blend={0.4} contentHeight={0} height={scroller.height + stretch} offset={0} variant={3} viewHeight={evidenceList.height + stretch} x={scroller.x} y={0} onOffset={() => undefined} />
                    </div>
                )}
                {evidence && (
                    <div style={{ position: 'absolute', left: chatCont.x, top: chatCont.y }}>
                        <EvidenceChatlogList
                            evidence={evidence}
                            listWidth={evidenceList.width}
                            scrollbarHeight={scroller.height + stretch}
                            scrollbarBlend={0.4}
                            scrollbarVariant={3}
                            scrollbarX={scroller.x}
                            viewHeight={evidenceList.height + stretch}
                            onEnterRoom={onEnterRoom}
                            onOpenRoomTool={onOpenRoomTool}
                            onOpenUserInfo={(userId) => onOpenUserInfo(userId, chatRect)}
                        />
                    </div>
                )}
                <Native100Dropmenu
                    caption={topicIndex >= 0 ? topicNames[topicIndex] : nativeCaption(findNativeNode(root, 'cfh_topics'))}
                    height={menu.height}
                    items={topicNames}
                    listExtra={1}
                    open={menuOpen && categoryId !== CATEGORY_NO_TOPIC}
                    selectedIndex={topicIndex}
                    width={menu.width}
                    x={menu.x}
                    y={menu.y}
                    onSelect={(index) => {
                        // the classic client asks for the default sanction of the topic here (My(issueId, -1, topic)); that lookup is held, so only the choice is kept
                        setChosenTopic(index);
                        setMenuOpen(false);
                    }}
                    onToggle={() => categoryId !== CATEGORY_NO_TOPIC && setMenuOpen((value) => !value)}
                />
            </Native0Frame>
        </NativeWindowShell>
    );
};
