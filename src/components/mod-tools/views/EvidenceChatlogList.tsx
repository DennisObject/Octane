import {
    CfhChatlogEvent,
    ChatlineData,
    ChatRecordData,
    GetCfhChatlogMessageComposer,
    GetRoomChatlogMessageComposer,
    GetUserChatlogMessageComposer,
    RoomChatlogEvent,
    UserChatlogEvent
} from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { SendMessageComposer } from '../../../api';
import { NativeText } from '../../../common/native-text/NativeText';
import { useMessageEvent } from '../../../hooks';
import evidenceXml from '../../../assets/mod-tools/xml/evidence_frame.xml?raw';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Button, Native0Rows, Native0Scrollbar } from '../native/NativeWindow0';

export type EvidenceChatlogKind = 'user' | 'room' | 'cfh';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const FRAME_COLOR = 0x418db0;
const ZEBRA = 0xc3ecfa;
const WHITE = 0xffffff;
/** Q5._r6c80a12d5cc1f7 / _r0ddfbe3e000602: the rows of the chatters the window was opened for (the reported user: 0, the caller: 1). */
const HIGHLIGHT = [0xf0d6a3, 0xa3bdf0];
const MIN_LINE_HEIGHT = 17;

export interface Evidence {
    caption: string;
    records: ChatRecordData[];
    highlights: Map<number, number>;
}

type Item = { kind: 'header'; record: ChatRecordData } | { kind: 'line'; line: ChatlineData; color: number; chatterColor: number };

export interface EvidenceChatlogListProps {
    evidence: Evidence;
    /** The width of the rows' viewport while the scroller shows (it grows by 22px while the rows fit) and where the scroller sits. */
    listWidth: number;
    scrollbarX: number;
    scrollbarHeight: number;
    viewHeight: number;
    scrollbarVariant?: 0 | 3;
    scrollbarBlend?: number;
    onOpenUserInfo: (userId: number) => void;
    onOpenRoomTool: (roomId: number) => void;
    onEnterRoom: (roomId: number) => void;
}

/** Asks for the subject of a chatlog and returns the answer once it arrives (classic Q5.show and its message handlers). */
export const useEvidence = (kind: EvidenceChatlogKind, id: number): Evidence => {
    const [evidence, setEvidence] = useState<Evidence>(null);
    const requestedRef = useRef(false);

    useEffect(() => {
        // one request per opened window (a development double effect run must not send it twice)
        if (requestedRef.current) return;

        requestedRef.current = true;
        SendMessageComposer(kind === 'user' ? new GetUserChatlogMessageComposer(id) : kind === 'room' ? new GetRoomChatlogMessageComposer(id) : new GetCfhChatlogMessageComposer(id));
    }, [kind, id]);

    useMessageEvent<UserChatlogEvent>(UserChatlogEvent, (event) => {
        const data = event.getParser()?.data;

        if (kind === 'user' && data?.userId === id) setEvidence({ caption: `User Chatlog: ${data.username}`, records: data.roomChatlogs, highlights: new Map([[data.userId, 0]]) });
    });

    useMessageEvent<RoomChatlogEvent>(RoomChatlogEvent, (event) => {
        const data = event.getParser()?.data;

        if (kind === 'room' && data?.roomId === id) setEvidence({ caption: `Room Chatlog: ${data.roomName}`, records: [data], highlights: new Map() });
    });

    useMessageEvent<CfhChatlogEvent>(CfhChatlogEvent, (event) => {
        const data = event.getParser()?.data;

        if (kind === 'cfh' && data?.issueId === id) {
            setEvidence({
                caption: `Call For Help Evidence #${data.chatRecordId}`,
                records: [data.chatRecord],
                highlights: new Map([
                    [data.callerUserId, 0],
                    [data.reportedUserId, 1]
                ])
            });
        }
    });

    return evidence;
};

