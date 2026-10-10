import { CreateLinkEvent } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { VoltButton } from '../../../layout';

export interface InventoryCategoryEmptyViewProps {
    title: string;
    desc: string;
}

export const InventoryCategoryEmptyView: FC<InventoryCategoryEmptyViewProps> = (props) => {
    const { title = '', desc = '' } = props;

    return (
        <div className="volt-inventory-empty">
            <div className="volt-inventory-empty-image" aria-hidden="true" />
            <div className="volt-inventory-empty-copy">
                <div className="volt-inventory-empty-title">{title}</div>
                <div className="volt-inventory-empty-desc">{desc}</div>
            </div>
            <VoltButton className="volt-inventory-empty-shop" onClick={() => CreateLinkEvent('catalog/toggle/normal')}>
                {LocalizeText('inventory.open.catalog')}
            </VoltButton>
        </div>
    );
};
