import { CSSProperties, FC, PropsWithChildren, useId, useState } from 'react';
import { LocalizeText } from '../../../../api';
import blueFrame from '../../../../assets/images/friends/swf/friends-blue-frame-tinted.png';
import blueAtlas from '../../../../assets/images/habbo-skin/2249_habbo_skin_blue_png$87fbbf84559e7bad0222a9c697b1104d-1406111769.png';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { useNotificationActions } from '../../../../hooks';

export const FRIENDS_DIALOG_SIZES = { invite: { width: 211, height: 175 }, remove: { width: 160, height: 200 } };

export interface FriendsDialogSnapshot {
    key: number;
    ids: number[];
    names: string[];
    caption: string;
    initialPosition: { x: number; y: number };
}

const bitmap = (source: number[], destination: number[], key: number, image = blueAtlas, imageWidth = 490, imageHeight = 300) => (
    <svg key={key} x={destination[0]} y={destination[1]} width={destination[2]} height={destination[3]}
        viewBox={source.join(' ')} preserveAspectRatio="none">
        <image href={image} width={imageWidth} height={imageHeight} />
    </svg>
);

const nineSlice = (width: number, height: number, edge: number, sourceX: number, sourceY: number,
    sourceRight: number, sourceBottom: number, overlap = 0, image = blueAtlas, imageWidth = 490, imageHeight = 300) => {
    const sourceXs = [sourceX, sourceX + edge, sourceRight];
    const sourceYs = [sourceY, sourceY + edge, sourceBottom];
    const xs = [0, edge, width - edge];
    const ys = [0, edge, height - edge];
    const widths = [edge, width - 2 * edge + overlap, edge];
    const heights = [edge, height - 2 * edge + overlap, edge];
    return sourceXs.flatMap((sx, column) => sourceYs.map((sy, row) => bitmap(
        [sx, sy, column === 1 ? 1 : edge, row === 1 ? 1 : edge],
        [xs[column], ys[row], widths[column], heights[row]], column * 3 + row, image, imageWidth, imageHeight
    )));
};

export const FriendsDialogBorderView: FC<{ width: number; height: number }> = ({ width, height }) => (
    <svg className="friends-dialog-border" width={width} height={height} aria-hidden="true">
        {nineSlice(width, height, 6, 0, 29, 12, 41)}
    </svg>
);

export const FriendsDialogButtonView: FC<{ caption: string; thick?: boolean; width?: number; height?: number; onClick: () => void }> = ({ caption, thick = false, width = 60, height = 21, onClick }) => (
    <button type="button" className={'friends-dialog-button' + (thick ? ' is-thick' : '')} style={width !== 60 || height !== 21 ? { width, height } : undefined} onClick={onClick}>
        {['default', 'hover', 'pressed', 'disabled'].map((state, index) => {
            const x = thick ? [120, 120, 148, 134][index] : [89, 89, 109, 99][index];
            const y = state === 'hover' ? 46 : 0;
            return <svg key={state} className={'friends-dialog-button-skin is-' + state} width={width} height={height} aria-hidden="true">
                {nineSlice(width, height, thick ? 4 : 3, x, y, x + (thick ? 8 : 6), y + (thick ? 20 : 19), thick ? 1 : 0)}
            </svg>;
        })}
        <span>{caption}</span>
    </button>
);

export interface FriendsDialogFrameTint {
    frame: string;
    header: string;
    title: string;
}

