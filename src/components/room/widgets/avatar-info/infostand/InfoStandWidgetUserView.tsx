import {
    CreateLinkEvent,
    GetSessionDataManager,
    RelationshipStatusInfoEvent,
    RelationshipStatusInfoMessageParser,
    RoomSessionFavoriteGroupUpdateEvent,
    RoomSessionUserBadgesEvent,
    RoomSessionUserFigureUpdateEvent,
    UserRelationshipsComposer
} from '@octane/renderer';
import React, { Dispatch, FC, FocusEvent, KeyboardEvent, SetStateAction, useCallback, useEffect, useState } from 'react';
import { AvatarInfoUser, CloneObject, GetConfigurationValue, GetGroupInformation, GetUserProfile, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../../api';
import homeIcon from '../../../../../assets/images/infostand/home-icon.png';
import pencilIcon from '../../../../../assets/images/infostand/pencil-icon.png';
import { Column, Flex, LayoutAvatarImageView, LayoutBadgeImageView, Text, UserIdentityView } from '../../../../../common';
import { useMessageEvent, useOctaneEvent, useRoom } from '../../../../../hooks';
import { InfoStandBadgeSlotView } from './InfoStandBadgeSlotView';
import { InfoStandWidgetUserRelationshipsView } from './InfoStandWidgetUserRelationshipsView';
import { InfoStandWidgetUserTagsView } from './InfoStandWidgetUserTagsView';

interface InfoStandWidgetUserViewProps {
    avatarInfo: AvatarInfoUser;
    setAvatarInfo: Dispatch<SetStateAction<AvatarInfoUser>>;
    onClose: () => void;
}

export const InfoStandWidgetUserView: FC<InfoStandWidgetUserViewProps> = (props) => {
    const { avatarInfo = null, setAvatarInfo = null, onClose = null } = props;
    const [motto, setMotto] = useState<string>(null);
    const [isEditingMotto, setIsEditingMotto] = useState(false);
    const [relationships, setRelationships] = useState<RelationshipStatusInfoMessageParser>(null);
    const { roomSession = null } = useRoom();

    const handleProfileClick = useCallback(() => {
        GetUserProfile(avatarInfo.webID);
    }, [avatarInfo.webID]);

    const saveMotto = (motto: string) => {
        if (!isEditingMotto || motto.length > GetConfigurationValue<number>('motto.max.length', 38) || !roomSession) return;

        roomSession.sendMottoMessage(motto);
        setIsEditingMotto(false);
    };

    const onMottoBlur = (event: FocusEvent<HTMLInputElement>) => saveMotto(event.target.value);

    const onMottoKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();

        switch (event.key) {
            case 'Enter':
                saveMotto((event.target as HTMLInputElement).value);
                return;
        }
    };

    useOctaneEvent<RoomSessionUserBadgesEvent>(RoomSessionUserBadgesEvent.RSUBE_BADGES, (event) => {
        if (!avatarInfo || avatarInfo.webID !== event.userId) return;

        // Deduplicate badges from server
        const seen = new Set<string>();
        const dedupedBadges = event.badges.map((code) => {
            if (!code || seen.has(code)) return '';
            seen.add(code);
            return code;
        });

        const oldBadges = avatarInfo.badges.join('');

        if (oldBadges === dedupedBadges.join('')) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            newValue.badges = dedupedBadges;
            return newValue;
        });
    });

    useOctaneEvent<RoomSessionUserFigureUpdateEvent>(RoomSessionUserFigureUpdateEvent.USER_FIGURE, (event) => {
        if (!avatarInfo || avatarInfo.roomIndex !== event.roomIndex) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            newValue.figure = event.figure;
            newValue.motto = event.customInfo;
            newValue.achievementScore = event.activityPoints;
            return newValue;
        });
    });

    useOctaneEvent<RoomSessionFavoriteGroupUpdateEvent>(RoomSessionFavoriteGroupUpdateEvent.FAVOURITE_GROUP_UPDATE, (event) => {
        if (!avatarInfo || avatarInfo.roomIndex !== event.roomIndex) return;

        setAvatarInfo((prevValue) => {
            if (!prevValue) return prevValue;

            const newValue = CloneObject(prevValue);
            const clearGroup = event.status === -1 || event.habboGroupId <= 0;

            newValue.groupId = clearGroup ? -1 : event.habboGroupId;
            newValue.groupName = clearGroup ? null : event.habboGroupName;
            newValue.groupBadgeId = clearGroup ? null : GetSessionDataManager().getGroupBadge(event.habboGroupId);
            return newValue;
        });
    });

    useMessageEvent<RelationshipStatusInfoEvent>(RelationshipStatusInfoEvent, (event) => {
        const parser = event.getParser();

        if (!avatarInfo || avatarInfo.webID !== parser.userId) return;

        setRelationships(parser);
    });

    useEffect(() => {
        setIsEditingMotto(false);
        setMotto(avatarInfo.motto);

        SendMessageComposer(new UserRelationshipsComposer(avatarInfo.webID));

        return () => {
            setRelationships(null);
        };
    }, [avatarInfo]);

    if (!avatarInfo) return null;

    const isOwnUser = avatarInfo.type === AvatarInfoUser.OWN_USER;
    const mottoMaxLength = GetConfigurationValue<number>('motto.max.length', 38);
    const showAchievementScore = GetConfigurationValue<boolean>('activity.point.display.enabled', true);
    const hasRelationships = !!relationships?.relationshipStatusMap.length;

    return (
        <>
            <div className="octane-infostand pointer-events-auto z-30">
                <button type="button" className="octane-infostand__close" aria-label="Close" onClick={onClose} />
                <div className="octane-infostand__header">
                    <button
                        type="button"
                        className="octane-infostand__home"
                        aria-label={LocalizeText('infostand.profile.link.tooltip')}
                        onClick={handleProfileClick}
                    >
                        <img src={homeIcon} alt="" draggable={false} />
                    </button>
                    <button type="button" className="octane-infostand__profile-link" onClick={handleProfileClick}>
                        <UserIdentityView
                            className="octane-infostand__identity"
                            nameClassName="text-white"
                            username={avatarInfo.name}
                        />
                    </button>
                </div>
                <div className="octane-infostand__rule" />
                <div className="octane-infostand__figure-row">
                    <div className="octane-infostand__avatar-well" onClick={handleProfileClick}>
                        <LayoutAvatarImageView direction={2} figure={avatarInfo.figure} />
                    </div>
                    <div className="octane-infostand__badges">
                        {(() => {
                            const maxSlots = GetConfigurationValue<number>('user.badges.max.slots', 5);
                            const showGroup = maxSlots <= 5;
                            const items: React.ReactNode[] = [];
                            items.push(<InfoStandBadgeSlotView key={0} slotIndex={0} badgeCode={avatarInfo.badges[0]} isOwnUser={isOwnUser} />);
                            if (showGroup) {
                                items.push(
                                    <Flex
                                        key="group"
                                        center
                                        className="relative h-[42px] w-[42px] bg-no-repeat bg-center"
                                        pointer={avatarInfo.groupId > 0}
                                        onClick={() => GetGroupInformation(avatarInfo.groupId)}
                                    >
                                        {avatarInfo.groupId > 0 && (
                                            <LayoutBadgeImageView
                                                badgeCode={avatarInfo.groupBadgeId}
                                                customTitle={avatarInfo.groupName}
                                                isGroup={true}
                                                showInfo={true}
                                            />
                                        )}
                                    </Flex>
                                );
                            } else {
                                items.push(<InfoStandBadgeSlotView key="slot1" slotIndex={1} badgeCode={avatarInfo.badges[1]} isOwnUser={isOwnUser} />);
                            }
                            const startIdx = showGroup ? 1 : 2;
                            for (let i = startIdx; i < maxSlots; i++) {
                                items.push(<InfoStandBadgeSlotView key={i} slotIndex={i} badgeCode={avatarInfo.badges[i]} isOwnUser={isOwnUser} />);
                            }
                            return items;
                        })()}
                    </div>
                </div>
                <div className="octane-infostand__rule" />
                <div className="octane-infostand__motto">
                    {isOwnUser && <img src={pencilIcon} alt="" className="octane-infostand__pen" />}
                    {!isOwnUser && (
                        <Text fullWidth pointer textBreak wrap className="octane-infostand__motto-text" variant="white">
                            {motto}
                        </Text>
                    )}
                    {isOwnUser && !isEditingMotto && (
                        <Text
                            fullWidth
                            pointer
                            textBreak
                            wrap
                            className={`octane-infostand__motto-text ${motto ? '' : 'is-placeholder'}`}
                            variant="white"
                            onClick={() => setIsEditingMotto(true)}
                        >
                            {motto || LocalizeText('infostand.motto.change')} 
                        </Text>
                    )}
                    {isOwnUser && isEditingMotto && (
                        <>
                            <input
                                autoFocus={true}
                                className="motto-input"
                                maxLength={mottoMaxLength}
                                type="text"
                                value={motto}
                                onBlur={onMottoBlur}
                                onChange={(event) => setMotto(event.target.value)}
                                onKeyDown={onMottoKeyDown}
                            />
                            <span className="octane-infostand__motto-count">
                                {motto.length}/{mottoMaxLength}
                            </span>
                        </>
                    )}
                </div>
                {showAchievementScore && (
                    <>
                        <div className="octane-infostand__rule" />
                        {isOwnUser ? (
                            <button
                                type="button"
                                className="octane-infostand__score octane-infostand__score-link"
                                title={localizeWithFallback('achievements.title', 'Achievements')}
                                onClick={() => CreateLinkEvent('achievements/show')}
                            >
                                {LocalizeText('infostand.text.achievement_score')}
                            </button>
                        ) : (
                            <div className="octane-infostand__score">{LocalizeText('infostand.text.achievement_score')}</div>
                        )}
                        <div className="octane-infostand__score">{avatarInfo.achievementScore}</div>
                    </>
                )}
                {avatarInfo.carryItem > 0 && (
                    <>
                        <div className="octane-infostand__rule" />
                        <div className="octane-infostand__carry">
                            {LocalizeText('infostand.text.handitem', ['item'], [LocalizeText('handitem' + avatarInfo.carryItem)])}
                        </div>
                    </>
                )}
                <div className={`octane-infostand__rule ${hasRelationships ? '' : 'octane-infostand__rule--footer'}`} />
                <InfoStandWidgetUserRelationshipsView relationships={relationships} />
                {GetConfigurationValue('user.tags.enabled') && (
                    <Column className="mt-1" gap={1}>
                        <InfoStandWidgetUserTagsView tags={GetSessionDataManager().tags} />
                    </Column>
                )}
            </div>
        </>
    );
};
