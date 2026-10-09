import { CreateLinkEvent, GetSessionDataManager, IUserCurrentBadgeData, RelationshipStatusInfoMessageParser, UserProfileParser } from '@octane/renderer';
import { FC, MouseEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FriendlyTime, GetConfigurationValue, LocalizeBadgeDescription, LocalizeBadgeName, LocalizeText, localizeWithFallback, SanitizeHtml } from '../../api';
import { badgeEmblemDefault } from '../../assets/images/leaderboard_badge';
import { block as profileBlockIcon, level as profileLevelIcon, rooms as profileRoomsIcon } from '../../assets/images/user-profile';
import hiddenIcon from '../../assets/images/user-profile/swf/hidden_icon.png';
import offlineIcon from '../../assets/images/user-profile/swf/offline_icon.png';
import onlineIcon from '../../assets/images/user-profile/swf/online_icon.png';
import { LayoutBadgeImageView, UserIdentityView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { useFriendsActions, useFriendsState } from '../../hooks';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { RelationshipsContainerView } from './RelationshipsContainerView';

interface UserContainerViewProps {
    userProfile: UserProfileParser;
    userBadges?: IUserCurrentBadgeData[];
    userRelationships?: RelationshipStatusInfoMessageParser;
    onOpenRooms?: () => void;
    /** Closes the profile window (the official find-friends link closes it). */
    onClose?: () => void;
    /** Official block_button / blocked_container: the user is on the session block list. */
    isBlocked?: boolean;
    onToggleBlock?: () => void;
}

// v75 BadgeRarity's default preset (uncommon is presented as common).
const BADGE_RARITY_LABELS = ['common', 'common', 'rare', 'epic', 'mythical', 'legendary', 'unique'];
const BADGE_RARITY_TAG_COLORS = [0x777777, 0x777777, 0x56a152, 0x5194cc, 0xa564b5, 0xc02a20, 0xcc9200];

export const UserContainerView: FC<UserContainerViewProps> = (props) => {
    const { userProfile = null, userBadges = [], userRelationships = null, onOpenRooms = null, onClose = null, isBlocked = false, onToggleBlock = null } = props;

    const [requestSent, setRequestSent] = useState(userProfile.requestSent);
    const [badgePopup, setBadgePopup] = useState<{ userId: number; index: number; badgeCode: string; x: number; y: number; layer: number } | null>(null);
    const { canRequestFriend } = useFriendsState();
    const { requestFriend } = useFriendsActions();
    const isOwnProfile = userProfile.id === GetSessionDataManager().userId;
    const canSendFriendRequest = !requestSent && !isOwnProfile && !userProfile.isMyFriend && !userProfile.requestSent && canRequestFriend(userProfile.id);
    const selectedBadges = useMemo(() => {
        const slots: (IUserCurrentBadgeData | null)[] = Array(5).fill(null);
        for (const badge of userBadges) {
            const index = badge.slotId - 1;
            if (index >= 0 && index < slots.length) slots[index] = badge;
        }
        return slots;
    }, [userBadges]);
    const hasNativeProfileFields = userProfile.hasNativeProfileFields;
    const presenceStatus = userProfile.onlineStatus;

    // Official user_activity_points is hidden unless activity.point.display.enabled.
    const showActivityPoints = GetConfigurationValue<boolean>('activity.point.display.enabled', false);

    const addFriend = () => {
        if (!canSendFriendRequest || !canRequestFriend(userProfile.id)) return;

        requestFriend(userProfile.id, userProfile.username);
        setRequestSent(true);
    };

    const showBadgePopup = (event: MouseEvent<HTMLDivElement>, index: number) => {
        const badgeCode = selectedBadges[index]?.badgeCode;
        if (!badgeCode) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const frame = event.currentTarget.closest('.draggable-window');
        const layer = frame ? Number(window.getComputedStyle(frame).zIndex) || 0 : 0;
        setBadgePopup({ userId: userProfile.id, index, badgeCode, x: rect.right, y: rect.top + rect.height / 2, layer: layer + 1 });
    };

    const visibleBadgePopup = badgePopup?.userId === userProfile.id && selectedBadges[badgePopup.index]?.badgeCode === badgePopup.badgeCode ? badgePopup : null;
    const popupBadge = visibleBadgePopup ? selectedBadges[visibleBadgePopup.index] : null;
    const badgeDescription = visibleBadgePopup ? LocalizeBadgeDescription(visibleBadgePopup.badgeCode) : '';
    const rarityLabel = popupBadge ? BADGE_RARITY_LABELS[popupBadge.badgeRarityId] ?? (popupBadge.badgeRarityId < 2 ? 'common' : '') : '';
    const rarityColor = popupBadge ? BADGE_RARITY_TAG_COLORS[popupBadge.badgeRarityId] ?? 0 : 0;
    const raritySkinFilter = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><filter id="t"><feColorMatrix type="matrix" values="0 0 0 0 ${((rarityColor >> 16) & 255) / 255} 0 0 0 0 ${((rarityColor >> 8) & 255) / 255} 0 0 0 0 ${(rarityColor & 255) / 255} 0 0 0 1 0" color-interpolation-filters="sRGB"/></filter></svg>`)}#t")`;

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
                            <ProfileAvatarImage figure={userProfile.figure} />
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
                                            <NativeText background={0xffffff} className="octane-extended-profile__friend-label" text={LocalizeText('extendedprofile.addasafriend')} textStyle="u_regular" />
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
                            <div key={index} className="octane-extended-profile__badge-slot"
                                onMouseEnter={(event) => showBadgePopup(event, index)} onMouseLeave={() => setBadgePopup(null)}>
                                {selectedBadges[index] && <LayoutBadgeImageView badgeCode={selectedBadges[index].badgeCode} />}
                            </div>
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
                    onClick={() => CreateLinkEvent('badge_leaderboard/0/-1/0')}
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
            {visibleBadgePopup && createPortal(
                <div className="octane-profile-badge-details" role="tooltip"
                    style={{ left: visibleBadgePopup.x, top: visibleBadgePopup.y, zIndex: visibleBadgePopup.layer }}>
                    <div className="octane-profile-badge-details__name">{LocalizeBadgeName(visibleBadgePopup.badgeCode)}</div>
                    {badgeDescription && <div className="octane-profile-badge-details__description">{badgeDescription}</div>}
                    {popupBadge && <div className="octane-profile-badge-details__rarity">
                        <span className="octane-profile-badge-details__rarity-skin" aria-hidden="true" style={{ filter: raritySkinFilter }} />
                        <span className="octane-profile-badge-details__rarity-text">
                            {LocalizeText('badge.rarity.badge', ['rarity'], [rarityLabel ? LocalizeText(`badge.rarity.${rarityLabel}`) : ''])}
                        </span>
                    </div>}
                    {popupBadge?.ownerCount > 0 && popupBadge.ownerCount < 1000 && <div className="octane-profile-badge-details__owners">
                        {LocalizeText('badge.owner_count', ['count'], [popupBadge.ownerCount.toString()])}
                    </div>}
                </div>, document.body
            )}
        </div>
    );
};
