import { FC, useCallback, useState } from 'react';
import { Column, ColumnProps } from '../..';
import { VoltCardAccordionContextProvider } from './VoltCardAccordionContext';

interface VoltCardAccordionViewProps extends ColumnProps {}

export const VoltCardAccordionView: FC<VoltCardAccordionViewProps> = (props) => {
    const { ...rest } = props;
    const [closers, setClosers] = useState<Function[]>([]);

    const closeAll = useCallback(() => {
        for (const closer of closers) closer();
    }, [closers]);

    return (
        <VoltCardAccordionContextProvider value={{ closers, setClosers, closeAll }}>
            <Column gap={0} {...rest} />
        </VoltCardAccordionContextProvider>
    );
};
