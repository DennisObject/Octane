import { AddLinkEventTracker, FollowFriendMessageComposer, GetSessionDataManager, GroupInformationComposer, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { CSSProperties, FC, KeyboardEvent, PointerEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GetUserProfile, LocalizeText, ReportType, SendMessageComposer, useHabbiconCatalog } from '../../../../api';
import SubmitSkin from '../../../../assets/images/friends/messenger-submit.png';
import { HabbiconsDmIcon } from '../../../../assets/images/habbicons';
import { DraggableWindow, DraggableWindowPosition, LayoutBadgeImageView } from '../../../../common';
import { useFriends, useHelp, useMessenger } from '../../../../hooks';
import './FriendsMessengerView.css';
import { FriendsMessengerHabbiconPickerView } from './FriendsMessengerHabbiconPickerView';
import { MessengerAvatarView, MessengerBorderView } from './messenger-thread/FriendsMessengerThreadGroup';
import { FriendsMessengerThreadView } from './messenger-thread/FriendsMessengerThreadView';

type SubmitPart = { source: [number, number, number, number]; style: CSSProperties; layer: string };
const submitParts: SubmitPart[] = [
    {"source": [11, 0, 19, 19], "style": {"position": "absolute", "left": 0, "width": 19, "top": 0, "height": 19}, "layer": "glow"},
    {"source": [30, 0, 12, 19], "style": {"position": "absolute", "left": 19, "width": "calc(100% - 38px)", "top": 0, "height": 19}, "layer": "glow"},
    {"source": [42, 0, 19, 19], "style": {"position": "absolute", "right": 0, "width": 19, "top": 0, "height": 19}, "layer": "glow"},
    {"source": [11, 19, 19, 12], "style": {"position": "absolute", "left": 0, "width": 19, "top": 19, "height": "calc(100% - 38px)"}, "layer": "glow"},
    {"source": [42, 19, 19, 12], "style": {"position": "absolute", "right": 0, "width": 19, "top": 19, "height": "calc(100% - 38px)"}, "layer": "glow"},
    {"source": [11, 31, 19, 19], "style": {"position": "absolute", "left": 0, "width": 19, "bottom": 0, "height": 19}, "layer": "glow"},
    {"source": [30, 31, 12, 19], "style": {"position": "absolute", "left": 19, "width": "calc(100% - 38px)", "bottom": 0, "height": 19}, "layer": "glow"},
    {"source": [42, 31, 19, 19], "style": {"position": "absolute", "right": 0, "width": 19, "bottom": 0, "height": 19}, "layer": "glow"},
    {"source": [0, 0, 6, 8], "style": {"position": "absolute", "left": 11, "width": 6, "top": 11, "height": 8}, "layer": "surface"},
    {"source": [6, 0, 1, 8], "style": {"position": "absolute", "left": 17, "width": "calc(100% - 32px)", "top": 11, "height": 8}, "layer": "surface"},
    {"source": [7, 0, 4, 8], "style": {"position": "absolute", "right": 11, "width": 4, "top": 11, "height": 8}, "layer": "surface"},
    {"source": [0, 8, 6, 12], "style": {"position": "absolute", "left": 11, "width": 6, "top": 19, "height": "calc(100% - 38px)"}, "layer": "surface"},
    {"source": [6, 8, 1, 12], "style": {"position": "absolute", "left": 17, "width": "calc(100% - 32px)", "top": 19, "height": "calc(100% - 38px)"}, "layer": "surface"},
    {"source": [7, 8, 4, 12], "style": {"position": "absolute", "right": 11, "width": 4, "top": 19, "height": "calc(100% - 38px)"}, "layer": "surface"},
    {"source": [0, 20, 6, 8], "style": {"position": "absolute", "left": 11, "width": 6, "bottom": 11, "height": 8}, "layer": "surface"},
    {"source": [6, 20, 1, 8], "style": {"position": "absolute", "left": 17, "width": "calc(100% - 32px)", "bottom": 11, "height": 8}, "layer": "surface"},
    {"source": [7, 20, 4, 8], "style": {"position": "absolute", "right": 11, "width": 4, "bottom": 11, "height": 8}, "layer": "surface"},
    {"source": [1, 31, 3, 5], "style": {"position": "absolute", "left": 12, "width": 3, "top": "calc(50% + -1px)", "height": 5}, "layer": "curve"},
    {"source": [7, 31, 3, 5], "style": {"position": "absolute", "right": 12, "width": 3, "top": "calc(50% + -1px)", "height": 5}, "layer": "curve"}
];

const MessengerSubmitSkin: FC = () => <span aria-hidden="true" className="messenger-submit-skin">
    {submitParts.map((part, index) => <svg key={index} style={part.style} className={part.layer} viewBox={part.source.join(' ')} preserveAspectRatio="none">
        <image href={SubmitSkin} width="61" height="150" />
    </svg>)}
</span>;

const MessengerPlainCurves: FC = () => <span aria-hidden="true" className="messenger-plain-curves"><i /><i /></span>;

export const FriendsMessengerView: FC = () => {
    const windowRef = useRef<HTMLDivElement>(null);
    const avatarBarRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLDivElement>(null);
    const habbiconRef = useRef<HTMLButtonElement>(null);
    const messagesBox = useRef<HTMLDivElement>(null);
    const [visibleAvatarCount, setVisibleAvatarCount] = useState(7);
    const [isVisible, setIsVisible] = useState(false);
    const [lastThreadId, setLastThreadId] = useState(-1);
    const [messageText, setMessageText] = useState('');
    const [pickerPosition, setPickerPosition] = useState<{ left: number; top: number }>(null);
    const [avatarStartIndex, setAvatarStartIndex] = useState(0);
    const { visibleThreads, activeThread, getMessageThread, sendMessage, sendHabbiconMessage, setActiveThreadId, closeThread } = useMessenger();
    const { getFriend } = useFriends();
    const { report } = useHelp();
    const habbiconCatalog = useHabbiconCatalog();
    const resizeStart = useRef<{ x: number; y: number; width: number; height: number; scaleX: number; scaleY: number }>(null);

    const positionPicker = () => {
        if (!habbiconRef.current || !inputRef.current) return;
        const button = habbiconRef.current.getBoundingClientRect();
        const input = inputRef.current.getBoundingClientRect();
        setPickerPosition({ left: button.left, top: input.top - 4 });
    };
    const hideMessenger = useCallback(() => {
        if (activeThread?.threadId) setLastThreadId(activeThread.threadId);
        setPickerPosition(null);
        setActiveThreadId(-1);
        setIsVisible(false);
    }, [activeThread?.threadId, setActiveThreadId]);
    const showMessenger = useCallback((threadId?: number) => {
        const previous = visibleThreads.find((thread) => thread.threadId === lastThreadId);
        const id = threadId ?? activeThread?.threadId ?? previous?.threadId ?? visibleThreads[0]?.threadId;
        if (!id) return;
        setActiveThreadId(id, threadId !== undefined);
        setIsVisible(true);
    }, [visibleThreads, lastThreadId, activeThread?.threadId, setActiveThreadId]);
    const closeConversation = () => {
        if (!activeThread) return;
        closeThread(activeThread.threadId);
        setPickerPosition(null);
        if (visibleThreads.length === 1) {
            setLastThreadId(-1);
            setIsVisible(false);
        }
    };
    const startResize = (event: PointerEvent<HTMLDivElement>) => {
        const element = windowRef.current;
        if (!element) return;
        event.stopPropagation();
        event.preventDefault();
        const bounds = element.getBoundingClientRect();
        resizeStart.current = { x: event.clientX, y: event.clientY, width: element.offsetWidth, height: element.offsetHeight, scaleX: bounds.width / element.offsetWidth, scaleY: bounds.height / element.offsetHeight };
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const resizeWindow = (event: PointerEvent<HTMLDivElement>) => {
        const start = resizeStart.current;
        const element = windowRef.current;
        if (!start || !element) return;
        element.style.width = `${Math.max(282, start.width + (event.clientX - start.x) / start.scaleX)}px`;
        element.style.height = `${Math.max(275, start.height + (event.clientY - start.y) / start.scaleY)}px`;
        if (pickerPosition) positionPicker();
    };
    const stopResize = () => { resizeStart.current = null; };
    const followFriend = () => {
        if (!activeThread) return;
        SendMessageComposer(activeThread.participant.id > 0 ? new FollowFriendMessageComposer(activeThread.participant.id) : new GroupInformationComposer(Math.abs(activeThread.participant.id), false));
    };
    const openProfile = () => {
        if (!activeThread) return;
        if (activeThread.participant.id > 0) GetUserProfile(activeThread.participant.id);
        else SendMessageComposer(new GroupInformationComposer(Math.abs(activeThread.participant.id), true));
    };
    const send = () => {
        if (!activeThread || !messageText.length) return;
        sendMessage(activeThread, GetSessionDataManager().userId, messageText);
        setMessageText('');
    };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
        event.preventDefault();
        send();
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url) => {
                const parts = url.split('/');
                if (parts.length !== 2) return;
                if (parts[1] === 'open') showMessenger();
                else if (parts[1] === 'toggle') {
                    if (isVisible) hideMessenger();
                    else showMessenger();
                } else {
                    const participantId = parseInt(parts[1]);
                    if (!getFriend(participantId)) return;
                    const thread = getMessageThread(participantId);
                    if (thread) showMessenger(thread.threadId);
                }
            },
            eventUrlPrefix: 'friends-messenger/'
        };
        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [getFriend, getMessageThread, showMessenger, hideMessenger, isVisible]);

    useLayoutEffect(() => {
        if (isVisible && messagesBox.current) messagesBox.current.scrollTop = messagesBox.current.scrollHeight;
    }, [isVisible, activeThread]);

    useLayoutEffect(() => {
        const bar = avatarBarRef.current;
        if (!isVisible || !bar) return;
        const measure = () => {
            const count = Math.max(1, Math.floor(bar.clientWidth / 35));
            setVisibleAvatarCount(count);
            setAvatarStartIndex((current) => Math.min(current, Math.max(0, visibleThreads.length - count)));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(bar);
        return () => observer.disconnect();
    }, [isVisible, visibleThreads.length]);

    const maximumAvatarStart = Math.max(0, visibleThreads.length - visibleAvatarCount);
    const displayedThreads = visibleThreads.slice(avatarStartIndex, avatarStartIndex + visibleAvatarCount);
    const scrollAvatars = (direction: -1 | 1) => setAvatarStartIndex((current) => Math.max(0, Math.min(maximumAvatarStart, current + direction)));
    if (!isVisible) return null;

    return <>
        <DraggableWindow uniqueKey="volt-messenger" handleSelector=".messenger-drag" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={8}>
            <div ref={windowRef} className="messenger-window" onPointerDown={(event) => {
                if (pickerPosition && !habbiconRef.current?.contains(event.target as Node)) setPickerPosition(null);
            }}>
                <div className="messenger-drag" />
                <button type="button" className="messenger-minimize" aria-label={LocalizeText('generic.close')} onClick={hideMessenger} />
                <div className="messenger-open-title">{LocalizeText('messenger.window.title', ['open_chat_count', 'OPEN_CHAT_COUNT'], [String(visibleThreads.length), String(visibleThreads.length)])}</div>
                <div className="messenger-avatar-navigation">
                    <button type="button" className="messenger-avatar-scroll left" data-action="scroll-left" aria-label={LocalizeText('generic.previous')} disabled={avatarStartIndex === 0} onClick={() => scrollAvatars(-1)} />
                    <div ref={avatarBarRef} className="messenger-avatar-bar">
                        {displayedThreads.map((thread) => <button key={thread.threadId} type="button" data-participant-id={thread.participant.id}
                            className={`messenger-avatar-tab${activeThread?.threadId === thread.threadId ? ' active' : ''}${thread.unread ? ' unread' : ''}`}
                            aria-label={thread.participant.name} aria-pressed={activeThread?.threadId === thread.threadId} onClick={() => { setActiveThreadId(thread.threadId); setPickerPosition(null); }}>
                            {activeThread?.threadId === thread.threadId && <MessengerBorderView tab />}
                            {thread.participant.id > 0 ? <MessengerAvatarView figure={getFriend(thread.participant.id)?.figure || thread.participant.figure} headOnly />
                                : <div className="messenger-group-badge"><LayoutBadgeImageView badgeCode={thread.participant.figure} isGroup showInfo={false} /></div>}
                        </button>)}
                    </div>
                    <button type="button" className="messenger-avatar-scroll right" data-action="scroll-right" aria-label={LocalizeText('generic.next')} disabled={avatarStartIndex >= maximumAvatarStart} onClick={() => scrollAvatars(1)} />
                </div>
                {activeThread && <>
                    <div className="messenger-thread-name"><span>{LocalizeText('messenger.window.separator', ['friend_name', 'FRIEND_NAME'], [activeThread.participant.name, activeThread.participant.name])}</span></div>
                    <div className="messenger-actions">
                        <button type="button" className="messenger-btn icon-btn follow" aria-label={LocalizeText('messenger.followfriend.tooltip')} onClick={followFriend}><MessengerPlainCurves /></button>
                        <button type="button" className="messenger-btn icon-btn profile" aria-label={LocalizeText('infostand.profile.link.tooltip')} onClick={openProfile}><MessengerPlainCurves /></button>
                        {activeThread.participant.id > 0 && <button type="button" className="messenger-btn danger" onClick={() => report(ReportType.IM, { reportedUserId: activeThread.participant.id })}><MessengerPlainCurves />{LocalizeText('messenger.window.button.report')}</button>}
                    </div>
                    <button type="button" className="messenger-btn close-btn" aria-label={LocalizeText('generic.close')} onClick={closeConversation} />
                    <div ref={messagesBox} className="chat-messages"><FriendsMessengerThreadView thread={activeThread} /></div>
                    <div ref={inputRef} className="messenger-input-row">
                        <MessengerBorderView />
                        <input maxLength={120} placeholder={LocalizeText('messenger.window.input.default', ['friend_name', 'FRIEND_NAME'], [activeThread.participant.name, activeThread.participant.name])} type="text" value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={onKeyDown} />
                        <button type="button" className="messenger-btn send" onClick={send}><MessengerSubmitSkin /><span>{LocalizeText('widgets.chatinput.say')}</span></button>
                    </div>
                    <button ref={habbiconRef} type="button" className="messenger-btn habbicon" aria-label={LocalizeText('messenger.habbicons.tooltip')}
                        onMouseDown={(event) => event.stopPropagation()} onClick={() => pickerPosition ? setPickerPosition(null) : positionPicker()}><MessengerPlainCurves /><img alt="" src={HabbiconsDmIcon} /></button>
                </>}
                <div className="messenger-resize-handle" aria-hidden="true" onPointerDown={startResize} onPointerMove={resizeWindow} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} />
            </div>
        </DraggableWindow>
        {pickerPosition && activeThread && createPortal(<div className="messenger-picker-host" style={pickerPosition}>
            <FriendsMessengerHabbiconPickerView onClose={() => setPickerPosition(null)} onOpenHub={() => { setPickerPosition(null); habbiconCatalog.setBookVisible(true); }}
                onSelect={(id, keepOpen) => { sendHabbiconMessage(activeThread, id); if (!keepOpen) setPickerPosition(null); }} />
        </div>, document.body)}
    </>;
};