// Frame with another size and colour (style 1 frames take a color attribute); the default is the blue friends frame.
export const FriendsDialogFrameView: FC<PropsWithChildren<{
    kind?: keyof typeof FRIENDS_DIALOG_SIZES;
    size?: { width: number; height: number };
    className?: string;
    tint?: FriendsDialogFrameTint;
    title: string;
    initialPosition?: FriendsDialogSnapshot['initialPosition'];
    onCloseClick: () => void;
}>> = ({ kind, size, className, tint, title, initialPosition, onCloseClick, children }) => {
    const { width, height } = size ?? FRIENDS_DIALOG_SIZES[kind];
    const titleId = useId();
    const shine: number[][] = [
        [59, 1, 7, 7, 1, 1, 7, 7],
        [66, 2, 1, 1, 8, 2, width - 16, 1],
        [77, 1, 7, 7, width - 8, 1, 7, 7],
        [60, 8, 1, 1, 2, 8, 1, height - 16],
        [82, 8, 1, 1, width - 3, 8, 1, height - 15],
        [59, 19, 7, 7, 1, height - 8, 7, 7],
        [66, 24, 1, 1, 8, height - 3, width - 15, 1],
        [78, 20, 6, 6, width - 7, height - 7, 6, 6]
    ];
    const style: CSSProperties = { width, height };
    return <DraggableWindow windowPosition={DraggableWindowPosition.NOTHING} initialPosition={initialPosition} unconstrainedPosition>
        <div className={'friends-native-dialog ' + (className ?? 'octane-friends-' + (kind === 'invite' ? 'room-invite' : 'remove-confirmation'))}
            style={style} role="dialog" aria-labelledby={titleId}>
            <svg className="friends-dialog-frame" width={width} height={height} aria-hidden="true">
                {nineSlice(width, height, 13, 0, 0, 14, 14, 0, tint?.frame ?? blueFrame, 27, 27)}
                {shine.map((region, index) => bitmap(region.slice(0, 4), region.slice(4), index + 9))}
            </svg>
            <div className="friends-dialog-titlebar drag-handler" style={tint && { backgroundImage: `url("${tint.header}")` }}>
                <span id={titleId} className="friends-dialog-title" style={tint && { background: tint.title }}>{title}</span>
                <button type="button" className="friends-dialog-close" aria-label={LocalizeText('generic.close')} onClick={onCloseClick}>
                    {['default', 'hover', 'pressed'].map((state, index) => <svg key={state}
                        className={'friends-dialog-close-skin is-' + state} width="15" height="15" aria-hidden="true">
                        {bitmap([377, index * 16, 15, 15], [0, 0, 15, 15], 0)}
                    </svg>)}
                </button>
            </div>
            <div className="friends-dialog-content">{children}</div>
        </div>
    </DraggableWindow>;
};

interface FriendsRoomInviteViewProps {
    snapshot: FriendsDialogSnapshot;
    onCloseClick: () => void;
    sendRoomInvite: (message: string, ids: number[]) => void;
}

export const FriendsRoomInviteView: FC<FriendsRoomInviteViewProps> = ({ snapshot, onCloseClick, sendRoomInvite }) => {
    const [roomInviteMessage, setRoomInviteMessage] = useState('');
    const { simpleAlert } = useNotificationActions();
    const submit = (fromButton: boolean) => {
        if (roomInviteMessage === '') {
            simpleAlert(LocalizeText('friendlist.invite.emptyalert.text'), null, null, null, LocalizeText('friendlist.invite.emptyalert.title'));
            if (fromButton) onCloseClick();
            return;
        }
        sendRoomInvite(roomInviteMessage, snapshot.ids);
    };
    return <FriendsDialogFrameView kind="invite" title={LocalizeText('friendlist.invite.title')}
        initialPosition={snapshot.initialPosition} onCloseClick={onCloseClick}>
        <FriendsDialogBorderView width={199} height={118} />
        <div className="octane-friends-room-invite-summary">{snapshot.caption}</div>
        <textarea className="octane-friends-room-invite-textarea" aria-label={LocalizeText('friendlist.invite.title')}
            value={roomInviteMessage} onChange={(event) => setRoomInviteMessage(event.target.value)}
            onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'Enter') {
                    event.preventDefault();
                    submit(false);
                    return;
                }
                const input = event.currentTarget;
                if (input.value.length > 120) {
                    const start = Math.min(input.selectionStart, 120);
                    const end = Math.min(input.selectionEnd, 120);
                    input.value = input.value.substring(0, 120);
                    input.setSelectionRange(start, end);
                    setRoomInviteMessage(input.value);
                }
            }} />
        <div className="octane-friends-room-invite-note">{LocalizeText('friendlist.invite.note')}</div>
        <div className="friends-dialog-actions">
            <FriendsDialogButtonView thick caption={LocalizeText('friendlist.invite.send')} onClick={() => submit(true)} />
            <FriendsDialogButtonView caption={LocalizeText('generic.cancel')} onClick={onCloseClick} />
        </div>
    </FriendsDialogFrameView>;
};
