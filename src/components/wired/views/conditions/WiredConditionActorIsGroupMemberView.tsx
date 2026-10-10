import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { useUserGroups, useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredQuantifierSection, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const GROUP_CURRENT_ROOM = 0;
const GROUP_SELECTED = 1;

interface WiredConditionActorIsGroupMemberViewProps {
    negative?: boolean;
}

export const WiredConditionActorIsGroupMemberView: FC<WiredConditionActorIsGroupMemberViewProps> = ({ negative = false }) => {
    const { data: groups = [] } = useUserGroups();
    const [userSource, setUserSource] = useState(0);
    const [groupType, setGroupType] = useState(GROUP_CURRENT_ROOM);
    const [selectedGroupId, setSelectedGroupId] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const {
        trigger = null,
        setIntParams = null,
        setUserSources,
        quantifier: nativeQuantifier,
        setQuantifier: setNativeQuantifier,
        setStringParam
    } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const groupId = Number(trigger.stringData || 0);

        setUserSource(trigger.userSources[0] ?? 0);
        setGroupType(groupId > 0 ? GROUP_SELECTED : GROUP_CURRENT_ROOM);
        setSelectedGroupId(groupId);
        setQuantifier(nativeQuantifier);
    }, [trigger, nativeQuantifier]);

    useEffect(() => {
        if (groupType !== GROUP_SELECTED || selectedGroupId || !groups.length) return;

        setSelectedGroupId(groups[0].groupId);
    }, [groupType, selectedGroupId, groups]);

    const selectedGroupOptions = useMemo(() => groups.map((group) => ({ id: group.groupId, label: group.groupName })), [groups]);

    const save = () => {
        setIntParams([]);
        setStringParam(groupType === GROUP_SELECTED ? String(selectedGroupId) : '');
        setUserSources([userSource]);
        setNativeQuantifier(quantifier);
    };

    // class_3953: the group dropdown hangs under "Select from list" and is disabled while the other option is picked.
    const groupDropdown = (
        <WiredDropdown
            caption={localizeWithFallback('wiredfurni.tooltip.group', 'Select group')}
            disabled={groupType !== GROUP_SELECTED}
            options={selectedGroupOptions}
            value={selectedGroupOptions.length ? selectedGroupId : -1}
            onChange={setSelectedGroupId}
        />
    );

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <>
                    <WiredQuantifierSection kind="users" name="conditionGroupQuantifier" negative={negative} value={quantifier} onChange={setQuantifier} />
                    <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                </>
            }
        >
            <WiredSection title={localizeWithFallback('wiredfurni.params.groupselection', 'Choose group:')}>
                <WiredRadioGroup
                    name="conditionGroupType"
                    options={[
                        { id: GROUP_CURRENT_ROOM, label: LocalizeText(`wiredfurni.params.grouptype.${GROUP_CURRENT_ROOM}`) },
                        { id: GROUP_SELECTED, label: LocalizeText(`wiredfurni.params.grouptype.${GROUP_SELECTED}`), extra: groupDropdown }
                    ]}
                    value={groupType}
                    onChange={setGroupType}
                />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
