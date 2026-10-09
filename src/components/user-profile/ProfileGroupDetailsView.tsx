import { CreateLinkEvent, GetSessionDataManager, GroupInformationParser, GroupRemoveMemberComposer } from '@octane/renderer';
import { FC } from 'react';
import { CatalogPageName, GetGroupManager, GetGroupMembers, GroupMembershipType, GroupType, LocalizeText, SendMessageComposer, TryJoinGroup, TryVisitRoom } from '../../api';
import decorateIcon from '../../assets/images/user-profile/swf/group_decorate_icon.png';
import adminIcon from '../../assets/images/user-profile/swf/group_icon_big_admin.png';
import memberIcon from '../../assets/images/user-profile/swf/group_icon_big_member.png';
import ownerIcon from '../../assets/images/user-profile/swf/group_icon_big_owner.png';
import exclusiveType from '../../assets/images/user-profile/swf/grouptype_icon_1.png';
import privateType from '../../assets/images/user-profile/swf/grouptype_icon_2.png';
import regularType from '../../assets/images/user-profile/swf/grouptype_icon_5.png';
import { LayoutBadgeImageView } from '../../common';
import { useNotification } from '../../hooks';

interface ProfileGroupDetailsViewProps {
    groupInformation: GroupInformationParser;
    onLeaveGroup: () => void;
}

export const ProfileGroupDetailsView: FC<ProfileGroupDetailsViewProps> = ({ groupInformation: group, onLeaveGroup }) => {
    const { showConfirm } = useNotification();
    const isOwner = group.isOwner || group.ownerName === GetSessionDataManager().userName;
    const isMember = group.membershipType === GroupMembershipType.MEMBER;
    const isPending = group.membershipType === GroupMembershipType.REQUEST_PENDING;
    const canJoin = !isOwner && group.membershipType === GroupMembershipType.NOT_MEMBER &&
        (group.type === GroupType.REGULAR || group.type === GroupType.EXCLUSIVE || group.type === 4);
    const role = isOwner ? 'owner' : group.isAdmin ? 'admin' : 'member';

    const leaveGroup = () => showConfirm(LocalizeText('group.leaveconfirm.desc'), () => {
        SendMessageComposer(new GroupRemoveMemberComposer(group.id, GetSessionDataManager().userId));
        onLeaveGroup();
    }, null);

    return (
        <div className="octane-profile-group-info">
            <div className="octane-profile-group-info__badge"><LayoutBadgeImageView badgeCode={group.badge} isGroup /></div>
            {group.type >= 0 && group.type <= 2 && <img className="octane-profile-group-info__type" src={[regularType, exclusiveType, privateType][group.type]} alt=""
                title={LocalizeText(`group.edit.settings.type.${['regular', 'exclusive', 'private'][group.type]}.help`)} />}
            {group.canMembersDecorate && <img className="octane-profile-group-info__decorate" src={decorateIcon} alt="" title={LocalizeText('group.memberscandecorate')} />}
            <p className={`octane-profile-group-info__name${group.canMembersDecorate ? ' has-decorate' : ''}`}>{group.title}</p>
            <p className="octane-profile-group-info__created">{LocalizeText('group.created', ['date', 'owner'], [group.createdAt, group.ownerName])}</p>
            <div className="octane-profile-group-info__description"><div>{group.description}</div></div>
            <button type="button" className="octane-profile-group-info__members" onClick={() => GetGroupMembers(group.id, 0)}>
                {LocalizeText('group.membercount', ['totalMembers'], [group.membersCount.toString()])}
            </button>
            {group.pendingRequestsCount > 0 && <button type="button" className="octane-profile-group-info__pending-members" onClick={() => GetGroupMembers(group.id, 2)}>
                {LocalizeText('group.pendingmembercount', ['amount'], [group.pendingRequestsCount.toString()])}
            </button>}
            {group.roomId > -1 && <button type="button" className="octane-profile-group-info__room" onClick={() => TryVisitRoom(group.roomId)}>
                {LocalizeText('group.linktobase', ['room_name'], [group.roomName])}
            </button>}
            <button type="button" className="octane-profile-group-info__furniture" onClick={() => CreateLinkEvent('catalog/open/' + CatalogPageName.GUILD_CUSTOM_FURNI)}>
                {LocalizeText('group.buyfurni')}
            </button>
            <button type="button" className="octane-profile-group-info__browse" onClick={() => CreateLinkEvent('navigator/search/hotel_view/group:')}>
                {LocalizeText('group.showgroups')}
            </button>
            {group.hasForum && <button type="button" className="octane-profile-group-info__forum" onClick={() => CreateLinkEvent('groupforum/' + group.id)}>
                {LocalizeText('group.showforum')}
            </button>}
            {isOwner && <button type="button" className="octane-profile-group-info__manage" onClick={() => GetGroupManager(group.id)}>
                {LocalizeText('group.manage')}
            </button>}
            {(isMember || isOwner) && <img className="octane-profile-group-info__role" src={isOwner ? ownerIcon : group.isAdmin ? adminIcon : memberIcon} alt="" title={LocalizeText('group.youare' + role)} />}
            {isPending && <span className="octane-profile-group-info__pending">{LocalizeText('group.membershippending')}</span>}
            {isOwner && <span className="octane-profile-group-info__owner">{LocalizeText('group.youareowner')}</span>}
            {!isOwner && isMember && <button type="button" className="octane-profile-group-info__button" onClick={leaveGroup}>{LocalizeText('group.leave')}</button>}
            {canJoin && <button type="button" className={`octane-profile-group-info__button${group.type === GroupType.EXCLUSIVE ? ' is-request' : ''}`} onClick={() => TryJoinGroup(group.id)}>
                {LocalizeText(group.type === GroupType.EXCLUSIVE ? 'group.requestmembership' : 'group.join')}
            </button>}
        </div>
    );
};
