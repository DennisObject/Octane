import { AddLinkEventTracker, GroupPurchasedEvent, GroupSettingsComposer, HabboGroupJoinFailedMessageEvent, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetGroupInformation, LocalizeText, SendMessageComposer, TryVisitRoom } from '../../api';
import { useGroup, useGroupMemberRemovalSink, useMessageEvent } from '../../hooks';
import { GroupCreatedView } from './views/GroupCreatedView';
import { GroupCreatorView } from './views/GroupCreatorView';
import { GroupInformationStandaloneView } from './views/GroupInformationStandaloneView';
import { GroupManagerView } from './views/GroupManagerView';
import { GroupAlert, GroupNativeAlertView } from './views/GroupNativeAlertView';
import { GroupMembersView } from './views/GroupMembersView';

export const GroupsView: FC<{}> = (props) => {
    const [isCreatorVisible, setCreatorVisible] = useState<boolean>(false);
    const [isCreatedVisible, setCreatedVisible] = useState<boolean>(false);
    const [joinFailure, setJoinFailure] = useState<GroupAlert>(null);
    const {} = useGroup();

    useGroupMemberRemovalSink();

    // The server refuses a join with a reason code; the v75 client explains it in its plain alert.
    useMessageEvent<HabboGroupJoinFailedMessageEvent>(HabboGroupJoinFailedMessageEvent, (event) =>
    {
        setJoinFailure({ title: LocalizeText('group.joinfail.title'), message: LocalizeText(`group.joinfail.${event.getParser().reason}`) });
    });

    useMessageEvent<GroupPurchasedEvent>(GroupPurchasedEvent, (event) => {
        const parser = event.getParser();

        setCreatorVisible(false);
        setCreatedVisible(true);
        TryVisitRoom(parser.roomId);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'create':
                        setCreatorVisible(true);
                        return;
                    case 'manage':
                        if (!parts[2]) return;

                        setCreatorVisible(false);
                        SendMessageComposer(new GroupSettingsComposer(Number(parts[2])));
                        return;
                }
            },
            eventUrlPrefix: 'groups/'
        };

        // The v75 link router opens a group's information window with group/<id>.
        const infoTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const groupId = Number(url.split('/')[1]);

                if (groupId > 0) GetGroupInformation(groupId);
            },
            eventUrlPrefix: 'group/'
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(infoTracker);

        return () =>
        {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(infoTracker);
        };
    }, []);

    return (
        <>
            {isCreatorVisible && <GroupCreatorView onClose={() => setCreatorVisible(false)} />}
            {isCreatedVisible && <GroupCreatedView onClose={() => setCreatedVisible(false)} />}
            {!isCreatorVisible && <GroupManagerView />}
            <GroupMembersView />
            <GroupInformationStandaloneView />
            {joinFailure && <GroupNativeAlertView alert={joinFailure} onClose={() => setJoinFailure(null)} />}
        </>
    );
};
