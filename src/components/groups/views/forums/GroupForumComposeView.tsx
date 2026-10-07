import { ExtendedForumData, GuildForumThread, PostMessageMessageComposer, PostMessageMessageEvent, PostThreadMessageEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { CreateLinkEvent, LocalizeText, SendMessageComposer } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { flatText, GroupInput, GroupText } from '../GroupNativeLayout';
import { FORUM_HEADER, FORUM_SURFACE, ForumButton, ForumFrame, stripTags } from './GroupForumLayout';

const MIN_LENGTH = 10;

interface GroupForumComposeViewProps {
    compose: { kind: 'thread' } | { kind: 'reply'; threadId: number; subject: string; quote?: string; quoteSeq: number };
    forumData: ExtendedForumData;
    groupId: number;
    initialPosition: { x: number; y: number };
    onClose: () => void;
    onThreadCreated: (thread: GuildForumThread) => void;
}

/** groupforum_compose_message: a new thread (subject and message) or a reply (the thread subject shown read-only). */
export const GroupForumComposeView: FC<GroupForumComposeViewProps> = ({ compose, forumData, groupId, initialPosition, onClose, onThreadCreated }) => {
    const isReply = compose.kind === 'reply';
    const [subject, setSubject] = useState<string>('');
    const [message, setMessage] = useState<string>(isReply && compose.quote ? compose.quote : '');
    const [isPosting, setIsPosting] = useState<boolean>(false);
    // Replying to another message while the composer is open adds its quote under the text so far.
    const quote = isReply ? compose.quote : undefined;
    const quoteSeq = isReply ? compose.quoteSeq : 0;

    useEffect(() => {
        if (quote && quoteSeq > 0) setMessage((previous) => (previous ? previous + '\n\n' + quote : quote));
    }, [quote, quoteSeq]);

    const subjectOk = isReply || subject.trim().length >= MIN_LENGTH;
    const messageOk = message.trim().length >= MIN_LENGTH;

    // The server answers a post with the new thread (a new thread) or the new message (a reply); either one closes the composer.
    useMessageEvent<PostThreadMessageEvent>(PostThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (isReply || parser.groupId !== groupId || !isPosting) return;

        onThreadCreated(parser.thread);
    });

    useMessageEvent<PostMessageMessageEvent>(PostMessageMessageEvent, (event) => {
        const parser = event.getParser();

        if (!isReply || parser.groupId !== groupId || parser.threadId !== compose.threadId || !isPosting) return;

        onClose();
    });

    const post = () => {
        if (isPosting || !subjectOk || !messageOk) return;

        setIsPosting(true);
        SendMessageComposer(new PostMessageMessageComposer(groupId, isReply ? compose.threadId : 0, isReply ? '' : subject.trim(), message.trim()));
    };

    const status = isPosting
        ? LocalizeText('groupforum.compose.posting')
        : !subjectOk
          ? LocalizeText('groupforum.compose.subject_too_short')
          : !messageOk
            ? LocalizeText('groupforum.compose.message_too_short')
            : '';

    return (
        <ForumFrame
            className="octane-group-forum-compose"
            height={470}
            initialPosition={initialPosition}
            title={LocalizeText('groupforum.compose.window_title')}
            uniqueKey="group-forum-compose"
            width={455}
            onClose={onClose}
            onHelp={() => CreateLinkEvent('habbopages/forums')}
        >
            <div className="octane-forum__header" style={{ width: 453 }}>
                <div className="octane-forum__header-icon">
                    <div className="octane-forum__header-badge">
                        <LayoutBadgeImageView badgeCode={forumData.icon} isGroup={true} />
                    </div>
                </div>
                <GroupText background={FORUM_HEADER} height={30} overrides={{ size: 24, color: 0xffffff }} text={forumData.name} textStyle="u_headline_big" width={360} x={90} y={10} />
                <GroupText background={FORUM_HEADER} height={40} overrides={flatText(12, { color: 0xffffff })} text={forumData.description} width={359} wrap x={90} y={40} />
            </div>
            <div className="octane-forum__compose-bar" style={{ top: 96 }}>
                <GroupText background={0x227aad} overrides={flatText(12, { color: 0xeeeeee })} text={LocalizeText(isReply ? 'groupforum.compose.subject_replying_to' : 'groupforum.compose.subject')} x={1} y={1} />
            </div>
            {(isReply || subject.length > 0) && <div className="octane-forum__compose-field" style={{ left: 0, top: 117, width: 444, height: 22 }} />}
            {isReply ? (
                <GroupText background={0xffffff} overrides={flatText(16)} text={compose.subject} x={0} y={117} />
            ) : (
                <GroupInput fontSize={16} height={22} inset={2} label={LocalizeText('groupforum.compose.subject')} maxLength={120} plain value={subject} width={444} x={0} y={117} onChange={setSubject} />
            )}
            <div className="octane-forum__compose-bar" style={{ top: 145 }}>
                <GroupText background={0x227aad} overrides={flatText(12, { color: 0xeeeeee })} text={LocalizeText('groupforum.compose.message')} x={1} y={1} />
                <button className="octane-forum__help-link" type="button" onClick={() => CreateLinkEvent('habbopages/forums/formatting')}>
                    <GroupText background={0x227aad} className="is-static" overrides={flatText(12, { color: 0xffffff, underline: true })} text={stripTags(LocalizeText('groupforum.compose.formatting_help'))} x={0} y={0} />
                </button>
            </div>
            <GroupInput fontSize={12} height={200} inset={4} label={LocalizeText('groupforum.compose.message')} maxLength={4000} multiline plain value={message} width={444} x={0} y={165} onChange={setMessage} />
            <ForumButton label={LocalizeText('groupforum.compose.cancel')} width={120} x={25} y={378} onClick={onClose} />
            <ForumButton disabled={isPosting || !subjectOk || !messageOk} label={LocalizeText('groupforum.compose.post')} tint="blue" width={120} x={295} y={378} onClick={post} />
            {status && <GroupText background={FORUM_SURFACE} overrides={flatText(11)} text={status} width={424} wrap x={10} y={425} />}
        </ForumFrame>
    );
};
