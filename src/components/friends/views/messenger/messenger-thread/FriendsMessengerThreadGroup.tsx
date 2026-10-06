import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager, GetSessionDataManager, MessengerMessageType } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useId, useMemo, useState } from 'react';
import { FriendlyTime, GetGroupChatData, LocalizeText, MessengerGroupType, MessengerThread, MessengerThreadChat, MessengerThreadChatGroup, useHabbiconCatalog } from '../../../../../api';
import MessengerCaution from '../../../../../assets/images/friends/messenger_caution.png';
import MessengerNotificationIcon from '../../../../../assets/images/friends/messenger_notification_icon.png';
import TabSkin from '../../../../../assets/images/friends/swf/illumina_light_border_sunk.png';
import InputSkin from '../../../../../assets/images/friends/swf/illumina_light_input_chat.png';
import { LayoutHabbiconImageView } from '../../../../../common';
import { useFriends, useMessenger } from '../../../../../hooks';

const avatarCache = new Map<string, string>();

export const MessengerAvatarView: FC<{ figure: string; headOnly?: boolean; direction?: number }> = ({ figure, headOnly = false, direction = 2 }) => {
    const [source, setSource] = useState('');
    useEffect(() => {
        let disposed = false;
        const key = `${figure}:${headOnly}:${direction}`;
        const render = () => {
            if (disposed || !figure) return;
            const avatar = GetAvatarRenderManager().createAvatarImage(figure, headOnly ? AvatarScaleType.SMALL : AvatarScaleType.LARGE, null, { resetFigure: render, dispose: null, disposed: false });
            if (!avatar) return;
            const set = headOnly ? AvatarSetType.HEAD : AvatarSetType.FULL;
            avatar.setDirection(set, direction);
            const url = avatar.processAsImageUrl(set);
            if (url && !avatar.isPlaceholder()) {
                if (avatarCache.size >= 200) avatarCache.delete(avatarCache.keys().next().value);
                avatarCache.set(key, url);
            }
            avatar.dispose();
            if (!disposed) setSource(url || '');
        };
        setSource('');
        if (avatarCache.has(key)) setSource(avatarCache.get(key));
        else render();
        return () => { disposed = true; };
    }, [figure, headOnly, direction]);
    return source && figure ? <img className={headOnly ? 'messenger-native-head' : 'messenger-native-avatar'} src={source} alt="" draggable={false} /> : null;
};

type SkinPart = { source: [number, number, number, number]; style: CSSProperties };
const tabParts: SkinPart[] = [
    {"source": [0, 0, 12, 14], "style": {"position": "absolute", "left": 0, "top": 0, "width": 12, "height": 14}},
    {"source": [12, 0, 12, 14], "style": {"position": "absolute", "left": 12, "top": 0, "width": "calc(100% - 18px)", "height": 14}},
    {"source": [24, 0, 6, 14], "style": {"position": "absolute", "right": 0, "top": 0, "width": 6, "height": 14}},
    {"source": [0, 14, 8, 12], "style": {"position": "absolute", "left": 0, "top": 14, "width": 8, "height": "calc(100% - 18px)"}},
    {"source": [8, 14, 21, 12], "style": {"position": "absolute", "left": 8, "top": 14, "width": "calc(100% - 9px)", "height": "calc(100% - 18px)"}},
    {"source": [29, 14, 1, 12], "style": {"position": "absolute", "right": 0, "top": 14, "width": 1, "height": "calc(100% - 18px)"}},
    {"source": [0, 26, 8, 4], "style": {"position": "absolute", "left": 0, "bottom": 0, "width": 8, "height": 4}},
    {"source": [8, 26, 18, 4], "style": {"position": "absolute", "left": 8, "bottom": 0, "width": "calc(100% - 12px)", "height": 4}},
    {"source": [26, 26, 4, 4], "style": {"position": "absolute", "right": 0, "bottom": 0, "width": 4, "height": 4}}
];
const inputParts: SkinPart[] = [
    {"source": [30, 0, 5, 8], "style": {"position": "absolute", "left": 0, "top": 0, "width": 5, "height": 8}},
    {"source": [35, 0, 19, 8], "style": {"position": "absolute", "left": 5, "top": 0, "width": "calc(100% - 10px)", "height": 8}},
    {"source": [54, 0, 5, 8], "style": {"position": "absolute", "right": 0, "top": 0, "width": 5, "height": 8}},
    {"source": [31, 8, 27, 16], "style": {"position": "absolute", "left": 1, "top": 8, "width": "calc(100% - 2px)", "height": "calc(100% - 13px)"}},
    {"source": [30, 24, 5, 4], "style": {"position": "absolute", "left": 0, "bottom": 1, "width": 5, "height": 4}},
    {"source": [35, 24, 19, 4], "style": {"position": "absolute", "left": 5, "bottom": 1, "width": "calc(100% - 10px)", "height": 4}},
    {"source": [54, 24, 5, 4], "style": {"position": "absolute", "right": 0, "bottom": 1, "width": 5, "height": 4}},
    {"source": [0, 0, 4, 4], "style": {"position": "absolute", "left": 0, "top": 0, "width": 4, "height": 4}},
    {"source": [4, 0, 21, 1], "style": {"position": "absolute", "left": 4, "top": 0, "width": "calc(100% - 8px)", "height": 1}},
    {"source": [25, 0, 4, 4], "style": {"position": "absolute", "right": 0, "top": 0, "width": 4, "height": 4}},
    {"source": [0, 4, 1, 20], "style": {"position": "absolute", "left": 0, "top": 4, "width": 1, "height": "calc(100% - 9px)"}},
    {"source": [28, 4, 1, 20], "style": {"position": "absolute", "right": 0, "top": 4, "width": 1, "height": "calc(100% - 9px)"}},
    {"source": [0, 24, 4, 5], "style": {"position": "absolute", "left": 0, "bottom": 0, "width": 4, "height": 5}},
    {"source": [4, 27, 21, 2], "style": {"position": "absolute", "left": 4, "bottom": 0, "width": "calc(100% - 8px)", "height": 2}},
    {"source": [25, 24, 4, 5], "style": {"position": "absolute", "right": 0, "bottom": 0, "width": 4, "height": 5}}
];

