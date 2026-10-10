import { FrontPageItem } from '@volt/renderer';
import { FC } from 'react';
import { GetConfigurationValue } from '../../../../../../api';

export interface CatalogLayoutFrontPageItemViewProps {
    item: FrontPageItem;
    first?: boolean;
    onSelect: (item: FrontPageItem) => void;
}

// featured_item_template / firstitem: the bitmap stays at its natural size (stretched_x/y false, pivot center).
// The first item's click region stops above the title strip (184x422). List items use the full 360x126 cell.
export const CatalogLayoutFrontPageItemView: FC<CatalogLayoutFrontPageItemViewProps> = (props) => {
    const { item = null, first = false, onSelect = null } = props;

    if (!item) return null;

    const imageUrl = item.itemPromoImage ? GetConfigurationValue<string>('image.library.url', '') + item.itemPromoImage : null;

    return (
        <div className={`volt-cfp-item ${first ? 'is-first' : ''}`}>
            <div className="volt-cfp-item-image" style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined} />
            <div className="volt-cfp-item-title">
                <span>{item.itemName}</span>
            </div>
            <button className="volt-cfp-item-region" type="button" onClick={() => onSelect(item)} />
        </div>
    );
};
