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

    // the list is 420 wide at the default 480 while its scroller (at 451) shows, 22px wider (443) while the scroller is hidden
    return (
        <NativeWindowShell type={`${kind}Chatlog` as 'userChatlog'} windowKey={`${id}`} x={x} y={y}>
            <Native0Frame caption={evidence.caption} height={height} width={width} onClose={onClose} onResize={onResize}>
                {/* the scroller column sits on a slightly darker blue that reaches 8px to its left; the rest of the frame is the plain frame blue */}
                <div className="native0-box" style={{ left: width - 37, top: 0, width: 25, height: height - 32, backgroundColor: '#4184b0' }} />
                <EvidenceChatlogList
                    evidence={evidence}
                    hiddenExtra={23}
                    lineFollowsList
                    listWidth={width - 60}
                    viewportWidth={width - 37}
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
