import { FC } from 'react';
import { Flex, FlexProps } from '../..';

export interface VoltCardAccordionItemViewProps extends FlexProps {}

export const VoltCardAccordionItemView: FC<VoltCardAccordionItemViewProps> = (props) => {
    const { alignItems = 'center', gap = 1, children = null, ...rest } = props;

    return (
        <Flex alignItems={alignItems} gap={gap} {...rest}>
            {children}
        </Flex>
    );
};
