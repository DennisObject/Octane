import { FC } from 'react';
import { SanitizeHtml } from '../../../../../api';
import { useCatalogData } from '../../../../../hooks';
import { CatalogBadgeSelectorWidgetView } from '../widgets/CatalogBadgeSelectorWidgetView';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutBadgeDisplayView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const isBundleOffer = currentOffer?.pricingModel === 'pricing_model_bundle';

    return (
        <div className="volt-catalog-badge-display-layout">
            <CatalogFirstProductSelectorWidgetView />
            <section className={`volt-catalog-badge-preview ${currentOffer ? '' : 'is-empty'} ${isBundleOffer ? 'is-bundle' : ''}`.trim()}>
                {!currentOffer && (
                    <div className="volt-catalog-badge-intro">
                        {!!page.localization.getImage(1) && <img alt="" src={page.localization.getImage(1)} />}
                        <span dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(0)) }} />
                    </div>
                )}
                {currentOffer && (
                    <>
                        <div className="volt-catalog-badge-product-render">
                            <CatalogViewProductWidgetView height={240} />
                        </div>
                        <div className="volt-catalog-badge-product-copy volt-catalog-preview-details">
                            <CatalogProductDetailsView offer={currentOffer} />
                        </div>
                        {!isBundleOffer && <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />}
                        <div className="volt-catalog-badge-limited">
                            <CatalogLimitedItemWidgetView />
                        </div>
                        <div className="volt-catalog-badge-total-price volt-catalog-preview-price volt-catalog-price-frame">
                            <CatalogTotalPriceWidget alignItems="end" />
                        </div>
                    </>
                )}
            </section>

            <section className="volt-catalog-badge-product-picker">
                <CatalogItemGridWidgetView className="volt-catalog-badge-offer-list" columnCount={1} columnMinHeight={70} columnMinWidth={70} />
            </section>

            <section className="volt-catalog-badge-picker">
                <CatalogBadgeSelectorWidgetView />
            </section>

            <div className="volt-catalog-badge-purchase">{currentOffer && <CatalogPurchaseWidgetView />}</div>
        </div>
    );
};
