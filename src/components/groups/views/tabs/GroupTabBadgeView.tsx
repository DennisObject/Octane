import { GroupSaveBadgeComposer } from '@octane/renderer';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react';
import { GroupBadgePart, IGroupData, LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, Grid, LayoutBadgeImageView } from '../../../../common';
import { useGroup } from '../../../../hooks';
import { GroupBadgeCreatorView } from '../GroupBadgeCreatorView';

interface GroupTabBadgeViewProps {
    skipDefault?: boolean;
    setCloseAction: Dispatch<SetStateAction<{ action: () => boolean }>>;
    groupData: IGroupData;
    setGroupData: Dispatch<SetStateAction<IGroupData>>;
}

export const GroupTabBadgeView: FC<GroupTabBadgeViewProps> = (props) => {
    const { groupData = null, setGroupData = null, setCloseAction = null, skipDefault = null } = props;
    const [badgeParts, setBadgeParts] = useState<GroupBadgePart[]>(null);
    const { groupCustomize = null } = useGroup();

    const getModifiedBadgeCode = () => {
        if (!badgeParts || !badgeParts.length) return '';

        let badgeCode = '';

        badgeParts.forEach((part) => part.code && (badgeCode += part.code));

        return badgeCode;
    };

    const saveBadge = useCallback(() => {
        if (!groupData || !badgeParts || !badgeParts.length) return false;

        if (groupData.groupBadgeParts.length === badgeParts.length && badgeParts.every((part, index) =>
            part.key === groupData.groupBadgeParts[index].key && part.color === groupData.groupBadgeParts[index].color && part.position === groupData.groupBadgeParts[index].position)) return true;

        if (groupData.groupId <= 0) {
            setGroupData((prevValue) => {
                const newValue = { ...prevValue };

                newValue.groupBadgeParts = badgeParts;

                return newValue;
            });

            return true;
        }

        const badge = [];

        badgeParts.forEach((part) => {
            if (!part.code) return;

            badge.push(part.key);
            badge.push(part.color);
            badge.push(part.position);
        });

        SendMessageComposer(new GroupSaveBadgeComposer(groupData.groupId, badge));
        setGroupData(prevValue => ({ ...prevValue, groupBadgeParts: badgeParts }));

        return true;
    }, [groupData, badgeParts, setGroupData]);

    useEffect(() => {
        if (groupData.groupBadgeParts && groupData.groupBadgeParts.length) return;

        if (!groupCustomize?.badgeBases?.length || !groupCustomize?.badgePartColors?.length) return;

        const badgeParts = [
            new GroupBadgePart(GroupBadgePart.BASE, groupCustomize.badgeBases[0].id, groupCustomize.badgePartColors[0].id),
            new GroupBadgePart(GroupBadgePart.SYMBOL, 0, groupCustomize.badgePartColors[0].id),
            new GroupBadgePart(GroupBadgePart.SYMBOL, 0, groupCustomize.badgePartColors[0].id),
            new GroupBadgePart(GroupBadgePart.SYMBOL, 0, groupCustomize.badgePartColors[0].id),
            new GroupBadgePart(GroupBadgePart.SYMBOL, 0, groupCustomize.badgePartColors[0].id)
        ];

        setGroupData((prevValue) => {
            const groupBadgeParts = badgeParts;

            return { ...prevValue, groupBadgeParts };
        });
    }, [groupData.groupBadgeParts, groupCustomize, setGroupData]);

    useEffect(() => {
        if (groupData.groupId <= 0) {
            setBadgeParts(groupData.groupBadgeParts ? [...groupData.groupBadgeParts] : null);

            return;
        }

        setBadgeParts(groupData.groupBadgeParts);
    }, [groupData.groupId, groupData.groupBadgeParts]);

    useEffect(() => {
        setCloseAction({ action: saveBadge });

        return () => setCloseAction(null);
    }, [setCloseAction, saveBadge]);

    return (
        <Grid gap={1} overflow="hidden">
            <Column size={2}>
                <Flex center className="bg-muted rounded p-1">
                    <LayoutBadgeImageView badgeCode={getModifiedBadgeCode()} isGroup={true} />
                </Flex>
                {groupData.groupId > 0 && (
                    <Button variant="link" onClick={() => setBadgeParts([...groupData.groupBadgeParts])}>
                        {LocalizeText('group.edit.reset.badge')}
                    </Button>
                )}
            </Column>
            <Column overflow="auto" size={10}>
                <GroupBadgeCreatorView badgeParts={badgeParts} setBadgeParts={setBadgeParts} />
            </Column>
        </Grid>
    );
};
