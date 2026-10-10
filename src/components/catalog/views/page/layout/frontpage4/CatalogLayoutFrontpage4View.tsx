import { CreateLinkEvent, FrontPageItem } from '@octane/renderer';
import { FC, useCallback, useEffect } from 'react';
import { useCatalogData } from '../../../../../../hooks';
import { CatalogRedeemVoucherView } from '../../common/CatalogRedeemVoucherView';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutFrontPageItemView } from './CatalogLayoutFrontPageItemView';

// layout_frontpage_featured: 552x460. First item 184x460 at (0,0), list at (192,0), voucher border at (200,399).
export const CatalogLayoutFrontpage4View: FC<CatalogLayoutProps> = (props) => {
    const { page = null, hideNavigation = null } = props;
    const { frontPageItems = [] } = useCatalogData();

    const selectItem = useCallback((item: FrontPageItem) => {
        switch (item.type) {
            case FrontPageItem.ITEM_CATALOGUE_PAGE:
                CreateLinkEvent(`catalog/open/${item.catalogPageLocation}`);
                return;
            case FrontPageItem.ITEM_PRODUCT_OFFER:
                CreateLinkEvent(`catalog/open/${item.productOfferId}`);
                return;
        }
    }, []);

    useEffect(() => {
        hideNavigation();
    }, [page, hideNavigation]);

    return (
        <div className="octane-cfp">
            {frontPageItems[0] && <CatalogLayoutFrontPageItemView first item={frontPageItems[0]} onSelect={selectItem} />}
            <div className="octane-cfp-list">
                {frontPageItems.slice(1).map((item, index) => (
                    <CatalogLayoutFrontPageItemView key={`${item.itemName}-${index}`} item={item} onSelect={selectItem} />
                ))}
            </div>
            <CatalogRedeemVoucherView text={page.localization.getText(1)} />
        </div>
    );
};
