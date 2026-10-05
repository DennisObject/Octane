import { CreateLinkEvent, GetSessionDataManager, RelationshipStatusInfoMessageParser, RequestFriendComposer, UserProfileParser } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FriendlyTime, GetConfigurationValue, LocalizeText, localizeWithFallback, SanitizeHtml, SendMessageComposer } from '../../api';
import { badgeEmblemDefault } from '../../assets/images/leaderboard_badge';
import { block as profileBlockIcon, level as profileLevelIcon, rooms as profileRoomsIcon } from '../../assets/images/user-profile';
import hiddenIcon from '../../assets/images/user-profile/swf/hidden_icon.png';
import offlineIcon from '../../assets/images/user-profile/swf/offline_icon.png';
import onlineIcon from '../../assets/images/user-profile/swf/online_icon.png';
import { LayoutAvatarImageView, LayoutBadgeImageView, UserIdentityView } from '../../common';
import { RelationshipsContainerView } from './RelationshipsContainerView';

interface UserContainerViewProps {
    userProfile: UserProfileParser;
    userBadges?: string[];
    userRelationships?: RelationshipStatusInfoMessageParser;
    onOpenRooms?: () => void;
    /** Closes the profile window (the official find-friends link closes it). */
    onClose?: () => void;
    /** Official block_button / blocked_container: the user is on the session block list. */
    isBlocked?: boolean;
    onToggleBlock?: () => void;
}

