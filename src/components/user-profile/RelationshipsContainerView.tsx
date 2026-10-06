import { FindNewFriendsMessageComposer, RelationshipStatusEnum, RelationshipStatusInfoMessageParser } from '@octane/renderer';
import { FC } from 'react';
import { GetUserProfile, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../api';
import bobba from '../../assets/images/user-profile/swf/bobba.png';
import heart from '../../assets/images/user-profile/swf/heart.png';
import smile from '../../assets/images/user-profile/swf/smile.png';
import { LayoutAvatarImageView } from '../../common';
import { useNotification } from '../../hooks';

interface RelationshipsContainerViewProps {
    relationships: RelationshipStatusInfoMessageParser;
    /** Closes the profile once the user agrees to go looking for friends. */
    onClose?: () => void;
}

export const RelationshipsContainerView: FC<RelationshipsContainerViewProps> = (props) => {
    const { relationships = null, onClose = null } = props;
    const { showConfirm = null } = useNotification();

    // Official ExtendedProfileWindowCtrl: an empty category asks first, then runs the
    // find-friends search and closes the profile.
    const findFriends = () =>
        showConfirm(
            localizeWithFallback(
                'extendedprofile.add.friends.alert.body',
                'Following this link takes you out of the room you are in, to a room where you can meet new friends.'
            ),
            () => {
                SendMessageComposer(new FindNewFriendsMessageComposer());
                onClose?.();
            },
            null,
            null,
            null,
            localizeWithFallback('extendedprofile.add.friends.alert.title', 'Leave the room?')
        );

    const renderRelationship = (type: number) => {
        const relationshipInfo = relationships && relationships.relationshipStatusMap.hasKey(type) ? relationships.relationshipStatusMap.getValue(type) : null;
        const relationshipName = RelationshipStatusEnum.RELATIONSHIP_NAMES[type].toLocaleLowerCase();

        return (
            <div key={type} className="octane-extended-profile__relationship">
                <img className="octane-extended-profile__relationship-icon" src={type === RelationshipStatusEnum.HEART ? heart : type === RelationshipStatusEnum.SMILE ? smile : bobba} alt="" />
                <div className="octane-extended-profile__relationship-copy">
                    <div className="octane-extended-profile__relationship-box">
                        <button type="button"
                            className="octane-extended-profile__relationship-name"
                            onClick={(event) =>
                                relationshipInfo && relationshipInfo.randomFriendId >= 1
                                    ? GetUserProfile(relationshipInfo.randomFriendId)
                                    : findFriends()
                            }
                        >
                            {(!relationshipInfo || relationshipInfo.friendCount === 0) && LocalizeText('extendedprofile.add.friends')}
                            {relationshipInfo && relationshipInfo.friendCount >= 1 && relationshipInfo.randomFriendName}
                        </button>
                        {relationshipInfo && relationshipInfo.friendCount >= 1 && (
                            <div className="octane-extended-profile__relationship-head">
                                {/* Official avatar_image:direction "southwest", which the AIR widget maps to 4. */}
                                <LayoutAvatarImageView direction={4} figure={relationshipInfo.randomFriendFigure} headOnly nativeCroppedHead />
                            </div>
                        )}
                    </div>
                    <p className="octane-extended-profile__relationship-subcopy">
                        {(!relationshipInfo || relationshipInfo.friendCount === 0) && LocalizeText('extendedprofile.no.friends.in.this.category')}
                        {relationshipInfo &&
                            relationshipInfo.friendCount > 1 &&
                            LocalizeText(`extendedprofile.relstatus.others.${relationshipName}`, ['count'], [(relationshipInfo.friendCount - 1).toString()])}
                        &nbsp;
                    </p>
                </div>
            </div>
        );
    };

    return (
        <>
            {[RelationshipStatusEnum.HEART, RelationshipStatusEnum.SMILE, RelationshipStatusEnum.BOBBA].map(renderRelationship)}
        </>
    );
};
