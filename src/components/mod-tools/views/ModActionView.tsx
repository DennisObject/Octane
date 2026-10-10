import {
    CfhSanctionMessageEvent,
    DefaultSanctionMessageComposer,
    GetConfiguration,
    ModAlertMessageComposer,
    ModBanMessageComposer,
    ModKickMessageComposer,
    ModMessageMessageComposer,
    ModMuteMessageComposer,
    ModTradingLockMessageComposer,
    ModeratorInitData
} from '@volt/renderer';
import { FC, useMemo, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../api';
import { NativeText } from '../../../common/native-text/NativeText';
import { showModAlert, useMessageEvent, useModTools } from '../../../hooks';
import modActionXml from '../../../assets/mod-tools/xml/modact_summary.xml?raw';
import { Native100Dropmenu } from '../native/NativeDropmenu100';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Button, Native0Frame, Native0Input } from '../native/NativeWindow0';
import { NativeWindowShell } from '../native/NativeWindowShell';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
const FRAME_COLOR = 0x418db0;
const NO_ISSUE_ID = -1;
enum ActionType {
    ALERT = 1,
    MUTE = 2,
    BAN = 3,
    KICK = 4,
    TRADE_LOCK = 5,
    MESSAGE = 6
}

// Held actions: no packet is sent for them and "Custom sanction" is disabled while one is selected.
// - Default sanction (hF, outgoing 8), caution (vF, 3033) and kick (wF, 1529): the classic composers always write the issue id as the last field (-1 included); the SDK composers
//   (DefaultSanctionMessageComposer, ModAlertMessageComposer, ModKickMessageComposer) leave it out when it is -1. The sanction lookup (My, 275) has no SDK composer at all.
// - Mute (yF), ban (Ou) and trade lock (xF): PlusEMU's handlers for revision OCTANE-3-6-0-FLOOR-20260909 read a different layout than the classic client and the SDK send
//   (minutes plus two strings for mute and trade lock; hours, two strings and two booleans for ban), so the native payload would be misread or throw.
// Message (bp, 2568) matches the server's reader and stays available. Native payloads are not adapted to the legacy server layouts here.
const DEFAULT_SANCTION_CONTRACT_SETTLED = false;
const HELD_ACTIONS = new Set<ActionType>([ActionType.ALERT, ActionType.MUTE, ActionType.BAN, ActionType.KICK, ActionType.TRADE_LOCK]);

interface Sanction {
    id: number;
    name: string;
    action: ActionType;
    banType: number;
    hours: number;
}

// Ype._rf3e3ac244e9335: the sanction table of the classic mod action window.
const SANCTIONS: Sanction[] = [
    { id: 1, name: 'Alert', action: ActionType.ALERT, banType: 1, hours: 0 },
    { id: 2, name: 'Mute 1h', action: ActionType.MUTE, banType: 2, hours: 0 },
    { id: 3, name: 'Ban 18h', action: ActionType.BAN, banType: 3, hours: 0 },
    { id: 4, name: 'Ban 7 days', action: ActionType.BAN, banType: 4, hours: 0 },
    { id: 5, name: 'Ban 30 days (step 1)', action: ActionType.BAN, banType: 5, hours: 0 },
    { id: 7, name: 'Ban 30 days (step 2)', action: ActionType.BAN, banType: 7, hours: 0 },
    { id: 6, name: 'Ban 100 years', action: ActionType.BAN, banType: 6, hours: 0 },
    { id: 106, name: 'Ban avatar-only 100 years', action: ActionType.BAN, banType: 6, hours: 0 },
    { id: 101, name: 'Kick', action: ActionType.KICK, banType: 0, hours: 0 },
    { id: 102, name: 'Lock trade 1 week', action: ActionType.TRADE_LOCK, banType: 0, hours: 168 },
    { id: 104, name: 'Lock trade permanent', action: ActionType.TRADE_LOCK, banType: 0, hours: 876000 },
    { id: 105, name: 'Message', action: ActionType.MESSAGE, banType: 0, hours: 0 }
];

// `cfh.topic_id.to.sanction_type_id`: "topic=sanction" pairs, key 0 being the fallback (Ype._re53038d881b491).
const readTopicSanctionMap = (): Map<number, number> => {
    const result = new Map<number, number>();
    const value = GetConfiguration().getValue<string>('cfh.topic_id.to.sanction_type_id', '') ?? '';

    for (const pair of value.split(',')) {
        const parts = pair.split('=');

        if (parts.length !== 2) continue;

        const topic = Number.parseInt(parts[0], 10);
        const sanction = Number.parseInt(parts[1], 10);

        if (!Number.isNaN(topic) && !Number.isNaN(sanction)) result.set(topic, sanction);
    }

    return result;
};

