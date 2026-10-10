import { createContext, FC, ReactNode, useContext } from 'react';

interface IVoltCardContext {
    theme: string;
}

const VoltCardContext = createContext<IVoltCardContext>({
    theme: null
});

export const VoltCardContextProvider: FC<{ value: IVoltCardContext; children?: ReactNode }> = (props) => {
    return <VoltCardContext value={props.value}>{props.children}</VoltCardContext>;
};

export const useVoltCardContext = () => useContext(VoltCardContext);
