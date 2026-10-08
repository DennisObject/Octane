import { CSSProperties, FC, useMemo } from 'react';
import { GetConfigurationValue } from '../../api';
import { Base, BaseProps } from '../Base';
import { LayoutActivityPointIcon, UsesActivityPointIcon } from './LayoutActivityPointIcon';

export interface CurrencyIconProps extends BaseProps<HTMLDivElement> {
    type: number | string;
    big?: boolean;
}

export const LayoutCurrencyIcon: FC<CurrencyIconProps> = (props) => {
    const { type = '', big = false, classNames = [], style = {}, ...rest } = props;
    const activityPointType = typeof type === 'number' ? type : Number.NaN;

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = ['octane-currency-icon', 'bg-center bg-no-repeat w-[15px] h-[15px]'];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    const urlString = useMemo(() => {
        let url = GetConfigurationValue<string>('currency.asset.icon.url', '');

        url = url.replace('%type%', type.toString());

        return `url(${url})`;
    }, [type]);

    const getStyle = useMemo(() => {
        let newStyle: CSSProperties = {};

        newStyle.backgroundImage = urlString;

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [style, urlString]);

    if (UsesActivityPointIcon(activityPointType, big)) return <LayoutActivityPointIcon big={big} type={activityPointType} />;

    return <Base classNames={getClassNames} style={getStyle} {...rest} />;
};