export interface ModActionProps {
    userId: number;
    userName: string;
    settings: ModeratorInitData;
    x: number;
    y: number;
    onClose: () => void;
}

// Classic v75 mod action window (Ype, modact_summary): a CFH topic and a sanction type (picking a topic selects the sanction type configured for it and asks for the
// default sanction of that topic), an optional message, "Default sanction" (enabled once the default is known) and "Custom sanction" (the chosen type, checked against the
// moderator's permissions). Either one sends the sanction and closes the window.
export const ModActionView: FC<ModActionProps> = ({ userId, userName, settings, x, y, onClose }) => {
    const root = useMemo(() => parseNativeLayout(modActionXml), []);
    const topicMenu = rectOf(findNativeNode(root, 'cfh_topics'));
    const sanctionMenu = rectOf(findNativeNode(root, 'sanction_type'));
    const info = rectOf(findNativeNode(root, 'message_info'));
    const input = rectOf(findNativeNode(root, 'message_input'));
    const defaultButton = findNativeNode(root, 'default_sanction_button');
    const customButton = findNativeNode(root, 'custom_sanction_button');
    const label = rectOf(findNativeNode(root, 'default_sanction_label'));
    const { cfhCategories = [] } = useModTools();
    const topics = useMemo(() => cfhCategories.flatMap((category) => category.topics ?? []), [cfhCategories]);
    const topicMap = useMemo(readTopicSanctionMap, []);
    const [topicIndex, setTopicIndex] = useState(-1);
    const [sanctionIndex, setSanctionIndex] = useState(-1);
    const [openMenu, setOpenMenu] = useState<'topic' | 'sanction' | null>(null);
    const [message, setMessage] = useState('');
    const [inputActive, setInputActive] = useState(false);
    const [defaultLabel, setDefaultLabel] = useState(nativeCaption(findNativeNode(root, 'default_sanction_label')));
    const [defaultAvailable, setDefaultAvailable] = useState(false);
    // the window is disposed by its first send: a second click before it is gone must not send again
    const sentRef = useRef(false);

    // _re053111603b8aa: the default sanction for this user arrives as "<name>[ (avatar) ]<length> & <trade lock> & <machine ban>"
    useMessageEvent<CfhSanctionMessageEvent>(CfhSanctionMessageEvent, (event) => {
        const parser = event.getParser();
        const sanction = parser?.sanctionType;

        if (!sanction || parser.accountId !== userId || parser.issueId > 0) return;

        let text = `${sanction.name}${sanction.avatarOnly ? ' (avatar) ' : ' '}`;

        text += sanction.sanctionLengthInHours > 24 ? `${sanction.sanctionLengthInHours / 24} days` : `${sanction.sanctionLengthInHours}h`;

        if (sanction.tradeLockInfo) text += ` & ${sanction.tradeLockInfo}`;
        if (sanction.machineBanInfo) text += ` & ${sanction.machineBanInfo}`;

        setDefaultLabel(text);
        setDefaultAvailable(true);
    });

    const topicNames = topics.map((topic) => LocalizeText(`help.cfh.topic.${topic.id}`));

    const selectTopic = (index: number) => {
        const topicId = topics[index]?.id ?? 0;
        let sanctionId = topicMap.get(topicId) ?? 0;

        if (!sanctionId) sanctionId = topicMap.get(0) ?? 0;

        setTopicIndex(index);
        setOpenMenu(null);
        setSanctionIndex(sanctionId ? SANCTIONS.findIndex((sanction) => sanction.id === sanctionId) : -1);
        // The classic client now asks for the default sanction of the topic with My(-1, userId, topic) (outgoing 275). The SDK has no composer with that field layout
        // (ModToolSanctionComposer is (userId, sanctionLevelId, categoryId)), so nothing is sent: "Default sanction" stays unavailable until that contract is settled.
    };

    const onDefault = () => {
        if (sentRef.current || !DEFAULT_SANCTION_CONTRACT_SETTLED) return;

        if (topicIndex < 0) {
            showModAlert('Please select a topic.');

            return;
        }

        sentRef.current = true;
        SendMessageComposer(new DefaultSanctionMessageComposer(userId, topics[topicIndex].id, message, NO_ISSUE_ID));
        onClose();
    };

    const onCustom = () => {
        if (sentRef.current || (sanctionIndex >= 0 && HELD_ACTIONS.has(SANCTIONS[sanctionIndex].action))) return;

        if (topicIndex < 0) {
            showModAlert('Please select a topic.');

            return;
        }

        if (sanctionIndex < 0) {
            showModAlert('Please select a sanction.');

            return;
        }

        const topicId = topics[topicIndex].id;
        const sanction = SANCTIONS[sanctionIndex];
        const denied = () => showModAlert('You have insufficient permissions.');

        switch (sanction.action) {
            case ActionType.ALERT:
                if (!settings.alertPermission) return denied();

                sentRef.current = true;
                SendMessageComposer(new ModAlertMessageComposer(userId, message, topicId, NO_ISSUE_ID));
                break;
            case ActionType.MUTE:
                sentRef.current = true;
                SendMessageComposer(new ModMuteMessageComposer(userId, message, topicId, NO_ISSUE_ID));
                break;
            case ActionType.BAN:
                if (!settings.banPermission) return denied();

                sentRef.current = true;
                SendMessageComposer(new ModBanMessageComposer(userId, message, topicId, sanction.banType, sanction.id === 106, NO_ISSUE_ID));
                break;
            case ActionType.KICK:
                if (!settings.kickPermission) return denied();

                sentRef.current = true;
                SendMessageComposer(new ModKickMessageComposer(userId, message, topicId, NO_ISSUE_ID));
                break;
            case ActionType.TRADE_LOCK:
                sentRef.current = true;
                SendMessageComposer(new ModTradingLockMessageComposer(userId, message, sanction.hours * 60, topicId, NO_ISSUE_ID));
                break;
            case ActionType.MESSAGE:
                if (message.trim().length === 0) {
                    showModAlert('Please write a message to user.');

                    return;
                }

                sentRef.current = true;
                SendMessageComposer(new ModMessageMessageComposer(userId, message, topicId, NO_ISSUE_ID));
                break;
        }

        onClose();
    };

    return (
        <NativeWindowShell type="modAction" windowKey={userName} x={x} y={y}>
            <Native0Frame caption={`Mod action on: ${userName}`} height={nativeNumber(root, 'height')} width={nativeNumber(root, 'width')} onClose={onClose}>
                <div style={{ position: 'absolute', left: info.x, top: info.y, width: info.width, height: info.height, fontSize: 0, lineHeight: 0 }}>
                    <NativeText background={FRAME_COLOR} maxWidth={info.width} overrides={{ color: 0xffffff, size: 11 }} text={nativeCaption(findNativeNode(root, 'message_info'))} textStyle="u_regular" />
                </div>
                <Native0Input active={inputActive} height={input.height} value={message} width={input.width} x={input.x} y={input.y} onChange={setMessage} onFocus={() => setInputActive(true)} />
                <Native0Button enabled={defaultAvailable && DEFAULT_SANCTION_CONTRACT_SETTLED} height={21} label={nativeCaption(defaultButton)} width={100} x={nativeNumber(defaultButton, 'x')} y={nativeNumber(defaultButton, 'y')} onClick={onDefault} />
                <div style={{ position: 'absolute', left: label.x, top: label.y, width: label.width, height: label.height, fontSize: 0, lineHeight: 0 }}>
                    <NativeText background={FRAME_COLOR} maxWidth={label.width} overrides={{ color: 0xffffff, size: 11 }} text={defaultLabel} textStyle="u_regular" />
                </div>
                <Native0Button enabled={sanctionIndex < 0 || !HELD_ACTIONS.has(SANCTIONS[sanctionIndex].action)} height={21} label={nativeCaption(customButton)} width={100} x={nativeNumber(customButton, 'x')} y={nativeNumber(customButton, 'y')} onClick={onCustom} />
                <Native100Dropmenu
                    caption={sanctionIndex >= 0 ? SANCTIONS[sanctionIndex].name : nativeCaption(findNativeNode(root, 'sanction_type'))}
                    height={sanctionMenu.height}
                    items={SANCTIONS.map((sanction) => sanction.name)}
                    open={openMenu === 'sanction'}
                    selectedIndex={sanctionIndex}
                    width={sanctionMenu.width}
                    x={sanctionMenu.x}
                    y={sanctionMenu.y}
                    onSelect={(index) => {
                        setSanctionIndex(index);
                        setOpenMenu(null);
                    }}
                    onToggle={() => setOpenMenu((value) => (value === 'sanction' ? null : 'sanction'))}
                />
                <Native100Dropmenu
                    caption={topicIndex >= 0 ? topicNames[topicIndex] : nativeCaption(findNativeNode(root, 'cfh_topics'))}
                    height={topicMenu.height}
                    items={topicNames}
                    open={openMenu === 'topic'}
                    selectedIndex={topicIndex}
                    width={topicMenu.width}
                    x={topicMenu.x}
                    y={topicMenu.y}
                    onSelect={selectTopic}
                    onToggle={() => setOpenMenu((value) => (value === 'topic' ? null : 'topic'))}
                />
            </Native0Frame>
        </NativeWindowShell>
    );
};
