import { createContext, Dispatch, FC, ReactNode, SetStateAction, useContext } from 'react';

export interface IVoltCardAccordionContext {
    closers: Function[];
    setClosers: Dispatch<SetStateAction<Function[]>>;
    closeAll: () => void;
}

const VoltCardAccordionContext = createContext<IVoltCardAccordionContext>({
    closers: null,
    setClosers: null,
    closeAll: null
});

export const VoltCardAccordionContextProvider: FC<{ value: IVoltCardAccordionContext; children?: ReactNode }> = (props) => {
    return <VoltCardAccordionContext {...props} />;
};

export const useVoltCardAccordionContext = () => useContext(VoltCardAccordionContext);