export const UserContainerView: FC<UserContainerViewProps> = (props) => {
    const { userProfile = null, userBadges = [], userRelationships = null, onOpenRooms = null, onClose = null, isBlocked = false, onToggleBlock = null } = props;

    const [requestSent, setRequestSent] = useState(userProfile.requestSent);
    const isOwnProfile = userProfile.id === GetSessionDataManager().userId;
    const canSendFriendRequest = !requestSent && !isOwnProfile && !userProfile.isMyFriend && !userProfile.requestSent;
    const selectedBadges = useMemo(() => [...userBadges].slice(0, 5), [userBadges]);
    const hasNativeProfileFields = userProfile.hasNativeProfileFields;
    const presenceStatus = userProfile.onlineStatus;

    // Official user_activity_points is hidden unless activity.point.display.enabled.
    const showActivityPoints = GetConfigurationValue<boolean>('activity.point.display.enabled', false);

    const addFriend = () => {
        setRequestSent(true);
        SendMessageComposer(new RequestFriendComposer(userProfile.username));
    };

    useEffect(() => {
        setRequestSent(userProfile.requestSent);
    }, [userProfile]);

    return (
        <div className={`octane-extended-profile${hasNativeProfileFields ? ' has-native-fields' : ''}${isBlocked ? ' is-blocked' : ''}`}>
            {!isOwnProfile && onToggleBlock && (
                <button
                    type="button"
                    className={`octane-extended-profile__block-button${isBlocked ? ' is-active' : ''}`}
                    title={isBlocked ? localizeWithFallback('extendedprofile.unblock_player.title', 'Unblock user') : localizeWithFallback('extendedprofile.block_player.title', 'Block user')}
                    aria-pressed={isBlocked}
                    onClick={onToggleBlock}
                >
                    {/* The official extended_profile_block_icon, 16x16. */}
                    <img src={profileBlockIcon} alt="" draggable={false} />
                </button>
            )}
            <div className="octane-extended-profile__top">
                <div className="octane-extended-profile__left">
                    <div className="octane-extended-profile__identity">
                        <div className="octane-extended-profile__avatar-shell">
                            <LayoutAvatarImageView figure={userProfile.figure} direction={2} nativeCroppedHead classNames={['octane-extended-profile__avatar-image']} />
                        </div>
                        <div className="octane-extended-profile__identity-copy">
                            <UserIdentityView
                                className="octane-extended-profile__username"
                                username={userProfile.username}
                            />
                            <p className="octane-extended-profile__motto">{userProfile.motto || '\u00A0'}</p>
                            <p className="octane-extended-profile__meta octane-extended-profile__meta--created">
                                <span
                                    dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('extendedprofile.created').replace(/%\w+%/g, '').trim()) }}
                                />{' '}
                                {userProfile.registration}
                            </p>
                            <p className="octane-extended-profile__meta octane-extended-profile__meta--login">
                                <span
                                    dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('extendedprofile.last.login').replace(/%\w+%/g, '').trim()) }}
                                />{' '}
                                {userProfile.secondsSinceLastVisit < 0 ? '-' : FriendlyTime.format(userProfile.secondsSinceLastVisit, '.ago', 2)}
                            </p>
                            {showActivityPoints && (
                                <p
                                    className="octane-extended-profile__meta octane-extended-profile__meta--activity"
                                    dangerouslySetInnerHTML={{
                                        __html: SanitizeHtml(LocalizeText('extendedprofile.activitypoints', ['activitypoints'], [userProfile.achievementPoints.toString()]))
                                    }}
                                />
                            )}
                            <div className="octane-extended-profile__status">
                                <div className="octane-extended-profile__presence">
                                    <img className={presenceStatus === 1 ? 'is-online' : ''}
                                        src={presenceStatus === 2 ? hiddenIcon : presenceStatus === 1 ? onlineIcon : offlineIcon} alt="" />
                                </div>
                                <div className="octane-extended-profile__status-copy">
                                    {canSendFriendRequest && (
                                        <button className="octane-extended-profile__friend-button" type="button" onClick={addFriend}>
                                            {LocalizeText('extendedprofile.addasafriend')}
                                        </button>
                                    )}
                                    {(isOwnProfile || userProfile.isMyFriend) && (
                                        <>
                                            <i className="octane-icon icon-pf-tick" />
                                            <span className="octane-extended-profile__status-text">
                                                {LocalizeText(userProfile.isMyFriend ? 'extendedprofile.friend' : 'extendedprofile.me')}
                                            </span>
                                        </>
                                    )}
                                    {(requestSent || userProfile.requestSent) && (
                                        <span className="octane-extended-profile__request-sent">{LocalizeText('extendedprofile.friendrequestsent')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {isOwnProfile && (
                        <div className="octane-extended-profile__actions">
                            <button className="octane-extended-profile__link" type="button" onClick={() => CreateLinkEvent('avatar-editor/show')}>
                                {LocalizeText('extended.profile.change.looks')}
                            </button>
                            <button className="octane-extended-profile__link" type="button" onClick={() => CreateLinkEvent('inventory/show/badges')}>
                                {LocalizeText('extended.profile.change.badges')}
                            </button>
                        </div>
                    )}

                    <div className="octane-extended-profile__badges">
                        {[0, 1, 2, 3, 4].map((index) => (
                            <button key={index} className="octane-extended-profile__badge-slot" type="button">
                                {selectedBadges[index] && <LayoutBadgeImageView badgeCode={selectedBadges[index]} highlightRarity showInfo showRarityInfo />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="octane-extended-profile__separator" />

                <div className="octane-extended-profile__right">
                    <p
                        className="octane-extended-profile__friend-count"
                        dangerouslySetInnerHTML={{
                            __html: SanitizeHtml(LocalizeText('extendedprofile.friends.count', ['count'], [userProfile.friendsCount < 0 ? '-' : userProfile.friendsCount.toString()]))
                        }}
                    />
                    <p className="octane-extended-profile__relationships-label">{LocalizeText('extendedprofile.relstatus')}</p>
                    {userRelationships && <RelationshipsContainerView relationships={userRelationships} onClose={onClose} />}

                </div>
            </div>

            <div className="octane-extended-profile__summary-bar">
                <button className="octane-extended-profile__summary-button" type="button" onClick={onOpenRooms}>
                    <img className="octane-extended-profile__summary-icon" src={profileRoomsIcon} alt="" />
                    <span className="octane-extended-profile__summary-label">{LocalizeText('extendedprofile.rooms')}</span>
                </button>
                <button
                    className="octane-extended-profile__summary-button octane-extended-profile__summary-button--center"
                    type="button"
                    onClick={() => CreateLinkEvent('badge-leaderboard/show')}
                >
                    <img className="octane-extended-profile__summary-icon octane-extended-profile__summary-icon--badge" src={badgeEmblemDefault} alt="" />
                    <span className="octane-extended-profile__summary-label">{LocalizeText('inventory.badges')}</span>
                    <span className="octane-extended-profile__summary-value">{hasNativeProfileFields ? userProfile.totalBadges : userBadges.length}</span>
                    {hasNativeProfileFields && userProfile.badgeRank >= 0 && <span className="octane-extended-profile__summary-rank">(#{userProfile.badgeRank})</span>}
                </button>
                <div className="octane-extended-profile__summary-button octane-extended-profile__summary-button--center octane-extended-profile__summary-button--level">
                    <img className="octane-extended-profile__summary-icon" src={profileLevelIcon} alt="" />
                    <span className="octane-extended-profile__summary-label">{LocalizeText(hasNativeProfileFields ? 'generic.level' : 'extendedprofile.achievementscore')}</span>
                    <span className="octane-extended-profile__summary-value">{hasNativeProfileFields ? userProfile.level : userProfile.achievementPoints}</span>
                </div>
            </div>
        </div>
    );
};
