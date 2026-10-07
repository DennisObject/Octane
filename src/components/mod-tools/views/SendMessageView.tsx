import { ModeratorInitData, ModMessageMessageComposer } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { NotificationAlertType, SendMessageComposer } from '../../../api';
import { useNotification } from '../../../hooks';
import sendMessagesXml from '../../../assets/mod-tools/xml/send_msgs.xml?raw';
import { findNativeNode, nativeCaption, nativeNumber, NativeNode, parseNativeLayout } from '../native/NativeLayout';
import { Native0Button, Native0Dropmenu, Native0Frame, Native0Input } from '../native/NativeWindow0';

const rectOf = (node: NativeNode) => ({ x: nativeNumber(node, 'x'), y: nativeNumber(node, 'y'), width: nativeNumber(node, 'width'), height: nativeNumber(node, 'height') });
/** `$pe._rfaec9bccb2e7a4`: the topic id the free message carries. */
const SEND_MESSAGE_TOPIC = -999;

export interface SendMessageProps {
    userId: number;
    userName: string;
    settings: ModeratorInitData;
    x: number;
    y: number;
    onClose: () => void;
}

// Classic v75 send_msgs window ($pe): the caption is "Msg To: <name>", the first focus of the field clears its hint text, a template from the menu replaces the field text,
// and sending an empty (or still hinted) field raises the alert; otherwise the message goes out with the issue id of the moderator tool and the window closes.
export const SendMessageView: FC<SendMessageProps> = ({ userId, userName, settings, x, y, onClose }) => {
    const root = useMemo(() => parseNativeLayout(sendMessagesXml), []);
    const menu = rectOf(findNativeNode(root, 'msgTemplatesSelect'));
    const input = findNativeNode(root, 'message_input');
    const send = findNativeNode(root, 'send_message_but');
    const { simpleAlert } = useNotification();
    const [message, setMessage] = useState(nativeCaption(input));
    const [isHint, setIsHint] = useState(true);
    const [inputActive, setInputActive] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(-1);
    const templates = settings.messageTemplates ?? [];

    const onSend = () => {
        if (isHint || message === '') {
            simpleAlert('You must input a message to the user', NotificationAlertType.DEFAULT, null, null, 'Alert');

            return;
        }

        SendMessageComposer(new ModMessageMessageComposer(userId, message, SEND_MESSAGE_TOPIC));
        onClose();
    };

    return (
        <div className="native0-window" style={{ position: 'absolute', left: x, top: y }}>
            <Native0Frame caption={`Msg To: ${userName}`} height={nativeNumber(root, 'height')} width={nativeNumber(root, 'width')} onClose={onClose}>
                <Native0Input
                    active={inputActive}
                    height={nativeNumber(input, 'height')}
                    value={message}
                    width={nativeNumber(input, 'width')}
                    x={nativeNumber(input, 'x')}
                    y={nativeNumber(input, 'y')}
                    onChange={(value) => setMessage(value)}
                    onFocus={() => {
                        if (isHint) {
                            setMessage('');
                            setIsHint(false);
                        }

                        setInputActive(true);
                    }}
                />
                <Native0Button height={nativeNumber(send, 'height')} label={nativeCaption(send)} width={nativeNumber(send, 'width')} x={nativeNumber(send, 'x')} y={nativeNumber(send, 'y')} onClick={onSend} />
                <Native0Dropmenu
                    caption={selectedTemplate >= 0 ? templates[selectedTemplate] : nativeCaption(findNativeNode(root, 'msgTemplatesSelect'))}
                    height={menu.height}
                    items={templates}
                    open={menuOpen}
                    width={menu.width}
                    x={menu.x}
                    y={menu.y}
                    onSelect={(index) => {
                        setSelectedTemplate(index);
                        setMenuOpen(false);
                        setMessage(templates[index]);
                        setIsHint(false);
                        setInputActive(true);
                    }}
                    onToggle={() => setMenuOpen((value) => !value)}
                />
            </Native0Frame>
        </div>
    );
};
