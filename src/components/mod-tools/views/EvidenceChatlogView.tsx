import { FC } from 'react';
import { Native0Frame } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';
import { EvidenceChatlogKind, EvidenceChatlogList, useEvidence } from './EvidenceChatlogList';

export type { EvidenceChatlogKind };

export interface EvidenceChatlogProps {
    kind: EvidenceChatlogKind;
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    onClose: () => void;
    onResize: (width: number, height: number) => void;
    onOpenUserInfo: (userId: number) => void;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
}

// Classic v75 chatlog window (Q5, evidence_frame): the request for its subject goes out when it opens and the window only appears when the answer arrives, captioned by what
// was asked for. Each record starts with a header row (what the log is of, "Room tool" / "View room" for a room), then one row per line; the rows alternate between a pale
// blue and white and the chatters the window was opened for take 0xf0d6a3 (the reported user) or 0xa3bdf0 (the caller). A line is 17px at least and as high as its
// wrapped message plus 5px. Names, messages and the chatter column are set in the row colour (the classic client paints them with the row's own colour value).
export const EvidenceChatlogView: FC<EvidenceChatlogProps> = ({ kind, id, x, y, width, height, onClose, onResize, onOpenUserInfo, onOpenRoomTool, onEnterRoom }) => {
    const evidence = useEvidence(kind, id);

    if (!evidence) return null;

    // the list is 443 wide at the default 480 (22px wider while the scroller is hidden) and its scroller sits at 451
    return (
        <NativeWindowShell type={`${kind}Chatlog` as 'userChatlog'} windowKey={`${id}`} x={x} y={y}>
            <Native0Frame caption={evidence.caption} height={height} width={width} onClose={onClose} onResize={onResize}>
                <div className="native0-box" style={{ left: 0, top: 0, width: width - 12 + 2, height: height - 32, backgroundColor: '#4184b0' }} />
                <EvidenceChatlogList
                    evidence={evidence}
                    listWidth={width - 37}
                    scrollbarHeight={height - 32}
                    scrollbarX={width - 29}
                    viewHeight={height - 35}
                    onEnterRoom={onEnterRoom}
                    onOpenRoomTool={onOpenRoomTool}
                    onOpenUserInfo={onOpenUserInfo}
                />
            </Native0Frame>
        </NativeWindowShell>
    );
};
