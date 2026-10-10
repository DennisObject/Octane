import {
    CallForHelpCategoryData,
    CfhSanctionMessageEvent,
    CfhTopicsInitEvent,
    GetModeratorUserInfoMessageComposer,
    ModeratorActionResultMessageEvent,
    ModeratorInitData,
    ModeratorInitMessageEvent
} from '@volt/renderer';
import { useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { showModAlert } from './modAlertStore';

const useModToolsState = () => {
    const [settings, setSettings] = useState<ModeratorInitData>(null);
    const [cfhCategories, setCfhCategories] = useState<CallForHelpCategoryData[]>([]);

    useMessageEvent<ModeratorInitMessageEvent>(ModeratorInitMessageEvent, (event) => {
        setSettings(event.getParser().data);
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
        cfhCategories
    };
};

export const useModTools = () => useSharedHook(useModToolsState);

registerSharedHook(useModToolsState);
