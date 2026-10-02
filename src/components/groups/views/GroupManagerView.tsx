import { GroupInformationEvent, GroupSettingsEvent, HabboGroupDeactivatedMessageEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import { GroupBadgePart, IGroupData, LocalizeText } from '../../../api';
import { Column, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView, Text } from '../../../common';
import { useMessageEvent } from '../../../hooks';
import { GroupTabBadgeView } from './tabs/GroupTabBadgeView';
import { GroupTabColorsView } from './tabs/GroupTabColorsView';
import { GroupTabIdentityView } from './tabs/GroupTabIdentityView';
import { GroupTabSettingsView } from './tabs/GroupTabSettingsView';

const TABS: number[] = [1, 2, 3, 5];

export const GroupManagerView: FC<{}> = (props) => {
    const [currentTab, setCurrentTab] = useState<number>(1);
    const [closeAction, setCloseAction] = useState<{ action: () => boolean }>(null);
    const [groupData, setGroupData] = useState<IGroupData>(null);

    const onClose = () => {
        if (closeAction?.action && !closeAction.action()) return;

        setCloseAction(null);
        setGroupData(null);
    };

    const changeTab = (tab: number) => {
        if (tab === currentTab) return;
        if (closeAction?.action && !closeAction.action()) return;

        setCurrentTab(tab);
    };

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if (!groupData || groupData.groupId !== parser.id) return;

        setGroupData((prevValue) => {
            const newValue = { ...prevValue };

            newValue.groupName = parser.title;
            newValue.groupDescription = parser.description;
            newValue.groupState = parser.type;
            newValue.groupCanMembersDecorate = parser.canMembersDecorate;
            newValue.groupHasForum = parser.hasForum;
            newValue.groupMembersCount = parser.membersCount;

            return newValue;
        });
    });

    useMessageEvent<GroupSettingsEvent>(GroupSettingsEvent, (event) => {
        const parser = event.getParser();

        const groupBadgeParts: GroupBadgePart[] = [];

        parser.badgeParts.forEach((part, id) => {
            groupBadgeParts.push(new GroupBadgePart(part.isBase ? GroupBadgePart.BASE : GroupBadgePart.SYMBOL, part.key, part.color, part.position));
        });

        setCurrentTab(1);
        setCloseAction(null);
        setGroupData({
            groupId: parser.id,
            groupName: parser.title,
            groupDescription: parser.description,
            groupHomeroomId: parser.roomId,
            groupState: parser.state,
            groupCanMembersDecorate: parser.canMembersDecorate,
            groupHasForum: parser.hasForum,
            groupMembersCount: parser.membersCount,
            groupColors: [parser.colorA, parser.colorB],
            groupBadgeParts
        });
    });

    useMessageEvent<HabboGroupDeactivatedMessageEvent>(HabboGroupDeactivatedMessageEvent, (event) =>
    {
        if (groupData?.groupId !== event.getParser().groupId) return;

        setCloseAction(null);
        setGroupData(null);
    });

    if (!groupData || groupData.groupId <= 0) return null;

    return (
        <OctaneCardView frameStyle={3} className="octane-groups-window octane-group-manager w-[560px]">
            <OctaneCardHeaderView headerText={LocalizeText('group.window.title')} onCloseClick={onClose} />
            <OctaneCardTabsView>
                {TABS.map((tab) => {
                    return (
                        <OctaneCardTabsItemView key={tab} isActive={currentTab === tab} onClick={() => changeTab(tab)}>
                            {LocalizeText(`group.edit.tab.${tab}`)}
                        </OctaneCardTabsItemView>
                    );
                })}
            </OctaneCardTabsView>
            <OctaneCardContentView className="octane-groups-content">
                <div className="octane-groups-tab-header items-center gap-2">
                    <div className={`octane-group-tab-image tab-${currentTab}`} />
                    <Column grow gap={0}>
                        <Text bold fontSize={4}>
                            {LocalizeText(`group.edit.tabcaption.${currentTab}`)}
                        </Text>
                        <Text>{LocalizeText(`group.edit.tabdesc.${currentTab}`)}</Text>
                    </Column>
                </div>
                <Column grow overflow="hidden">
                    {currentTab === 1 && (
                        <GroupTabIdentityView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} />
                    )}
                    {currentTab === 2 && (
                        <GroupTabBadgeView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} skipDefault={true} />
                    )}
                    {currentTab === 3 && <GroupTabColorsView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} />}
                    {currentTab === 5 && <GroupTabSettingsView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} />}
                </Column>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
