import { GroupInformationComposer, GroupInformationEvent, GroupInformationParser, HabboGroupEntryData } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { CreateLinkEvent, LocalizeText, SanitizeHtml, SendMessageComposer, ToggleFavoriteGroup } from '../../api';
import clearFavourite from '../../assets/images/user-profile/swf/clear-favourite.png';
import noGroupsImage from '../../assets/images/user-profile/swf/ext_profile_grouppic.png';
import groupBaseIcon from '../../assets/images/user-profile/swf/group_base_icon.png';
import makeFavourite from '../../assets/images/user-profile/swf/make-favourite.png';
import { LayoutBadgeImageView } from '../../common';
import { useMessageEvent } from '../../hooks';
import { ProfileGroupDetailsView } from './ProfileGroupDetailsView';

interface GroupsContainerViewProps {
    itsMe: boolean;
    groups: HabboGroupEntryData[];
    onLeaveGroup: () => void;
}

export const GroupsContainerView: FC<GroupsContainerViewProps> = ({ itsMe, groups = [], onLeaveGroup }) => {
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [groupInformation, setGroupInformation] = useState<GroupInformationParser | null>(null);
    const currentGroupId = groups.some((group) => group.groupId === selectedGroupId) ? selectedGroupId : groups[0]?.groupId ?? null;

    const onGroupInformation = useCallback((event: GroupInformationEvent) => {
        const parser = event.getParser();
        if (parser.id === currentGroupId && !parser.flag) setGroupInformation(parser);
    }, [currentGroupId]);
    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, onGroupInformation);

    useEffect(() => {
        setSelectedGroupId(currentGroupId);
    }, [currentGroupId]);

    useEffect(() => {
        setGroupInformation(null);
        if (currentGroupId) SendMessageComposer(new GroupInformationComposer(currentGroupId, false));
    }, [groups, currentGroupId]);

    return (
        <div className="volt-extended-profile-groups">
            <div className="volt-extended-profile-groups__count"
                dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('extendedprofile.groups.count', ['count'], [groups.length.toString()])) }} />
            {groups.length > 0 && (
                <div className="volt-extended-profile-groups__list">
                    {groups.map((group) => (
                        <div key={group.groupId} className={`volt-extended-profile-groups__item${currentGroupId === group.groupId ? ' is-selected' : ''}`}>
                            <button type="button" className="volt-extended-profile-groups__select" aria-label={group.groupName}
                                aria-pressed={currentGroupId === group.groupId} onClick={() => setSelectedGroupId(group.groupId)}>
                                <LayoutBadgeImageView badgeCode={group.badgeCode} isGroup />
                            </button>
                            {itsMe && (
                                <button type="button" className="volt-extended-profile-groups__favourite"
                                    aria-label={LocalizeText(group.favourite ? 'group.clearfavourite' : 'group.makefavourite')}
                                    onClick={() => { setSelectedGroupId(group.groupId); ToggleFavoriteGroup(group); }}>
                                    <img src={group.favourite ? clearFavourite : makeFavourite} alt="" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="volt-extended-profile-groups__details">
                <div className="volt-extended-profile-groups__content">
                    {!groups.length ? (
                        <div className="volt-extended-profile-groups__empty">
                            <p className="volt-extended-profile-groups__empty-caption">{LocalizeText(itsMe ? 'extendedprofile.nogroups.me' : 'extendedprofile.nogroups.user')}</p>
                            <img className="volt-extended-profile-groups__empty-image" src={noGroupsImage} alt="" />
                            <p className="volt-extended-profile-groups__empty-info">{LocalizeText('extendedprofile.nogroups.info')}</p>
                            <button type="button" className="volt-extended-profile-groups__browse" onClick={() => CreateLinkEvent('navigator/search/hotel_view/group:')}>
                                <img src={groupBaseIcon} alt="" />
                                <span>{LocalizeText('extendedprofile.nogroups.viewgroups')}</span>
                            </button>
                        </div>
                    ) : groupInformation?.id === currentGroupId && (
                        <ProfileGroupDetailsView groupInformation={groupInformation} onLeaveGroup={onLeaveGroup} />
                    )}
                </div>
            </div>
        </div>
    );
};
