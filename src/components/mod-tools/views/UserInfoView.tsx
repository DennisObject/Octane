import { ModeratorInitData } from '@octane/renderer';
import { FC, useMemo } from 'react';
import userInfoFrameXml from '../../../assets/mod-tools/xml/user_info_frame.xml?raw';
import { nativeNumber, parseNativeLayout } from '../native/NativeLayout';
import { Native0Frame } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { UserInfoPanel } from './UserInfoPanel';

export interface UserInfoProps {
    userId: number;
    settings: ModeratorInitData;
    x: number;
    y: number;
    onClose: () => void;
    onOpenChatlog: () => void;
    onOpenSendMessage: (userName: string) => void;
    onOpenModAction: (userName: string) => void;
    onOpenRoomVisits: () => void;
}

// Classic v75 user info window (X5, user_info_frame): the frame captioned "User Info" around the user info panel.
export const UserInfoView: FC<UserInfoProps> = ({ userId, settings, x, y, onClose, onOpenChatlog, onOpenSendMessage, onOpenModAction, onOpenRoomVisits }) => {
    const root = useMemo(() => parseNativeLayout(userInfoFrameXml), []);

    return (
        <NativeWindowShell type="userInfo" windowKey={`${userId}`} x={x} y={y}>
            <Native0Frame caption="User Info" height={nativeNumber(root, 'height')} width={nativeNumber(root, 'width')} onClose={onClose}>
                <UserInfoPanel settings={settings} userId={userId} onOpenChatlog={onOpenChatlog} onOpenModAction={onOpenModAction} onOpenRoomVisits={onOpenRoomVisits} onOpenSendMessage={onOpenSendMessage} />
            </Native0Frame>
        </NativeWindowShell>
    );
};
