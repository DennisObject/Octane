import {
    ExtendedProfileChangedMessageEvent,
    GetSessionDataManager,
    RelationshipStatusInfoEvent,
    RelationshipStatusInfoMessageParser,
    RoomEngineObjectEvent,
    RoomObjectCategory,
    RoomObjectType,
    UserCurrentBadgesComposer,
    UserCurrentBadgesEvent,
    UserProfileEvent,
    UserProfileParser,
    UserRelationshipsComposer
} from '@octane/renderer';
import { FC, useState } from 'react';
import { CreateLinkEvent, GetRoomSession, GetUserProfile, LocalizeText, localizeWithFallback, SanitizeHtml, SendMessageComposer } from '../../api';
import { frankStop } from '../../assets/images/user-profile';
import { OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useIsUserBlocked, useMessageEvent, useNotification, useOctaneEvent } from '../../hooks';
import { GroupsContainerView } from './GroupsContainerView';
import { UserContainerView } from './UserContainerView';

export const UserProfileView: FC<{}> = () => {
    const [userProfile, setUserProfile] = useState<UserProfileParser>(null);
    const [userBadges, setUserBadges] = useState<string[]>([]);
    const [userRelationships, setUserRelationships] = useState<RelationshipStatusInfoMessageParser>(null);
    const [windowPosition, setWindowPosition] = useState<{ x: number; y: number } | null>(null);
    // Official ExtendedProfileWindowCtrl: block_button / blocked_container run off the session
    // block list (BlockedUsersManager), not off the ignore list.
    const isBlocked = useIsUserBlocked(userProfile?.id ?? -1);
    const { showConfirm = null } = useNotification();

    const onClose = () => {
        setUserProfile(null);
        setUserBadges([]);
        setUserRelationships(null);
    };

    // Official blockUser / unblockUser by user id, each behind its confirm
    // (extendedprofile.block_player / unblock_player).
    const toggleBlock = () => {
        if (!userProfile) return;

        const userId = userProfile.id;
        const key = isBlocked ? 'extendedprofile.unblock_player' : 'extendedprofile.block_player';
        const apply = () => (isBlocked ? GetSessionDataManager().unblockUser(userId) : GetSessionDataManager().blockUser(userId));

        showConfirm(
            // The pack stores the line breaks as literal "\n".
            localizeWithFallback(`${key}.desc`, isBlocked ? 'Unblock this user?' : 'Block this user?').replace(/\\n/g, '\n'),
            apply,
            null,
            null,
            null,
            localizeWithFallback(`${key}.title`, isBlocked ? 'Unblock user' : 'Block user')
        );
    };

    const onLeaveGroup = () => {
        if (!userProfile || userProfile.id !== GetSessionDataManager().userId) return;

        GetUserProfile(userProfile.id);
    };

    const onOpenRooms = () => {
        if (!userProfile) return;

        CreateLinkEvent(`navigator/search/hotel_view/owner:${userProfile.username}`);
    };

    useMessageEvent<UserCurrentBadgesEvent>(UserCurrentBadgesEvent, (event) => {
        const parser = event.getParser();

        if (!userProfile || parser.userId !== userProfile.id) return;

        setUserBadges(parser.badges);
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, (event) => {
        const parser = event.getParser();

        if (!userProfile || parser.userId !== userProfile.id) return;

        setUserRelationships(parser);
    });

    useMessageEvent<UserProfileEvent>(UserProfileEvent, (event) => {
        const parser = event.getParser();

        const isSameProfile = userProfile?.id === parser.id;
        setUserProfile(parser);
        if (!windowPosition) setWindowPosition({ x: (window.innerWidth - 521) / 2, y: (window.innerHeight - 537) / 2 });

        if (!isSameProfile) {
            setUserBadges([]);
            setUserRelationships(null);
        }

        SendMessageComposer(new UserCurrentBadgesComposer(parser.id));
        SendMessageComposer(new UserRelationshipsComposer(parser.id));
    });

    useMessageEvent<ExtendedProfileChangedMessageEvent>(ExtendedProfileChangedMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.userId != userProfile?.id) return;

        GetUserProfile(parser.userId);
    });

    useOctaneEvent<RoomEngineObjectEvent>(RoomEngineObjectEvent.SELECTED, (event) => {
        if (!userProfile) return;

        if (event.category !== RoomObjectCategory.UNIT) return;

        const userData = GetRoomSession().userDataManager.getUserDataByIndex(event.objectId);

        if (userData.type !== RoomObjectType.USER) return;

        GetUserProfile(userData.webID);
    });

    if (!userProfile) return null;
    const isProfileHidden = userProfile.hasNativeProfileFields && userProfile.isHidden && userProfile.id !== GetSessionDataManager().userId;

    return (
        <OctaneCardView className="octane-extended-profile-window" uniqueKey="octane-user-profile" frameStyle={3} isResizable={false}
            initialPosition={windowPosition} onPositionChange={setWindowPosition} unconstrainedPosition>
            <OctaneCardHeaderView headerText={LocalizeText('extendedprofile.caption')} onCloseClick={onClose} />
            <div className="octane-extended-profile-window__content">
                {isBlocked && (
                    // Official blocked_container: the drama text, whose "event:profile/unblock" link
                    // opens the unblock confirm (it carries no href, so it is never followed as a
                    // page), and Frank's stop sign.
                    <div className="octane-extended-profile__blocked-overlay">
                        <div
                            className="octane-extended-profile__blocked-text"
                            onClick={(event) => {
                                if (!(event.target as HTMLElement).closest('a')) return;

                                event.preventDefault();
                                toggleBlock();
                            }}
                        >
                            <div className="octane-extended-profile__blocked-copy" dangerouslySetInnerHTML={{
                                __html: SanitizeHtml(
                                    localizeWithFallback('extendedprofile.blocked', 'You are blocking this user. <a href="event:profile/unblock">Unblock</a>')
                                        .split(' href="event:profile/unblock"')
                                        .join('')
                                )
                            }} />
                        </div>
                        <img className="octane-extended-profile__blocked-frank" src={frankStop} alt="" draggable={false} />
                    </div>
                )}
                <UserContainerView
                    userBadges={userBadges}
                    userProfile={userProfile}
                    userRelationships={userRelationships}
                    isBlocked={isBlocked}
                    onToggleBlock={toggleBlock}
                    onOpenRooms={onOpenRooms}
                    onClose={onClose}
                />
                <div className="octane-extended-profile-window__body">
                    {isProfileHidden ? (
                        <div className="octane-extended-profile__hidden-profile">
                            <p>{localizeWithFallback('profile.full_profile_hidden', 'The full profile of this user is hidden')}</p>
                        </div>
                    ) : <GroupsContainerView
                        groups={userProfile.groups}
                        itsMe={userProfile.id === GetSessionDataManager().userId}
                        onLeaveGroup={onLeaveGroup}
                    />}
                </div>
            </div>
        </OctaneCardView>
    );
};
