import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { Flex, Text } from '../../../../../common';

interface InfoStandWidgetUserTagsViewProps {
    tags: string[];
}

const processAction = (tag: string) => CreateLinkEvent(`navigator/tag/${tag}`);

export const InfoStandWidgetUserTagsView: FC<InfoStandWidgetUserTagsViewProps> = (props) => {
    const { tags = null } = props;

    if (!tags || !tags.length) return null;

    return (
        <>
            <hr className="m-0" />
            <Flex className="flex-tags">
                {tags &&
                    tags.length > 0 &&
                    tags.map((tag, index) => (
                        <Text key={index} className="text-tags" variant="white" onClick={(event) => processAction(tag)}>
                            {tag}
                        </Text>
                    ))}
            </Flex>
        </>
    );
};