// The rows of a chatlog window (Q5 populate): each record starts with a header row (what the log is of, "Room tool" / "View room" for a room), then one row per line; the rows
// alternate between a pale blue and white and the chatters the window was opened for take 0xf0d6a3 (the reported user) or 0xa3bdf0 (the caller). A line is 17px at least and
// as high as its wrapped message plus 5px. Names, messages and the chatter column are set in the row colour (the classic client paints them with the row's own colour value).
export const EvidenceChatlogList: FC<EvidenceChatlogListProps> = ({ evidence, listWidth, scrollbarX, scrollbarHeight, viewHeight, scrollbarVariant = 0, scrollbarBlend, onOpenUserInfo, onOpenRoomTool, onEnterRoom }) => {
    const root = useMemo(() => parseNativeLayout(evidenceXml), []);
    const list = findNativeNode(root, 'evidence_list');
    const header = rectOf(list.children[0]);
    const label = rectOf(findNativeNode(root, 'text'));
    const action = rectOf(findNativeNode(root, 'btnHeaderAction'));
    const action2 = rectOf(findNativeNode(root, 'btnHeaderAction2'));
    const line = rectOf(findNativeNode(root, 'chatline'));
    const time = rectOf(findNativeNode(root, 'time_txt'));
    const chatter = rectOf(findNativeNode(root, 'chatter_txt'));
    const message = rectOf(findNativeNode(root, 'msg_txt'));
    const [offset, setOffset] = useState(0);
    // wrapped line count of each message, by item index
    const [messageHeights, setMessageHeights] = useState<Record<number, number>>({});

    const items = useMemo<Item[]>(() => {
        if (!evidence) return [];

        const result: Item[] = [];

        for (const record of evidence.records) {
            // every record starts its rows on the pale blue again
            let zebra = true;

            result.push({ kind: 'header', record });

            for (const chatLine of record.chatlog) {
                const highlight = evidence.highlights.get(chatLine.userId);
                const color = highlight !== undefined ? HIGHLIGHT[highlight] : zebra ? ZEBRA : WHITE;

                result.push({ kind: 'line', line: chatLine, color, chatterColor: color });
                zebra = !zebra;
            }
        }

        return result;
    }, [evidence]);

    const rowHeight = (index: number, item: Item) => (item.kind === 'header' ? header.height : Math.max(MIN_LINE_HEIGHT, Math.floor(((messageHeights[index] ?? 0) * 40) / 3 + 5)));
    const tops: number[] = [];
    let contentHeight = 0;

    items.forEach((item, index) => {
        tops.push(contentHeight);
        contentHeight += rowHeight(index, item);
    });

    const overflow = contentHeight > viewHeight;
    const width = listWidth + (overflow ? 0 : 22);
    const range = Math.max(0, contentHeight - viewHeight);
    const clamped = Math.max(0, Math.min(range, offset));
    const rowColors = items.map((item) => (item.kind === 'header' ? FRAME_COLOR : item.color));
    const heights = items.map((item, index) => rowHeight(index, item));
    const messageWidth = line.width - message.x;

    return (
        <>
            <div className="native0-list" style={{ left: 0, top: 0, width, height: viewHeight }} onWheel={(event) => setOffset(Math.max(0, Math.min(range, clamped + event.deltaY * 0.75)))}>
                <div style={{ position: 'absolute', left: 0, top: -clamped, width, height: contentHeight }}>
                    <Native0Rows colors={rowColors} heights={heights} width={Math.max(header.width, line.width)} />
                    {items.map((item, index) =>
                        item.kind === 'header' ? (
                            <div key={index} style={{ position: 'absolute', left: 0, top: tops[index], width: header.width, height: header.height }}>
                                <div style={{ position: 'absolute', left: label.x, top: label.y, width: header.width - action2.x, height: label.height, overflow: 'hidden', fontSize: 0, lineHeight: 0 }}>
                                    <NativeText
                                        background={FRAME_COLOR}
                                        overrides={{ color: 0xffffff }}
                                        text={item.record.roomId > 0 ? (item.record.roomName == null ? `Room #${item.record.roomId}` : `Room: ${item.record.roomName}`) : 'Chatlog'}
                                        textStyle="u_headline_small"
                                    />
                                </div>
                                {item.record.roomId > 0 && (
                                    <>
                                        <Native0Button height={action.height} label="View room" width={action2.width} x={action2.x} y={action2.y} onClick={() => onEnterRoom(item.record.roomId)} />
                                        <Native0Button height={action.height} label="Room tool" width={action.width} x={action.x} y={action.y} onClick={() => onOpenRoomTool(item.record.roomId)} />
                                    </>
                                )}
                            </div>
                        ) : (
                            <div key={index} style={{ position: 'absolute', left: 0, top: tops[index], width: line.width, height: heights[index] }}>
                                <div style={{ position: 'absolute', left: time.x, top: time.y, width: time.width, height: heights[index], overflow: 'hidden', fontSize: 0, lineHeight: 0 }}>
                                    <NativeText background={item.color} text={item.line.timestamp} textStyle="u_bold" />
                                </div>
                                {/* the chatter field keeps the white of a text window behind its row coloured text, over the whole height of the row */}
                                <div style={{ position: 'absolute', left: chatter.x, top: chatter.y, width: chatter.width, height: heights[index], backgroundColor: '#fff' }} />
                                <div style={{ position: 'absolute', left: chatter.x, top: chatter.y, width: chatter.width, height: heights[index], overflow: 'hidden', fontSize: 0, lineHeight: 0, cursor: item.line.userId > 0 ? 'pointer' : undefined }} onClick={item.line.userId > 0 ? () => onOpenUserInfo(item.line.userId) : undefined}>
                                    <NativeText
                                        background={WHITE}
                                        overrides={{ color: item.chatterColor, underline: item.line.userId > 0, bold: true }}
                                        text={item.line.userId > 0 ? item.line.userName : item.line.userId === 0 ? 'Bot / pet' : '-'}
                                        textStyle="u_bold"
                                    />
                                </div>
                                <MessageText
                                    background={item.color}
                                    text={item.line.message}
                                    width={messageWidth}
                                    x={message.x}
                                    y={message.y}
                                    onHeight={(value) => setMessageHeights((previous) => (previous[index] === value ? previous : { ...previous, [index]: value }))}
                                />
                            </div>
                        )
                    )}
                </div>
            </div>
            {overflow && <Native0Scrollbar contentHeight={contentHeight} height={scrollbarHeight} offset={clamped} blend={scrollbarBlend} variant={scrollbarVariant} viewHeight={viewHeight} x={scrollbarX} y={0} onOffset={setOffset} />}
        </>
    );
};