export const MessengerBorderView: FC<{ tab?: boolean; invitation?: boolean }> = ({ tab = false, invitation = false }) => {
    const tintId = useId();
    return <span aria-hidden="true" className="messenger-native-border">
        {invitation && <svg width="0" height="0"><defs><filter id={tintId} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0.8196078431 0 0 0 0 0 0.937254902 0 0 0 0 0 0.8705882353 0 0 0 0 0 1 0" /></filter></defs></svg>}
        {(tab ? tabParts : inputParts).map((part, index) => <svg key={index} style={part.style} viewBox={part.source.join(' ')} preserveAspectRatio="none">
            <image href={tab ? TabSkin : InputSkin} width={tab ? 30 : 59} height={tab ? 30 : 29} filter={invitation && index < 7 ? `url(#${tintId})` : undefined} />
        </svg>)}
    </span>;
};

export const FriendsMessengerThreadGroup: FC<{ thread: MessengerThread; group: MessengerThreadChatGroup; now?: number }> = ({ thread, group, now = Date.now() }) => {
    const { getFriend } = useFriends();
    const { getOfflinePlaceholder } = useMessenger();
    const habbicons = useHabbiconCatalog();
    const groupChatData = useMemo(() => group.type === MessengerGroupType.GROUP_CHAT && GetGroupChatData(group.chats[0].extraData), [group]);
    const own = group.userId === GetSessionDataManager().userId;
    const friend = getFriend(thread.participant.id);

    if (!group.userId) return <>{group.chats.map((chat) => chat.type === MessengerThreadChat.STATUS_NOTIFICATION
        ? <div key={chat.id} className="messenger-status-notification">{chat.message}</div>
        : <div key={chat.id} className={`messenger-notification${chat.type === MessengerThreadChat.ROOM_INVITE ? ' invitation' : ''}`}>
            <MessengerBorderView invitation={chat.type === MessengerThreadChat.ROOM_INVITE} />
            <i className="messenger-notice-icon"><img src={chat.type === MessengerThreadChat.ROOM_INVITE ? MessengerNotificationIcon : MessengerCaution} alt="" /></i>
            <span>{chat.type === MessengerThreadChat.ROOM_INVITE ? `${LocalizeText('messenger.invitation')} ${chat.message}` : chat.message}</span>
        </div>)}</>;

    const name = own ? GetSessionDataManager().userName : groupChatData?.username || thread.participant.name;
    const figure = own ? GetSessionDataManager().figure : groupChatData?.figure || friend?.figure || thread.participant.figure;
    const latest = group.chats[group.chats.length - 1];
    const elapsed = Math.max(0, Math.floor((Math.max(now, latest.date.getTime()) - latest.date.getTime()) / 1000) + latest.secondsSinceSent);
    const offline = own && getOfflinePlaceholder(group.chats[0]);

    return <div className={`messenger-message-row${own ? ' own' : ''}`}>
        <div className="message-avatar"><MessengerAvatarView direction={own ? 2 : 4} figure={figure} /></div>
        <div className="messenger-message-body">
            <div className="messenger-message-name">{name}:</div>
            <div className="messenger-message-bubble">
                {group.chats.map((chat) => {
                    if (chat.type !== MessengerMessageType.Habbicon) return <div key={chat.id} className="messenger-message-text">{chat.message}</div>;
                    const id = Number(chat.message);
                    const entry = habbicons.entries.find((item) => item.id === id);
                    return <LayoutHabbiconImageView key={chat.id} id={id} size={80} mirror={!!entry?.dir && entry.dir !== (own ? 1 : -1)} className="messenger-habbicon-message" />;
                })}
            </div>
            <div className="messenger-message-time">{FriendlyTime.format(elapsed, '.ago', 1)}</div>
            {offline && <div className="messenger-offline-placeholder">{LocalizeText('messenger.notification.persisted_message_sent')}</div>}
        </div>
        <i className="messenger-bubble-arrow" />
    </div>;
};
