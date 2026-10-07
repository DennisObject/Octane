import {
    CallForHelpCategoryData,
    CfhSanctionMessageEvent,
    CfhTopicsInitEvent,
    GetModeratorUserInfoMessageComposer,
    IssueDeletedMessageEvent,
    IssueInfoMessageEvent,
    IssueMessageData,
    IssuePickFailedMessageEvent,
    ModeratorActionResultMessageEvent,
    ModeratorInitData,
    ModeratorInitMessageEvent,
    ModeratorToolPreferencesEvent
} from '@octane/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { NotificationAlertType, PlaySound, SendMessageComposer, SoundNames } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { showModAlert } from './modAlertStore';

const useModToolsState = () => {
    const [settings, setSettings] = useState<ModeratorInitData>(null);
    const [tickets, setTickets] = useState<IssueMessageData[]>([]);
    const [cfhCategories, setCfhCategories] = useState<CallForHelpCategoryData[]>([]);
    const { simpleAlert = null } = useNotification();

    useMessageEvent<ModeratorInitMessageEvent>(ModeratorInitMessageEvent, (event) => {
        const parser = event.getParser();
        const data = parser.data;

        setSettings(data);
        setTickets(data.issues);
    });

    useMessageEvent<IssueInfoMessageEvent>(IssueInfoMessageEvent, (event) => {
        const parser = event.getParser();

        setTickets((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.findIndex((ticket) => ticket.issueId === parser.issueData.issueId);

            if (existingIndex >= 0) newValue[existingIndex] = parser.issueData;
            else {
                newValue.push(parser.issueData);

                PlaySound(SoundNames.MODTOOLS_NEW_TICKET);
            }

            return newValue;
        });
    });

    useMessageEvent<ModeratorToolPreferencesEvent>(ModeratorToolPreferencesEvent, (event) => {
        const parser = event.getParser();
    });

    useMessageEvent<IssuePickFailedMessageEvent>(IssuePickFailedMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        simpleAlert('Failed to pick issue', NotificationAlertType.DEFAULT, null, null, 'Error');
    });

    useMessageEvent<IssueDeletedMessageEvent>(IssueDeletedMessageEvent, (event) => {
        const parser = event.getParser();

        setTickets((prevValue) => {
            const newValue = [...prevValue];
            const existingIndex = newValue.findIndex((ticket) => ticket.issueId === parser.issueId);

            if (existingIndex >= 0) newValue.splice(existingIndex, 1);

            return newValue;
        });
    });

    // Classic ModerationMessageHandler (lme) action result: a success asks for the user's info again (no message); a failure raises the alert.
    useMessageEvent<ModeratorActionResultMessageEvent>(ModeratorActionResultMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.success) SendMessageComposer(new GetModeratorUserInfoMessageComposer(parser.userId));
        else showModAlert('Moderation action failed. If you tried to ban a user, please check if the user is already banned.');
    });

    useMessageEvent<CfhTopicsInitEvent>(CfhTopicsInitEvent, (event) => {
        const parser = event.getParser();

        setCfhCategories(parser.callForHelpCategories);
    });

    useMessageEvent<CfhSanctionMessageEvent>(CfhSanctionMessageEvent, (event) => {
        const parser = event.getParser();

        // todo: update sanction data
    });

    return {
        settings,
        cfhCategories,
        tickets
    };
};

export const useModTools = () => useSharedHook(useModToolsState);

registerSharedHook(useModToolsState);