/** The message field: Ubuntu regular in the row colour, wrapped at the field width; its height drives the height of the row. */
const MessageText: FC<{ text: string; background: number; width: number; x: number; y: number; onHeight: (height: number) => void }> = ({ text, background, width, x, y, onHeight }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        // the number of wrapped lines, from the raster the field draws (a line of Ubuntu 12 is 13 1/3 px high, plus 4px of gutter)
        const measure = () => {
            const canvas = element.querySelector('canvas');

            if (canvas && canvas.height > 4) onHeight(Math.max(1, Math.round((canvas.height - 4) / (40 / 3))));
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, [onHeight, text, width]);

    // the field raster is drawn asynchronously: watch for the canvas appearing or resizing
    useEffect(() => {
        const element = ref.current;

        if (!element || typeof MutationObserver === 'undefined') return;

        const observer = new MutationObserver(() => {
            const canvas = element.querySelector('canvas');

            if (canvas && canvas.height > 4) onHeight(Math.max(1, Math.round((canvas.height - 4) / (40 / 3))));
        });

        observer.observe(element, { attributes: true, childList: true, subtree: true });

        return () => observer.disconnect();
    }, [onHeight, text, width]);

    return (
        <div ref={ref} style={{ position: 'absolute', left: x, top: y, width }}>
            <NativeText background={background} maxWidth={width} overrides={{ color: background }} text={text} textStyle="u_regular" />
        </div>
    );
};
