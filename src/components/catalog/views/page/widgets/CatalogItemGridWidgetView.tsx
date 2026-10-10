import { InfiniteGrid } from '@layout/InfiniteGrid';
import { CSSProperties, FC, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IPurchasableOffer, Offer } from '../../../../../api';
import { AutoGrid, AutoGridProps, ClassicScrollAreaView } from '../../../../../common';
import { useCatalogActions, useCatalogData, useScrollWindow } from '../../../../../hooks';
import { CatalogGridOfferView } from '../common/CatalogGridOfferView';
import { getAirCatalogColumnCount, getVisibleAirGridEntries, isAirBaseCatalogOffer, layoutAirCatalogOffers } from '../common/catalogAirGrid.helpers';
import { shouldVirtualizeCatalogOffers } from './catalogGridPerformance.helpers';

interface CatalogItemGridWidgetViewProps extends AutoGridProps {
    tintColor?: string;
    showPrices?: boolean;
    /** Replaces the page's offers, e.g. one tile per colour family. */
    offers?: IPurchasableOffer[];
    isOfferActive?: (offer: IPurchasableOffer) => boolean;
}

export const CatalogItemGridWidgetView: FC<CatalogItemGridWidgetViewProps> = (props) => {
    const {
        columnCount = 5,
        columnMinHeight = 80,
        columnMinWidth = 40,
        tintColor = null,
        showPrices = true,
        children = null,
        className = '',
        style = {},
        offers: offersOverride = null,
        isOfferActive = null,
        ...rest
    } = props;
    const { currentOffer = null, currentPage = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();
    const elementRef = useRef<HTMLDivElement>(null);
    const [airColumnCount, setAirColumnCount] = useState(columnCount);
    const baseGridClassName = columnCount > 1 && !className.split(/\s+/).includes('volt-catalog-grid') ? `${className} volt-catalog-grid`.trim() : className;
    const isAirStandardDensity = className.split(/\s+/).includes('volt-catalog-grid-density-standard');

    const offers = offersOverride ?? currentPage?.offers ?? [];
    const hasAirBaseOffer = offers.some((offer) => isAirBaseCatalogOffer(offer));
    const hasAirPricedOffer = offers.some((offer) => !isAirBaseCatalogOffer(offer));
    const usesAirMixedGridTemplate = isAirStandardDensity && hasAirBaseOffer && hasAirPricedOffer;
    const usesAirBaseGridTemplate = isAirStandardDensity && offers.length > 0 && hasAirBaseOffer && !hasAirPricedOffer;
    const effectiveColumnMinHeight = usesAirBaseGridTemplate ? 36 : columnMinHeight;
    const effectiveColumnMinWidth = usesAirBaseGridTemplate ? 36 : columnMinWidth;
    const gridClassName =
        `${baseGridClassName} ${usesAirBaseGridTemplate ? 'uses-base-grid-template' : ''} ${usesAirMixedGridTemplate ? 'uses-mixed-grid-template' : ''}`.trim();
    const useVirtualGrid = shouldVirtualizeCatalogOffers(offers.length) && !usesAirMixedGridTemplate;
    const airGridStyle = {
        ...style,
        ...(isAirStandardDensity && { '--volt-air-column-count': airColumnCount.toString() })
    } as CSSProperties;
    const mixedLayout = useMemo(() => layoutAirCatalogOffers(offers, airColumnCount), [airColumnCount, offers]);
    const bundleCounterByOffer = useMemo(() => {
        const counters = new Map<IPurchasableOffer, number>();
        let bundleCounter = 0;

        for (const pageOffer of offers) {
            if (pageOffer.pricingModel !== Offer.PRICING_MODEL_BUNDLE) continue;

            bundleCounter += 1;
            counters.set(pageOffer, bundleCounter);
        }

        return counters;
    }, [offers]);

    useLayoutEffect(() => {
        if (elementRef.current) {
            elementRef.current.scrollLeft = 0;
            elementRef.current.scrollTop = 0;
        }
    }, [currentPage]);

    const scrollWindow = useScrollWindow(elementRef, usesAirMixedGridTemplate, currentPage);
    const clampedScrollTop = Math.min(scrollWindow.scrollTop, Math.max(0, mixedLayout.height - scrollWindow.viewportHeight));
    const visibleMixedEntries = useMemo(
        () => getVisibleAirGridEntries(mixedLayout.entries, clampedScrollTop, scrollWindow.viewportHeight),
        [mixedLayout, clampedScrollTop, scrollWindow.viewportHeight]
    );

    useLayoutEffect(() => {
        if (!isAirStandardDensity || !offers.length) {
            setAirColumnCount(columnCount);
            return;
        }

        const element = elementRef.current;
        if (!element) return;

        const recompute = () => {
            const computedStyle = window.getComputedStyle(element);
            const parsedLeft = Number.parseFloat(computedStyle.paddingLeft);
            const parsedRight = Number.parseFloat(computedStyle.paddingRight);
            const horizontalPadding = (Number.isFinite(parsedLeft) ? parsedLeft : 0) + (Number.isFinite(parsedRight) ? parsedRight : 0);
            const availableWidth = element.clientWidth - horizontalPadding;

            if (availableWidth <= 0) return;

            setAirColumnCount(getAirCatalogColumnCount(offers, availableWidth));
        };

        recompute();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(recompute);
        observer.observe(element);

        return () => observer.disconnect();
    }, [columnCount, isAirStandardDensity, offers]);

    if (!currentPage) return null;

    const selectOffer = (offer: IPurchasableOffer) => {
        selectCatalogOffer(offer);
    };

    const renderOfferTile = (offer: IPurchasableOffer, index: number, airPosition: { x: number; y: number; width: number; height: number } | null = null) => {
        return (
            <div
                key={offer.offerId}
                data-air-offer-index={airPosition ? index : undefined}
                style={
                    airPosition
                        ? { position: 'absolute', left: airPosition.x, top: airPosition.y, width: airPosition.width, height: airPosition.height }
                        : undefined
                }
            >
                <CatalogGridOfferView
                    bundleCounter={bundleCounterByOffer.get(offer) ?? 0}
                    itemActive={isOfferActive ? isOfferActive(offer) : currentOffer && currentOffer.offerId === offer.offerId}
                    offer={offer}
                    selectOffer={selectOffer}
                    tintColor={tintColor}
                    showPrices={showPrices}
                />
            </div>
        );
    };

    if (usesAirMixedGridTemplate) {
        return (
            <ClassicScrollAreaView className="volt-catalog-item-grid-scroll-area h-full min-h-0" viewportRef={elementRef}>
                <div
                    aria-label="Catalog items"
                    className={`volt-catalog-air-mixed-grid ${gridClassName}`}
                    role="listbox"
                    style={{ ...airGridStyle, width: mixedLayout.width, minWidth: '100%', height: mixedLayout.height }}
                >
                    {visibleMixedEntries.map(({ offer, index, ...position }) => renderOfferTile(offer, index, position))}
                    {children}
                </div>
            </ClassicScrollAreaView>
        );
    }

    if (useVirtualGrid) {
        return (
            <div
                aria-label="Catalog items"
                className={`volt-catalog-grid-virtual h-full min-h-0 ${gridClassName}`.trim()}
                role="listbox"
                style={
                    {
                        '--volt-grid-column-min-height': `${effectiveColumnMinHeight}px`,
                        '--volt-grid-column-min-width': `${effectiveColumnMinWidth}px`,
                        ...airGridStyle
                    } as CSSProperties
                }
            >
                <InfiniteGrid
                    classicScrollbar
                    airColumnAdmission={isAirStandardDensity}
                    columnGap={3}
                    columnCount={columnCount}
                    estimateSize={effectiveColumnMinHeight}
                    itemMinWidth={effectiveColumnMinWidth}
                    items={offers}
                    overscan={4}
                    rowGap={isAirStandardDensity ? 0 : 3}
                    onColumnCountChange={isAirStandardDensity ? setAirColumnCount : undefined}
                    itemRender={(offer, index) => (offer ? renderOfferTile(offer, index) : <></>)}
                />
                {children}
            </div>
        );
    }

    return (
        <ClassicScrollAreaView className="volt-catalog-item-grid-scroll-area h-full min-h-0" viewportRef={elementRef}>
            <AutoGrid
                aria-label="Catalog items"
                className={gridClassName}
                columnCount={columnCount}
                columnMinHeight={effectiveColumnMinHeight}
                columnMinWidth={effectiveColumnMinWidth}
                fullHeight={false}
                overflow="visible"
                role="listbox"
                style={airGridStyle}
                {...rest}
            >
                {offers.length > 0 && offers.map((offer, index) => renderOfferTile(offer, index))}
                {children}
            </AutoGrid>
        </ClassicScrollAreaView>
    );
};
