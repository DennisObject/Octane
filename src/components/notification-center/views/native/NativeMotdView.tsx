import { FC, useState } from 'react';
import { localizeWithFallback, SanitizeHtml } from '../../../../api';
import motdFrame from '../../../../assets/images/notifications/motd-frame-4c4c4c.png';
import motdHeader from '../../../../assets/images/notifications/motd-header-4c4c4c.png';
import { FriendsDialogBorderView, FriendsDialogButtonView, FriendsDialogFrameTint, FriendsDialogFrameView } from '../../../friends/views/friends-list/FriendsListRoomInviteView';

const MOTD_SIZE = { width: 436, height: 227 };
// Style 1 frame with color 0x4c4c4c: the blue friends frame multiplied by the colour.
const MOTD_TINT: FriendsDialogFrameTint = { frame: motdFrame, header: motdHeader, title: '#4c4c4c' };

// motd_notification_xml: 436x227 frame, a 420x160 border holding the scrollable message list (messages at x5, text height + 20) and an OK button.
export const NativeMotdView: FC<{ title: string; messages: string[]; onClose: () => void }> = ({ title, messages, onClose }) => {
    const [position] = useState(() => ({ x: Math.round((window.innerWidth - MOTD_SIZE.width) / 2), y: Math.round((window.innerHeight - MOTD_SIZE.height) / 2) }));

    return (
        <FriendsDialogFrameView className="octane-alert octane-native-motd" initialPosition={position} size={MOTD_SIZE} tint={MOTD_TINT} title={title} onCloseClick={onClose}>
            <div className="octane-native-motd-border">
                <FriendsDialogBorderView width={420} height={160} />
            </div>
            <div className="octane-native-motd-list">
                {messages.map((message, index) => (
                    <div key={index} className="octane-native-motd-item" dangerouslySetInnerHTML={{ __html: SanitizeHtml(message.replace(/\r\n|\r|\n/g, '<br />')) }} />
                ))}
            </div>
            <div className="octane-native-motd-ok">
                <FriendsDialogButtonView caption={localizeWithFallback('generic.ok', 'OK')} height={26} width={31} onClick={onClose} />
            </div>
        </FriendsDialogFrameView>
    );
};
